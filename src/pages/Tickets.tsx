import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Client, Ticket, TicketPriority, TicketStatus } from '@/types'
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
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
import { TicketFormDialog } from '@/components/forms/TicketFormDialog'

const ALL = 'all'
const OPEN = 'open' // pseudo-status: everything except resolu/ferme

const STATUS_BADGE_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  nouveau: 'default',
  en_cours: 'default',
  attente_client: 'secondary',
  resolu: 'outline',
  ferme: 'outline',
}

export function Tickets() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState<Ticket[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  const clientFilter = searchParams.get('client') ?? ALL
  const statusFilter = searchParams.get('status') ?? OPEN
  const priorityFilter = searchParams.get('priority') ?? ALL

  function setFilter(key: string, value: string) {
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
      .then(({ data }) => setClients((data ?? []) as Client[]))
  }, [])

  const load = useCallback(async () => {
    let query = supabase.from('tickets').select('*').order('created_at', { ascending: false })
    if (clientFilter !== ALL) query = query.eq('client_id', clientFilter)
    if (statusFilter === OPEN) query = query.not('status', 'in', '("resolu","ferme")')
    else if (statusFilter !== ALL) query = query.eq('status', statusFilter)
    if (priorityFilter !== ALL) query = query.eq('priority', priorityFilter as TicketPriority)
    const { data, error } = await query
    if (error) {
      toast.error(`Erreur de chargement : ${error.message}`)
      return
    }
    setTickets(data as Ticket[])
  }, [clientFilter, statusFilter, priorityFilter])

  useEffect(() => {
    void load()
  }, [load])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '…'

  async function deleteTicket(t: Ticket) {
    if (
      !confirm(
        `Supprimer définitivement ${t.reference} « ${t.title} » ?\nLes saisies de temps associées seront supprimées avec.`,
      )
    )
      return
    const { error } = await supabase.from('tickets').delete().eq('id', t.id)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(`${t.reference} supprimé`)
    void load()
  }

  const query = search.trim().toLowerCase()
  const visibleTickets =
    tickets === null
      ? null
      : query === ''
        ? tickets
        : tickets.filter(
            (t) =>
              t.title.toLowerCase().includes(query) ||
              t.reference.toLowerCase().includes(query) ||
              (t.description ?? '').toLowerCase().includes(query),
          )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tickets</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nouveau ticket
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={clientFilter} onValueChange={(v) => setFilter('client', v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tous les clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OPEN}>Ouverts</SelectItem>
            <SelectItem value={ALL}>Tous les statuts</SelectItem>
            {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setFilter('priority', v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toutes priorités</SelectItem>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </div>

      {visibleTickets === null ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : visibleTickets.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun ticket.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Réf.</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleTickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to={`/tickets/${t.id}`} className="font-mono text-xs hover:underline">
                      {t.reference}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to={`/tickets/${t.id}`} className="font-medium hover:underline">
                      {t.title}
                    </Link>
                    {!t.billable && (
                      <Badge variant="outline" className="ml-2">
                        Non facturable
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{clientName(t.client_id)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TICKET_CATEGORY_LABELS[t.category]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.priority === 'bloquant' ? 'destructive' : 'secondary'}>
                      {TICKET_PRIORITY_LABELS[t.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[t.status]}>
                      {TICKET_STATUS_LABELS[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deleteTicket(t)}
                      title="Supprimer le ticket"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TicketFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ticket={null}
        clients={clients}
        onSaved={() => void load()}
      />
    </div>
  )
}
