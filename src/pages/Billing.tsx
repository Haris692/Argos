import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileDown, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatAmount, formatMinutes } from '@/lib/billing'
import { computeBillingSummary, type BillingSummaryComputation } from '@/lib/billingSummary'
import { formatMonth, monthRange } from '@/lib/months'
import type { BillingSummaryRow, Client, Ticket, TimeEntry } from '@/types'
import { BILLING_SUMMARY_STATUS_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
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

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function Billing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [entries, setEntries] = useState<Array<TimeEntry & { tickets: Ticket }>>([])
  const [reportSent, setReportSent] = useState(false)
  const [saved, setSaved] = useState<BillingSummaryRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const clientId = searchParams.get('client') ?? ''
  const month = searchParams.get('month') ?? currentMonth()
  const client = clients.find((c) => c.id === clientId) ?? null

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    next.set(key, value)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    void supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        const list = (data ?? []) as Client[]
        setClients(list)
        if (!searchParams.get('client') && list[0]) setParam('client', list[0].id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async () => {
    if (!clientId || !month) return
    setLoading(true)
    const { start, end } = monthRange(month)
    const [entriesRes, reportRes, savedRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*, tickets!inner(*)')
        .eq('tickets.client_id', clientId)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('monthly_reports')
        .select('sent_at')
        .eq('client_id', clientId)
        .eq('month', month)
        .maybeSingle(),
      supabase
        .from('billing_summaries')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', month)
        .maybeSingle(),
    ])
    if (entriesRes.error) {
      toast.error(`Erreur : ${entriesRes.error.message}`)
      setLoading(false)
      return
    }
    setEntries((entriesRes.data ?? []) as Array<TimeEntry & { tickets: Ticket }>)
    setReportSent(Boolean(reportRes.data?.sent_at))
    setSaved(savedRes.data as BillingSummaryRow | null)
    setLoading(false)
  }, [clientId, month])

  useEffect(() => {
    void load()
  }, [load])

  const summary: BillingSummaryComputation | null = useMemo(() => {
    if (!client) return null
    const byTicket = new Map<string, { ticket: Ticket; entries: TimeEntry[] }>()
    for (const e of entries) {
      const existing = byTicket.get(e.ticket_id)
      if (existing) existing.entries.push(e)
      else byTicket.set(e.ticket_id, { ticket: e.tickets, entries: [e] })
    }
    return computeBillingSummary(
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
      reportSent,
    )
  }, [client, entries, reportSent])

  async function persist(extra: Partial<BillingSummaryRow> = {}): Promise<boolean> {
    if (!summary || !client) return false
    setBusy(true)
    const { error } = await supabase.from('billing_summaries').upsert(
      {
        client_id: client.id,
        month,
        subscription_amount: summary.subscriptionAmount,
        billable_minutes: summary.billableMinutes,
        billable_amount: summary.billableAmount,
        after_hours_minutes: summary.afterHoursMinutes,
        after_hours_amount: summary.afterHoursAmount,
        total_amount: summary.totalAmount,
        lines: summary.lines,
        status: saved?.status ?? 'brouillon',
        ...extra,
      },
      { onConflict: 'client_id,month' },
    )
    setBusy(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return false
    }
    void load()
    return true
  }

  async function handleValidate() {
    if (await persist({ status: 'valide' })) toast.success('Bon à facturer validé')
  }

  async function handleExportCsv() {
    if (!summary || !client) return
    const { exportSummaryCsv } = await import('@/lib/summaryExports')
    exportSummaryCsv(summary, client, month)
    await persist({ exported_at: new Date().toISOString() })
  }

  async function handleExportPdf() {
    if (!summary || !client) return
    const { exportSummaryPdf } = await import('@/lib/summaryExports')
    exportSummaryPdf(summary, client, month)
    await persist({ exported_at: new Date().toISOString() })
  }

  async function handleMarkInvoiced() {
    if (await persist({ status: 'facture_externe' }))
      toast.success('Marqué comme facturé dans l\'outil externe')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-xl font-semibold">Bon à facturer</h1>
        {saved && (
          <Badge variant={saved.status === 'facture_externe' ? 'default' : 'secondary'}>
            {BILLING_SUMMARY_STATUS_LABELS[saved.status]}
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Récapitulatif mensuel à ressaisir dans l'outil de facturation conforme — Argos ne génère
        pas de factures.
      </p>

      <div className="flex flex-wrap gap-2">
        <Select value={clientId} onValueChange={(v) => setParam('client', v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Client…" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={month}
          onChange={(e) => setParam('month', e.target.value)}
          className="w-44"
          aria-label="Mois"
        />
      </div>

      {loading || !summary || !client ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {client.name} — {formatMonth(month)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.subscriptionBlockedByMissingReport && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
                Abonnement non facturable : le rapport mensuel n'a pas été envoyé.{' '}
                <Link to={`/rapports/${client.id}/${month}`} className="font-medium underline">
                  Générer et envoyer le rapport
                </Link>
              </div>
            )}

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Réel</TableHead>
                    <TableHead className="text-right">Facturé</TableHead>
                    <TableHead className="text-right">Montant HT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.subscriptionAmount > 0 && (
                    <TableRow>
                      <TableCell className="font-medium">Abonnement supervision mensuelle</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right">
                        {formatAmount(summary.subscriptionAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                  {summary.lines.map((line) => (
                    <TableRow key={line.reference}>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">
                          {line.reference}
                        </span>{' '}
                        {line.title}
                        {!line.billable && (
                          <Badge variant="outline" className="ml-2">
                            Non facturable
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatMinutes(line.realMinutes)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMinutes(line.billedMinutes)}
                        {line.afterHoursMinutes > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            (dont {formatMinutes(line.afterHoursMinutes)} HO)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatAmount(line.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {summary.lines.length === 0 && summary.subscriptionAmount === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Rien à facturer sur ce mois.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {formatMinutes(summary.billableMinutes)} facturées
                {summary.afterHoursMinutes > 0 &&
                  ` · dont ${formatMinutes(summary.afterHoursMinutes)} hors horaires (${formatAmount(summary.afterHoursAmount)})`}
              </span>
              <span className="figure text-2xl font-semibold text-primary">
                {formatAmount(summary.totalAmount)} HT
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleValidate()} disabled={busy}>
                Valider
              </Button>
              <Button variant="outline" onClick={() => void handleExportCsv()} disabled={busy}>
                <FileSpreadsheet className="size-4" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={() => void handleExportPdf()} disabled={busy}>
                <FileDown className="size-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleMarkInvoiced()}
                disabled={busy || saved?.status === 'facture_externe'}
              >
                <CheckCircle2 className="size-4" />
                Marquer comme facturé
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
