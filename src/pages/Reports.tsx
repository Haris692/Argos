import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { formatMonth } from '@/lib/months'
import type { Client, MonthlyReport } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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

export function Reports() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<MonthlyReport[] | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [newDialog, setNewDialog] = useState(false)
  const [newClientId, setNewClientId] = useState('')
  const [newMonth, setNewMonth] = useState(currentMonth())

  useEffect(() => {
    void supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        const list = (data ?? []) as Client[]
        setClients(list)
        if (list[0]) setNewClientId(list[0].id)
      })
    void supabase
      .from('monthly_reports')
      .select('*')
      .order('month', { ascending: false })
      .then(({ data }) => setReports((data ?? []) as MonthlyReport[]))
  }, [])

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '…'

  async function deleteReport(r: MonthlyReport) {
    if (!confirm(`Supprimer le rapport ${formatMonth(r.month)} de ${clientName(r.client_id)} ?`))
      return
    const { error } = await supabase.from('monthly_reports').delete().eq('id', r.id)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success('Rapport supprimé')
    setReports((list) => (list ?? []).filter((x) => x.id !== r.id))
  }

  function statusBadge(r: MonthlyReport) {
    if (r.sent_at) return <Badge>Envoyé</Badge>
    if (r.generated_at) return <Badge variant="secondary">Généré</Badge>
    return <Badge variant="outline">Brouillon</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rapports mensuels</h1>
        <Button onClick={() => setNewDialog(true)}>
          <Plus className="size-4" />
          Nouveau rapport
        </Button>
      </div>

      {reports === null ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun rapport. C'est le livrable qui justifie l'abonnement : créez celui du mois.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mois</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Envoyé le</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      to={`/rapports/${r.client_id}/${r.month}`}
                      className="font-medium hover:underline"
                    >
                      {formatMonth(r.month)}
                    </Link>
                  </TableCell>
                  <TableCell>{clientName(r.client_id)}</TableCell>
                  <TableCell>{statusBadge(r)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.sent_at ? new Date(r.sent_at).toLocaleDateString('fr-FR') : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void deleteReport(r)}
                      title="Supprimer le rapport"
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

      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau rapport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={newClientId} onValueChange={setNewClientId}>
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
              <Label htmlFor="month">Mois</Label>
              <Input
                id="month"
                type="month"
                value={newMonth}
                onChange={(e) => setNewMonth(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>
              Annuler
            </Button>
            <Button
              disabled={!newClientId || !newMonth}
              onClick={() => navigate(`/rapports/${newClientId}/${newMonth}`)}
            >
              Ouvrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
