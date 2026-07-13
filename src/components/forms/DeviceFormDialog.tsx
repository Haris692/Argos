import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Contact, Device, DeviceStatus } from '@/types'
import { DEVICE_STATUS_LABELS } from '@/types'
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
  clientId: string
  device: Device | null
  contacts: Contact[]
  onSaved: () => void
}

const NO_CONTACT = 'none'

const emptyForm = {
  hostname: '',
  serial_number: '',
  model: '',
  os: '',
  purchase_date: '',
  warranty_end: '',
  assigned_contact_id: NO_CONTACT,
  intune_enrolled: false,
  defender_onboarded: false,
  status: 'active' as DeviceStatus,
  notes: '',
}

export function DeviceFormDialog({ open, onOpenChange, clientId, device, contacts, onSaved }: Props) {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      device
        ? {
            hostname: device.hostname,
            serial_number: device.serial_number ?? '',
            model: device.model ?? '',
            os: device.os ?? '',
            purchase_date: device.purchase_date ?? '',
            warranty_end: device.warranty_end ?? '',
            assigned_contact_id: device.assigned_contact_id ?? NO_CONTACT,
            intune_enrolled: device.intune_enrolled,
            defender_onboarded: device.defender_onboarded,
            status: device.status,
            notes: device.notes ?? '',
          }
        : emptyForm,
    )
  }, [open, device])

  function set<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const payload = {
      client_id: clientId,
      hostname: form.hostname.trim(),
      serial_number: form.serial_number.trim() || null,
      model: form.model.trim() || null,
      os: form.os.trim() || null,
      purchase_date: form.purchase_date || null,
      warranty_end: form.warranty_end || null,
      assigned_contact_id: form.assigned_contact_id === NO_CONTACT ? null : form.assigned_contact_id,
      intune_enrolled: form.intune_enrolled,
      defender_onboarded: form.defender_onboarded,
      status: form.status,
      notes: form.notes.trim() || null,
    }
    const query = device
      ? supabase.from('devices').update(payload).eq('id', device.id)
      : supabase.from('devices').insert(payload)
    const { error } = await query
    setSubmitting(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(device ? 'Poste mis à jour' : 'Poste créé')
    onOpenChange(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{device ? 'Modifier le poste' : 'Nouveau poste'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hostname">Nom de machine *</Label>
              <Input id="hostname" value={form.hostname} onChange={(e) => set('hostname', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Numéro de série</Label>
              <Input id="serial_number" value={form.serial_number} onChange={(e) => set('serial_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input id="model" value={form.model} onChange={(e) => set('model', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="os">Système</Label>
              <Input id="os" placeholder="Windows 11 Pro" value={form.os} onChange={(e) => set('os', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Date d'achat</Label>
              <Input id="purchase_date" type="date" value={form.purchase_date} onChange={(e) => set('purchase_date', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty_end">Fin de garantie</Label>
              <Input id="warranty_end" type="date" value={form.warranty_end} onChange={(e) => set('warranty_end', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <Select value={form.assigned_contact_id} onValueChange={(v) => set('assigned_contact_id', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CONTACT}>Non affecté</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v as DeviceStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="intune_enrolled">Intune</Label>
              <Switch id="intune_enrolled" checked={form.intune_enrolled} onCheckedChange={(v) => set('intune_enrolled', v)} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="defender_onboarded">Defender</Label>
              <Switch id="defender_onboarded" checked={form.defender_onboarded} onCheckedChange={(v) => set('defender_onboarded', v)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="device_notes">Notes</Label>
            <Textarea id="device_notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
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
