import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatAmount, formatMinutes } from '@/lib/billing'
import { computeBillingSummary } from '@/lib/billingSummary'
import { formatMonth, monthRange } from '@/lib/months'
import type { Client, Ticket, TimeEntry } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface ClientMonthSummary {
  client: Client
  billedMinutes: number
  subscriptionAmount: number
  reportMissing: boolean
  totalAmount: number
  openTickets: number
}

export function Dashboard() {
  const [rows, setRows] = useState<ClientMonthSummary[] | null>(null)
  const month = currentMonth()

  useEffect(() => {
    async function load() {
      const { start, end } = monthRange(month)
      const [clientsRes, entriesRes, reportsRes, openTicketsRes] = await Promise.all([
        supabase.from('clients').select('*').is('archived_at', null).order('name'),
        supabase
          .from('time_entries')
          .select('*, tickets!inner(*)')
          .gte('date', start)
          .lte('date', end),
        supabase.from('monthly_reports').select('client_id, sent_at').eq('month', month),
        supabase
          .from('tickets')
          .select('id, client_id')
          .not('status', 'in', '("resolu","ferme")'),
      ])
      const clients = (clientsRes.data ?? []) as Client[]
      const entries = (entriesRes.data ?? []) as Array<TimeEntry & { tickets: Ticket }>
      const sentByClient = new Set(
        ((reportsRes.data ?? []) as Array<{ client_id: string; sent_at: string | null }>)
          .filter((r) => r.sent_at)
          .map((r) => r.client_id),
      )
      const openByClient = new Map<string, number>()
      for (const t of (openTicketsRes.data ?? []) as Array<{ client_id: string }>) {
        openByClient.set(t.client_id, (openByClient.get(t.client_id) ?? 0) + 1)
      }

      setRows(
        clients.map((client) => {
          const byTicket = new Map<string, { ticket: Ticket; entries: TimeEntry[] }>()
          for (const e of entries.filter((e) => e.tickets.client_id === client.id)) {
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
              subscriptionActive: client.subscription_active,
              subscriptionPrice: client.subscription_price,
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
            sentByClient.has(client.id),
          )
          return {
            client,
            billedMinutes: summary.billableMinutes,
            subscriptionAmount: summary.subscriptionAmount,
            reportMissing: summary.subscriptionBlockedByMissingReport,
            totalAmount: summary.totalAmount,
            openTickets: openByClient.get(client.id) ?? 0,
          }
        }),
      )
    }
    void load()
  }, [month])

  const grandTotal = rows?.reduce((sum, r) => sum + r.totalAmount, 0) ?? 0
  const potentialTotal =
    rows?.reduce(
      (sum, r) => sum + r.totalAmount + (r.reportMissing ? r.client.subscription_price : 0),
      0,
    ) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">Tableau de bord — {formatMonth(month)}</h1>
      </div>

      {rows === null ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  À facturer ce mois (en l'état)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="figure text-3xl font-semibold text-primary">
                  {formatAmount(grandTotal)}
                </p>
                {potentialTotal > grandTotal && (
                  <p className="text-sm text-muted-foreground">
                    <span className="figure">{formatAmount(potentialTotal)}</span> une fois les
                    rapports envoyés
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tickets ouverts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="figure text-3xl font-semibold">
                  {rows.reduce((sum, r) => sum + r.openTickets, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Tickets ouverts</TableHead>
                  <TableHead className="text-right">Temps facturé</TableHead>
                  <TableHead className="text-right">Abonnement</TableHead>
                  <TableHead className="text-right">À facturer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.client.id}>
                    <TableCell>
                      <Link
                        to={`/facturation?client=${r.client.id}&month=${month}`}
                        className="font-medium hover:underline"
                      >
                        {r.client.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.openTickets > 0 ? (
                        <Link
                          to={`/tickets?client=${r.client.id}`}
                          className="hover:underline"
                        >
                          {r.openTickets}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.billedMinutes > 0 ? (
                        formatMinutes(r.billedMinutes)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.reportMissing ? (
                        <Link to={`/rapports/${r.client.id}/${month}`}>
                          <Badge variant="destructive">Rapport à envoyer</Badge>
                        </Link>
                      ) : r.subscriptionAmount > 0 ? (
                        formatAmount(r.subscriptionAmount)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="figure text-right font-semibold">
                      {formatAmount(r.totalAmount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Montants HT calculés en temps réel (minimum et arrondis appliqués). L'abonnement ne
            compte que si le rapport mensuel du client a été envoyé. Clique un client pour le
            détail ligne par ligne.
          </p>
        </>
      )}
    </div>
  )
}
