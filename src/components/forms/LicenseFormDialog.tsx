import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Contact, License } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  license: License | null
  contacts: Contact[]
  onSaved: () => void
}

const NO_CONTACT = 'none'

const emptyForm = {
  product: '',
  quantity: '1',
  assigned_contact_id: NO_CONTACT,
  renewal_date: '',
  monthly_cost: '',
}

export function LicenseFormDialog({ open, onOpenChange, clientId, license, contacts, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      license
        ? {
            product: license.product,
            quantity: String(license.quantity),
            assigned_contact_id: license.assigned_contact_id ?? NO_CONTACT,
            renewal_date: license.renewal_date ?? '',
            monthly_cost: license.monthly_cost != null ? String(license.monthly_cost) : '',
          }
        : emptyForm,
    )
  }, [open, license])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      client_id: clientId,
      product: form.product.trim(),
      quantity: Number(form.quantity),
      assigned_contact_id: form.assigned_contact_id === NO_CONTACT ? null : form.assigned_contact_id,
      renewal_date: form.renewal_date || null,
      monthly_cost: form.monthly_cost === '' ? null : Number(form.monthly_cost),
    }
    const query = license
      ? supabase.from('licenses').update(payload).eq('id', license.id)
      : supabase.from('licenses').insert(payload)
    const { error } = await query
    setSubmitting(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(license ? 'Licence mise à jour' : 'Licence créée')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{license ? 'Modifier la licence' : 'Nouvelle licence'}</DialogTitle>
          <DialogDescription>
            Coût mensuel à titre d'information : aucune marge ni refacturation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produit *</Label>
            <Input
              id="product"
              placeholder="M365 Business Premium"
              value={form.product}
              onChange={(e) => set('product', e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_cost">Coût mensuel (€ HT)</Label>
              <Input
                id="monthly_cost"
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_cost}
                onChange={(e) => set('monthly_cost', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Affectée à</Label>
              <Select value={form.assigned_contact_id} onValueChange={(v) => set('assigned_contact_id', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONTACT}>Non affectée</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewal_date">Renouvellement</Label>
              <Input
                id="renewal_date"
                type="date"
                value={form.renewal_date}
                onChange={(e) => set('renewal_date', e.target.value)}
              />
            </div>
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
