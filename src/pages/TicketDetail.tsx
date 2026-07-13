import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Moon, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { computeTicketBilling, formatAmount, formatMinutes } from '@/lib/billing'
import type { Client, Contact, Ticket, TicketStatus, TimeEntry } from '@/types'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TicketFormDialog } from '@/components/forms/TicketFormDialog'
import { TimeEntryQuickAdd } from '@/components/TimeEntryQuickAdd'
import { TicketTimer } from '@/components/TicketTimer'

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  // Resolution dialog state (required to move to resolu/ferme)
  const [resolutionDialog, setResolutionDialog] = useState<{ open: boolean; target: TicketStatus | null }>({ open: false, target: null })
  const [resolutionText, setResolutionText] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const { data: t, error } = await supabase.from('tickets').select('*').eq('id', id).single()
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      setLoading(false)
      return
    }
    const ticketData = t as Ticket
    const [clientRes, entriesRes, clientsRes, contactRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', ticketData.client_id).single(),
      supabase
        .from('time_entries')
        .select('*')
        .eq('ticket_id', id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('clients').select('*').is('archived_at', null).order('name'),
      ticketData.contact_id
        ? supabase.from('contacts').select('*').eq('id', ticketData.contact_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])
    setTicket(ticketData)
    setClient(clientRes.data as Client)
    setEntries((entriesRes.data ?? []) as TimeEntry[])
    setClients((clientsRes.data ?? []) as Client[])
    setContact(contactRes.data as Contact | null)
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const billing = useMemo(() => {
    if (!ticket || !client) return null
    return computeTicketBilling(
      entries.map((e) => ({
        date: e.date,
        durationMinutes: e.duration_minutes,
        afterHours: e.after_hours,
      })),
      {
        hourlyRate: client.hourly_rate,
        afterHoursMultiplier: client.after_hours_multiplier,
        minimumMinutes: client.billing_minimum_minutes,
        incrementMinutes: client.billing_increment_minutes,
      },
      ticket.billable,
    )
  }, [ticket, client, entries])

  async function changeStatus(status: TicketStatus) {
    if (!ticket) return
    // resolution is mandatory to resolve or close (DB constraint backs this up)
    if ((status === 'resolu' || status === 'ferme') && !ticket.resolution) {
      setResolutionText('')
      setResolutionDialog({ open: true, target: status })
      return
    }
    await applyStatus(status, ticket.resolution)
  }

  async function applyStatus(status: TicketStatus, resolution: string | null) {
    if (!ticket) return
    const payload: Record<string, unknown> = { status, resolution }
    payload.resolved_at =
      status === 'resolu' || status === 'ferme' ? (ticket.resolved_at ?? new Date().toISOString()) : null
    payload.closed_at = status === 'ferme' ? new Date().toISOString() : null
    const { error } = await supabase.from('tickets').update(payload).eq('id', ticket.id)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(`Statut : ${TICKET_STATUS_LABELS[status]}`)
    void load()
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Supprimer cette saisie ?')) return
    const { error } = await supabase.from('time_entries').delete().eq('id', entryId)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    void load()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!ticket || !client) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Ticket introuvable.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tickets" title="Retour aux tickets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span className="font-mono text-xs text-muted-foreground">{ticket.reference}</span>
        <h1 className="text-xl font-semibold">{ticket.title}</h1>
        <div className="flex-1" />
        <TicketTimer ticketId={ticket.id} onSaved={load} />
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          Modifier
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link to={`/clients/${client.id}`} className="font-medium hover:underline">
          {client.name}
        </Link>
        {contact && (
          <span className="text-muted-foreground">
            · {contact.first_name} {contact.last_name}
          </span>
        )}
        <Badge variant="secondary">{TICKET_CATEGORY_LABELS[ticket.category]}</Badge>
        <Badge variant={ticket.priority === 'bloquant' ? 'destructive' : 'secondary'}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </Badge>
        {!ticket.billable && <Badge variant="outline">Non facturable</Badge>}
        <Select value={ticket.status} onValueChange={(v) => void changeStatus(v as TicketStatus)}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ticket.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{ticket.description}</p>
      )}
      {ticket.resolution && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm">
          <p className="font-medium">Résolution</p>
          <p className="whitespace-pre-wrap text-muted-foreground">{ticket.resolution}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-medium">Saisie de temps</h2>
          <TimeEntryQuickAdd ticketId={ticket.id} onSaved={load} />

          {entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune saisie.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">
                    {new Date(`${e.date}T00:00:00`).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="w-16 shrink-0 font-medium">{formatMinutes(e.duration_minutes)}</span>
                  {e.after_hours && (
                    <span title="Hors horaires">
                      <Moon className="size-3.5 shrink-0 text-muted-foreground" />
                    </span>
                  )}
                  <span className="flex-1 truncate text-muted-foreground">
                    {e.description ?? (e.start_time ? `Début ${e.start_time.slice(0, 5)}` : '')}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => void deleteEntry(e.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Facturable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {billing && (
              <>
                {!ticket.billable ? (
                  <p className="text-muted-foreground">
                    Ticket non facturable — {formatMinutes(billing.realMinutes)} de temps réel suivi, 0 €.
                  </p>
                ) : billing.days.length === 0 ? (
                  <p className="text-muted-foreground">Aucun temps saisi.</p>
                ) : (
                  <>
                    {billing.days.map((d) => (
                      <div key={d.date} className="rounded-md border p-2">
                        <p className="font-medium">
                          {new Date(`${d.date}T00:00:00`).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-muted-foreground">
                          {formatMinutes(d.realMinutes)} réelles, {formatMinutes(d.billedMinutes)}{' '}
                          facturées
                          {d.minimumApplied && ' (minimum appliqué)'}
                          {d.roundingApplied && ' (arrondi à la tranche)'}
                        </p>
                        {d.afterHoursBilledMinutes > 0 && (
                          <p className="text-muted-foreground">
                            dont {formatMinutes(d.afterHoursBilledMinutes)} hors horaires (×
                            {client.after_hours_multiplier})
                          </p>
                        )}
                        <p className="text-right font-medium">{formatAmount(d.amount)}</p>
                      </div>
                    ))}
                    <div className="flex items-baseline justify-between border-t pt-2">
                      <span className="text-muted-foreground">
                        {formatMinutes(billing.realMinutes)} réelles →{' '}
                        {formatMinutes(billing.billedMinutes)} facturées
                      </span>
                      <span className="text-lg font-bold">{formatAmount(billing.amount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taux : {client.hourly_rate} € HT/h · min {client.billing_minimum_minutes} min ·
                      tranche {client.billing_increment_minutes} min
                    </p>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <TicketFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={ticket}
        clients={clients}
        onSaved={() => void load()}
      />

      <Dialog
        open={resolutionDialog.open}
        onOpenChange={(open) => setResolutionDialog((s) => ({ ...s, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Résolution obligatoire</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resolution">Comment le ticket a-t-il été résolu ?</Label>
            <Textarea
              id="resolution"
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionDialog({ open: false, target: null })}>
              Annuler
            </Button>
            <Button
              disabled={!resolutionText.trim()}
              onClick={() => {
                if (resolutionDialog.target) {
                  void applyStatus(resolutionDialog.target, resolutionText.trim())
                }
                setResolutionDialog({ open: false, target: null })
              }}
            >
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
