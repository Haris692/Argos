import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Archive, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client, Contact, Device, License } from '@/types'
import { DEVICE_STATUS_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientFormDialog } from '@/components/forms/ClientFormDialog'
import { ContactFormDialog } from '@/components/forms/ContactFormDialog'
import { DeviceFormDialog } from '@/components/forms/DeviceFormDialog'
import { LicenseFormDialog } from '@/components/forms/LicenseFormDialog'

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [devices, setDevices] = useState<Device[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)

  const [clientDialog, setClientDialog] = useState(false)
  const [contactDialog, setContactDialog] = useState<{ open: boolean; item: Contact | null }>({ open: false, item: null })
  const [deviceDialog, setDeviceDialog] = useState<{ open: boolean; item: Device | null }>({ open: false, item: null })
  const [licenseDialog, setLicenseDialog] = useState<{ open: boolean; item: License | null }>({ open: false, item: null })

  const load = useCallback(async () => {
    if (!id) return
    const [clientRes, contactsRes, devicesRes, licensesRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('contacts').select('*').eq('client_id', id).order('last_name'),
      supabase.from('devices').select('*').eq('client_id', id).order('hostname'),
      supabase.from('licenses').select('*').eq('client_id', id).order('product'),
    ])
    const error = clientRes.error ?? contactsRes.error ?? devicesRes.error ?? licensesRes.error
    if (error) {
      toast.error(`Erreur de chargement : ${error.message}`)
      setLoading(false)
      return
    }
    setClient(clientRes.data as Client)
    setContacts((contactsRes.data ?? []) as Contact[])
    setDevices((devicesRes.data ?? []) as Device[])
    setLicenses((licensesRes.data ?? []) as License[])
    setLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(table: 'contacts' | 'devices' | 'licenses', itemId: string, label: string) {
    if (!confirm(`Supprimer ${label} ?`)) return
    const { error } = await supabase.from(table).delete().eq('id', itemId)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success('Supprimé')
    void load()
  }

  async function archiveClient() {
    if (!client) return
    if (
      !confirm(
        `Archiver ${client.name} ?\nLe client disparaîtra des listes mais tout l'historique (tickets, temps, rapports, facturation) est conservé.`,
      )
    )
      return
    const { error } = await supabase
      .from('clients')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', client.id)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(`${client.name} archivé`)
    navigate('/clients')
  }

  function contactName(contactId: string | null): string {
    const c = contacts.find((x) => x.id === contactId)
    return c ? `${c.first_name} ${c.last_name}` : '—'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!client) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Client introuvable.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/clients" title="Retour aux clients">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">{client.name}</h1>
        {client.subscription_active && <Badge>Supervision {client.subscription_price} € /mois</Badge>}
        <div className="flex-1" />
        <Button variant="outline" asChild>
          <Link to={`/tickets?client=${client.id}`}>Tickets</Link>
        </Button>
        <Button variant="outline" onClick={() => setClientDialog(true)}>
          <Pencil className="size-4" />
          Modifier
        </Button>
        <Button variant="outline" onClick={() => void archiveClient()} title="Archiver le client">
          <Archive className="size-4 text-destructive" />
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="devices">Postes ({devices.length})</TabsTrigger>
          <TabsTrigger value="licenses">Licences ({licenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contrat et tarifs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>
                Abonnement supervision :{' '}
                {client.subscription_active ? `${client.subscription_price} € HT/mois` : 'inactif'}
              </p>
              <p>Taux horaire : {client.hourly_rate} € HT/h</p>
              <p>
                Hors horaires : ×{client.after_hours_multiplier} soit{' '}
                {(client.hourly_rate * client.after_hours_multiplier).toFixed(2).replace(/\.00$/, '')} € HT/h
              </p>
              <p>
                Facturation : minimum {client.billing_minimum_minutes} min, arrondi par tranche de{' '}
                {client.billing_increment_minutes} min
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>SIRET : {client.siret ?? '—'}</p>
              <p>Adresse : {client.address ?? '—'}</p>
              <p>Domaine M365 : {client.tenant_domain ?? '—'}</p>
              <p>Tenant ID : {client.tenant_id ?? '—'}</p>
              {client.notes && <p className="text-muted-foreground">{client.notes}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setContactDialog({ open: true, item: null })}>
              <Plus className="size-4" />
              Nouveau contact
            </Button>
          </div>
          {contacts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun contact.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Fonction</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.first_name} {c.last_name}{' '}
                        {c.is_primary && <Badge variant="secondary">Principal</Badge>}
                      </TableCell>
                      <TableCell>{c.email ?? '—'}</TableCell>
                      <TableCell>{c.phone ?? '—'}</TableCell>
                      <TableCell>{c.role ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setContactDialog({ open: true, item: c })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove('contacts', c.id, `${c.first_name} ${c.last_name}`)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setDeviceDialog({ open: true, item: null })}>
              <Plus className="size-4" />
              Nouveau poste
            </Button>
          </div>
          {devices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun poste.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Système</TableHead>
                    <TableHead>Intune</TableHead>
                    <TableHead>Defender</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.hostname}</TableCell>
                      <TableCell>{contactName(d.assigned_contact_id)}</TableCell>
                      <TableCell>{d.os ?? '—'}</TableCell>
                      <TableCell>{d.intune_enrolled ? '✓' : '—'}</TableCell>
                      <TableCell>{d.defender_onboarded ? '✓' : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === 'active' ? 'secondary' : 'outline'}>
                          {DEVICE_STATUS_LABELS[d.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeviceDialog({ open: true, item: d })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove('devices', d.id, d.hostname)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="licenses" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setLicenseDialog({ open: true, item: null })}>
              <Plus className="size-4" />
              Nouvelle licence
            </Button>
          </div>
          {licenses.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune licence.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead>Affectée à</TableHead>
                    <TableHead>Renouvellement</TableHead>
                    <TableHead className="text-right">Coût mensuel</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licenses.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.product}</TableCell>
                      <TableCell className="text-right">{l.quantity}</TableCell>
                      <TableCell>{contactName(l.assigned_contact_id)}</TableCell>
                      <TableCell>{l.renewal_date ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {l.monthly_cost != null ? `${l.monthly_cost} €` : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLicenseDialog({ open: true, item: l })}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove('licenses', l.id, l.product)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ClientFormDialog open={clientDialog} onOpenChange={setClientDialog} client={client} onSaved={load} />
      <ContactFormDialog
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((s) => ({ ...s, open }))}
        clientId={client.id}
        contact={contactDialog.item}
        onSaved={load}
      />
      <DeviceFormDialog
        open={deviceDialog.open}
        onOpenChange={(open) => setDeviceDialog((s) => ({ ...s, open }))}
        clientId={client.id}
        device={deviceDialog.item}
        contacts={contacts}
        onSaved={load}
      />
      <LicenseFormDialog
        open={licenseDialog.open}
        onOpenChange={(open) => setLicenseDialog((s) => ({ ...s, open }))}
        clientId={client.id}
        license={licenseDialog.item}
        contacts={contacts}
        onSaved={load}
      />
    </div>
  )
}
