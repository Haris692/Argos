import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, FileDown, Send } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatMinutes } from '@/lib/billing'
import { formatMonth, monthRange } from '@/lib/months'
import type { TicketActivity } from '@/lib/reportPdf'
import type { Client, MonthlyReport, Ticket, TimeEntry } from '@/types'
import { TICKET_CATEGORY_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FormState {
  defender_alerts_reviewed: string
  defender_alerts_resolved: string
  devices_compliant: string
  devices_total: string
  updates_status: string
  accounts_reviewed: string
  recommendations: string
}

export function ReportEditor() {
  const { clientId, month } = useParams<{ clientId: string; month: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [activity, setActivity] = useState<TicketActivity[]>([])
  const [form, setForm] = useState<FormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!clientId || !month) return
    const { start, end } = monthRange(month)
    const [clientRes, reportRes, activityRes, devicesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase
        .from('monthly_reports')
        .select('*')
        .eq('client_id', clientId)
        .eq('month', month)
        .maybeSingle(),
      supabase
        .from('time_entries')
        .select('*, tickets!inner(*)')
        .eq('tickets.client_id', clientId)
        .gte('date', start)
        .lte('date', end),
      supabase
        .from('devices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'active'),
    ])
    if (clientRes.error) {
      toast.error(`Erreur : ${clientRes.error.message}`)
      setLoading(false)
      return
    }
    setClient(clientRes.data as Client)

    // Aggregate the month's time entries by ticket
    const byTicket = new Map<string, TicketActivity>()
    for (const row of (activityRes.data ?? []) as Array<TimeEntry & { tickets: Ticket }>) {
      const existing = byTicket.get(row.ticket_id)
      if (existing) existing.realMinutes += row.duration_minutes
      else byTicket.set(row.ticket_id, { ticket: row.tickets, realMinutes: row.duration_minutes })
    }
    setActivity([...byTicket.values()].sort((a, b) => b.realMinutes - a.realMinutes))

    const existing = reportRes.data as MonthlyReport | null
    setReport(existing)
    setForm({
      defender_alerts_reviewed: existing?.defender_alerts_reviewed?.toString() ?? '',
      defender_alerts_resolved: existing?.defender_alerts_resolved?.toString() ?? '',
      devices_compliant: existing?.devices_compliant?.toString() ?? '',
      devices_total:
        existing?.devices_total?.toString() ?? (devicesRes.count != null ? String(devicesRes.count) : ''),
      updates_status: existing?.updates_status ?? '',
      accounts_reviewed: existing?.accounts_reviewed ?? '',
      recommendations: existing?.recommendations ?? '',
    })
    setLoading(false)
  }, [clientId, month])

  useEffect(() => {
    void load()
  }, [load])

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  async function save(extra: Partial<MonthlyReport> = {}): Promise<MonthlyReport | null> {
    if (!form || !clientId || !month) return null
    setSaving(true)
    const payload = {
      client_id: clientId,
      month,
      defender_alerts_reviewed: form.defender_alerts_reviewed === '' ? null : Number(form.defender_alerts_reviewed),
      defender_alerts_resolved: form.defender_alerts_resolved === '' ? null : Number(form.defender_alerts_resolved),
      devices_compliant: form.devices_compliant === '' ? null : Number(form.devices_compliant),
      devices_total: form.devices_total === '' ? null : Number(form.devices_total),
      updates_status: form.updates_status.trim() || null,
      accounts_reviewed: form.accounts_reviewed.trim() || null,
      recommendations: form.recommendations.trim() || null,
      ...extra,
    }
    const { data, error } = await supabase
      .from('monthly_reports')
      .upsert(payload, { onConflict: 'client_id,month' })
      .select('*')
      .single()
    setSaving(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return null
    }
    const saved = data as MonthlyReport
    setReport(saved)
    return saved
  }

  async function handleSave() {
    const saved = await save()
    if (saved) toast.success('Rapport enregistré')
  }

  async function handleGeneratePdf() {
    if (!client) return
    const saved = await save({ generated_at: new Date().toISOString() })
    if (!saved) return
    // jsPDF is heavy: loaded on demand so it stays out of the main bundle
    const { generateMonthlyReportPdf } = await import('@/lib/reportPdf')
    generateMonthlyReportPdf(saved, client, activity)
    toast.success('PDF généré')
  }

  async function handleMarkSent() {
    const saved = await save({ sent_at: new Date().toISOString() })
    if (saved) toast.success('Rapport marqué comme envoyé — la ligne d\'abonnement est justifiée')
  }

  if (loading || !form) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!client || !month) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Rapport introuvable.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/rapports" title="Retour aux rapports">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          Rapport {formatMonth(month)} — {client.name}
        </h1>
        <div className="flex-1" />
        {report?.sent_at && (
          <span className="text-sm text-muted-foreground">
            Envoyé le {new Date(report.sent_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sécurité — Microsoft Defender</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alerts_reviewed">Alertes passées en revue</Label>
                <Input
                  id="alerts_reviewed"
                  type="number"
                  min="0"
                  value={form.defender_alerts_reviewed}
                  onChange={(e) => set('defender_alerts_reviewed', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alerts_resolved">Alertes traitées</Label>
                <Input
                  id="alerts_resolved"
                  type="number"
                  min="0"
                  value={form.defender_alerts_resolved}
                  onChange={(e) => set('defender_alerts_resolved', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conformité des postes — Intune</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="devices_compliant">Postes conformes</Label>
                  <Input
                    id="devices_compliant"
                    type="number"
                    min="0"
                    value={form.devices_compliant}
                    onChange={(e) => set('devices_compliant', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="devices_total">Postes au total</Label>
                  <Input
                    id="devices_total"
                    type="number"
                    min="0"
                    value={form.devices_total}
                    onChange={(e) => set('devices_total', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="updates_status">État des mises à jour</Label>
                <Textarea
                  id="updates_status"
                  placeholder="Tous les postes à jour au 30/06. Poste EURO-PC-02 redémarré pour finaliser…"
                  value={form.updates_status}
                  onChange={(e) => set('updates_status', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comptes et accès</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Revue des comptes : aucun compte inactif, MFA actif partout…"
                value={form.accounts_reviewed}
                onChange={(e) => set('accounts_reviewed', e.target.value)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommandations</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ce qui va bien, ce qui est à améliorer…"
                value={form.recommendations}
                onChange={(e) => set('recommendations', e.target.value)}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSave()} disabled={saving}>
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => void handleGeneratePdf()} disabled={saving}>
              <FileDown className="size-4" />
              Générer le PDF
            </Button>
            <Button variant="outline" onClick={() => void handleMarkSent()} disabled={saving}>
              <Send className="size-4" />
              Marquer comme envoyé
            </Button>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Interventions du mois</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {activity.length === 0 ? (
              <p className="text-muted-foreground">Aucune intervention sur la période.</p>
            ) : (
              <>
                {activity.map(({ ticket, realMinutes }) => (
                  <div key={ticket.id} className="rounded-md border p-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link to={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                        {ticket.title}
                      </Link>
                      <span className="shrink-0 text-muted-foreground">
                        {formatMinutes(realMinutes)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ticket.reference} · {TICKET_CATEGORY_LABELS[ticket.category]}
                    </p>
                  </div>
                ))}
                <p className="border-t pt-2 text-right font-medium">
                  Total :{' '}
                  {formatMinutes(activity.reduce((sum, a) => sum + a.realMinutes, 0))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Repris automatiquement dans le PDF (temps réel, pas le facturé).
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
