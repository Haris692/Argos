import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatAmount, formatMinutes } from '@/lib/billing'
import { computeBillingSummary } from '@/lib/billingSummary'
import type { Client, Ticket, TimeEntry } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ClientStats {
  client: Client
  realMinutes: number
  billedMinutes: number
  timeAmount: number
  subscriptionAmount: number
  /** billed revenue per real hour actually worked — the truth about the rate */
  effectiveHourlyRate: number | null
}

export function Stats() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<Array<TimeEntry & { tickets: Ticket }>>([])
  const [sentReports, setSentReports] = useState<Array<{ client_id: string; month: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const start = `${year}-01-01`
      const end = `${year}-12-31`
      const [clientsRes, entriesRes, reportsRes] = await Promise.all([
        supabase.from('clients').select('*').is('archived_at', null).order('name'),
        supabase
          .from('time_entries')
          .select('*, tickets!inner(*)')
          .gte('date', start)
          .lte('date', end),
        supabase
          .from('monthly_reports')
          .select('client_id, month')
          .not('sent_at', 'is', null)
          .gte('month', `${year}-01`)
          .lte('month', `${year}-12`),
      ])
      setClients((clientsRes.data ?? []) as Client[])
      setEntries((entriesRes.data ?? []) as Array<TimeEntry & { tickets: Ticket }>)
      setSentReports((reportsRes.data ?? []) as Array<{ client_id: string; month: string }>)
      setLoading(false)
    }
    void load()
  }, [year])

  const stats: ClientStats[] = useMemo(() => {
    return clients.map((client) => {
      const clientEntries = entries.filter((e) => e.tickets.client_id === client.id)
      const realMinutes = clientEntries.reduce((sum, e) => sum + e.duration_minutes, 0)

      // Billing rules apply per ticket per day within each month:
      // aggregate month by month, exactly like the monthly summaries do.
      const months = [...new Set(clientEntries.map((e) => e.date.slice(0, 7)))]
      let billedMinutes = 0
      let timeAmount = 0
      for (const month of months) {
        const monthEntries = clientEntries.filter((e) => e.date.startsWith(month))
        const byTicket = new Map<string, { ticket: Ticket; entries: TimeEntry[] }>()
        for (const e of monthEntries) {
          const existing = byTicket.get(e.ticket_id)
          if (existing) existing.entries.push(e)
          else byTicket.set(e.ticket_id, { ticket: e.tickets, entries: [e] })
        }
        const summary = computeBillingSummary(
          {
            hourlyRate: client.hourly_rate,
            afterHoursMultiplier: client.after_hours_multiplier,
            minimumMinutes: client.billing_minimum_minutes,
            incrementMinutes: client.billing_increment_minutes,
            subscriptionActive: false, // time only here; subscription counted below
            subscriptionPrice: 0,
          },
          [...byTicket.values()].map(({ ticket, entries: te }) => ({
            reference: ticket.reference,
            title: ticket.title,
            billable: ticket.billable,
            entries: te.map((e) => ({
              date: e.date,
              durationMinutes: e.duration_minutes,
              afterHours: e.after_hours,
            })),
          })),
          false,
        )
        billedMinutes += summary.billableMinutes
        timeAmount += summary.billableAmount
      }

      const reportsSent = sentReports.filter((r) => r.client_id === client.id).length
      const subscriptionAmount = client.subscription_active
        ? reportsSent * client.subscription_price
        : 0

      return {
        client,
        realMinutes,
        billedMinutes,
        timeAmount,
        subscriptionAmount,
        effectiveHourlyRate: realMinutes > 0 ? (timeAmount / realMinutes) * 60 : null,
      }
    })
  }, [clients, entries, sentReports])

  const totals = stats.reduce(
    (acc, s) => ({
      realMinutes: acc.realMinutes + s.realMinutes,
      timeAmount: acc.timeAmount + s.timeAmount,
      subscriptionAmount: acc.subscriptionAmount + s.subscriptionAmount,
    }),
    { realMinutes: 0, timeAmount: 0, subscriptionAmount: 0 },
  )

  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Statistiques</h1>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Temps travaillé {year}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMinutes(totals.realMinutes)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Temps facturé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatAmount(totals.timeAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Abonnements (rapports envoyés)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatAmount(totals.subscriptionAmount)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Temps réel</TableHead>
                  <TableHead className="text-right">Temps facturé</TableHead>
                  <TableHead className="text-right">Montant temps</TableHead>
                  <TableHead className="text-right">Abonnements</TableHead>
                  <TableHead className="text-right">Taux horaire effectif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.client.id}>
                    <TableCell className="font-medium">{s.client.name}</TableCell>
                    <TableCell className="text-right">{formatMinutes(s.realMinutes)}</TableCell>
                    <TableCell className="text-right">{formatMinutes(s.billedMinutes)}</TableCell>
                    <TableCell className="text-right">{formatAmount(s.timeAmount)}</TableCell>
                    <TableCell className="text-right">{formatAmount(s.subscriptionAmount)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {s.effectiveHourlyRate != null ? (
                        `${formatAmount(s.effectiveHourlyRate)}/h`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Taux horaire effectif = montant facturé au temps passé ÷ heures réellement
            travaillées. Grâce au minimum et aux arrondis, il est normalement supérieur au taux
            nominal.
          </p>
        </>
      )}
    </div>
  )
}
