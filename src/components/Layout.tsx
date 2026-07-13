import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/clients', label: 'Clients', end: false },
  { to: '/tickets', label: 'Tickets', end: false },
  { to: '/rapports', label: 'Rapports', end: false },
  { to: '/facturation', label: 'Facturation', end: false },
]

export function Layout() {
  const { session, loading, signOut } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <span className="text-lg font-bold tracking-tight">Argos</span>
          <nav className="flex flex-1 items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={signOut} title="Se déconnecter">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
