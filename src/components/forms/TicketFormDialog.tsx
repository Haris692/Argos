import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client, Contact, Ticket, TicketCategory, TicketPriority } from '@/types'
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket | null
  clients: Client[]
  defaultClientId?: string
  onSaved: (ticketId: string) => void
}

const NO_CONTACT = 'none'

const emptyForm = {
  client_id: '',
  contact_id: NO_CONTACT,
  title: '',
  description: '',
  category: 'support' as TicketCategory,
  priority: 'normal' as TicketPriority,
  billable: true,
}

export function TicketFormDialog({ open, onOpenChange, ticket, clients, defaultClientId, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      ticket
        ? {
            client_id: ticket.client_id,
            contact_id: ticket.contact_id ?? NO_CONTACT,
            title: ticket.title,
            description: ticket.description ?? '',
            category: ticket.category,
            priority: ticket.priority,
            billable: ticket.billable,
          }
        : { ...emptyForm, client_id: defaultClientId ?? clients[0]?.id ?? '' },
    )
  }, [open, ticket, defaultClientId, clients])

  // Requester list follows the selected client
  useEffect(() => {
    if (!open || !form.client_id) {
      setContacts([])
      return
    }
    void supabase
      .from('contacts')
      .select('*')
      .eq('client_id', form.client_id)
      .order('last_name')
      .then(({ data }) => setContacts((data ?? []) as Contact[]))
  }, [open, form.client_id])

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      client_id: form.client_id,
      contact_id: form.contact_id === NO_CONTACT ? null : form.contact_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      billable: form.billable,
    }
    const result = ticket
      ? await supabase.from('tickets').update(payload).eq('id', ticket.id).select('id').single()
      : await supabase.from('tickets').insert(payload).select('id').single()
    setSubmitting(false)
    if (result.error) {
      toast.error(`Erreur : ${result.error.message}`)
      return
    }
    toast.success(ticket ? 'Ticket mis à jour' : 'Ticket créé')
    onOpenChange(false)
    onSaved(result.data.id as string)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket ? `Modifier ${ticket.reference}` : 'Nouveau ticket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, contact_id: NO_CONTACT }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Demandeur</Label>
              <Select value={form.contact_id} onValueChange={(v) => set('contact_id', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONTACT}>—</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v as TicketCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v as TicketPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="billable">Facturable</Label>
            <Switch id="billable" checked={form.billable} onCheckedChange={(v) => set('billable', v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !form.client_id}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
