import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Phase 1 placeholder — full dashboard (open tickets, unbilled hours,
// projected amount, missing reports) comes in Phase 5.
export function Dashboard() {
  const [clientCount, setClientCount] = useState<number | null>(null)
  const [deviceCount, setDeviceCount] = useState<number | null>(null)

  useEffect(() => {
    void supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .is('archived_at', null)
      .then(({ count }) => setClientCount(count ?? 0))
    void supabase
      .from('devices')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => setDeviceCount(count ?? 0))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Clients actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{clientCount ?? '…'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Postes actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{deviceCount ?? '…'}</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        Tickets, heures non facturées et montant prévisionnel arriveront avec les phases 2 à 5.{' '}
        <Link to="/clients" className="underline">
          Gérer les clients
        </Link>
      </p>
    </div>
  )
}
