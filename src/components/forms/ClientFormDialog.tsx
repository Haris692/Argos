import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  client: Client | null // null = create
  onSaved: () => void
}

interface FormState {
  name: string
  siret: string
  address: string
  tenant_id: string
  tenant_domain: string
  subscription_active: boolean
  subscription_price: string
  hourly_rate: string
  after_hours_multiplier: string
  billing_minimum_minutes: string
  billing_increment_minutes: string
  notes: string
}

const emptyForm: FormState = {
  name: '',
  siret: '',
  address: '',
  tenant_id: '',
  tenant_domain: '',
  subscription_active: true,
  subscription_price: '39',
  hourly_rate: '30',
  after_hours_multiplier: '1.5',
  billing_minimum_minutes: '30',
  billing_increment_minutes: '15',
  notes: '',
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      client
        ? {
            name: client.name,
            siret: client.siret ?? '',
            address: client.address ?? '',
            tenant_id: client.tenant_id ?? '',
            tenant_domain: client.tenant_domain ?? '',
            subscription_active: client.subscription_active,
            subscription_price: String(client.subscription_price),
            hourly_rate: String(client.hourly_rate),
            after_hours_multiplier: String(client.after_hours_multiplier),
            billing_minimum_minutes: String(client.billing_minimum_minutes),
            billing_increment_minutes: String(client.billing_increment_minutes),
            notes: client.notes ?? '',
          }
        : emptyForm,
    )
  }, [open, client])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      name: form.name.trim(),
      siret: form.siret.trim() || null,
      address: form.address.trim() || null,
      tenant_id: form.tenant_id.trim() || null,
      tenant_domain: form.tenant_domain.trim() || null,
      subscription_active: form.subscription_active,
      subscription_price: Number(form.subscription_price),
      hourly_rate: Number(form.hourly_rate),
      after_hours_multiplier: Number(form.after_hours_multiplier),
      billing_minimum_minutes: Number(form.billing_minimum_minutes),
      billing_increment_minutes: Number(form.billing_increment_minutes),
      notes: form.notes.trim() || null,
    }
    const query = client
      ? supabase.from('clients').update(payload).eq('id', client.id)
      : supabase.from('clients').insert(payload)
    const { error } = await query
    setSubmitting(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(client ? 'Client mis à jour' : 'Client créé')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant_domain">Domaine M365</Label>
              <Input
                id="tenant_domain"
                placeholder="contoso.onmicrosoft.com"
                value={form.tenant_domain}
                onChange={(e) => set('tenant_domain', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant_id">Tenant ID (M365)</Label>
            <Input id="tenant_id" value={form.tenant_id} onChange={(e) => set('tenant_id', e.target.value)} />
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="subscription_active">Abonnement supervision</Label>
              <Switch
                id="subscription_active"
                checked={form.subscription_active}
                onCheckedChange={(v) => set('subscription_active', v)}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subscription_price">Prix abonnement (€ HT/mois)</Label>
                <Input
                  id="subscription_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.subscription_price}
                  onChange={(e) => set('subscription_price', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Taux horaire (€ HT/h)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.hourly_rate}
                  onChange={(e) => set('hourly_rate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="after_hours_multiplier">Majoration hors horaires (×)</Label>
                <Input
                  id="after_hours_multiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  value={form.after_hours_multiplier}
                  onChange={(e) => set('after_hours_multiplier', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_minimum_minutes">Minimum facturable (min)</Label>
                <Input
                  id="billing_minimum_minutes"
                  type="number"
                  min="0"
                  value={form.billing_minimum_minutes}
                  onChange={(e) => set('billing_minimum_minutes', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing_increment_minutes">Tranche d'arrondi (min)</Label>
                <Input
                  id="billing_increment_minutes"
                  type="number"
                  min="1"
                  value={form.billing_increment_minutes}
                  onChange={(e) => set('billing_increment_minutes', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
