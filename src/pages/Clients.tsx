import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClientFormDialog } from '@/components/forms/ClientFormDialog'

export function Clients() {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name')
    if (error) {
      toast.error(`Erreur de chargement : ${error.message}`)
      return
    }
    setClients(data as Client[])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nouveau client
        </Button>
      </div>

      {clients === null ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun client. Créez le premier.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Domaine M365</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead className="text-right">Taux horaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`/clients/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.tenant_domain ?? '—'}</TableCell>
                  <TableCell>
                    {c.subscription_active ? (
                      <Badge>{c.subscription_price} € /mois</Badge>
                    ) : (
                      <Badge variant="outline">Sans</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{c.hourly_rate} € /h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={null}
        onSaved={load}
      />
    </div>
  )
}
