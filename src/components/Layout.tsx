import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  Ticket,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { ArgosMark } from '@/components/ArgosMark'
import { OfflineSync } from '@/components/OfflineSync'
import { cn } from '@/lib/utils'

// Each section owns a hue (Raycast-style colored icons)
const navItems = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard, end: true, iconColor: 'text-emerald-300', activeBg: 'bg-emerald-400/10' },
  { to: '/clients', label: 'Clients', short: 'Clients', icon: Users, end: false, iconColor: 'text-sky-300', activeBg: 'bg-sky-400/10' },
  { to: '/tickets', label: 'Tickets', short: 'Tickets', icon: Ticket, end: false, iconColor: 'text-amber-300', activeBg: 'bg-amber-400/10' },
  { to: '/rapports', label: 'Rapports', short: 'Rapports', icon: FileText, end: false, iconColor: 'text-violet-300', activeBg: 'bg-violet-400/10' },
  { to: '/facturation', label: 'Facturation', short: 'Factu.', icon: Receipt, end: false, iconColor: 'text-rose-300', activeBg: 'bg-rose-400/10' },
  { to: '/stats', label: 'Statistiques', short: 'Stats', icon: BarChart3, end: false, iconColor: 'text-cyan-300', activeBg: 'bg-cyan-400/10' },
]

export function Layout() {
  const { session, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="min-h-svh md:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-56 shrink-0 flex-col border-r bg-card/40 md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
          <ArgosMark className="text-primary" />
          <div>
            <p className="text-lg leading-none font-bold tracking-tight">Argos</p>
            <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              Supervision
            </p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? cn(item.activeBg, 'text-foreground')
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <item.icon className={cn('size-4', item.iconColor)} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t px-3 py-3">
          <OfflineSync />
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Se déconnecter"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-13 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur md:hidden">
        <ArgosMark className="size-6 text-primary" />
        <span className="text-base font-bold tracking-tight">Argos</span>
        <div className="flex-1" />
        <OfflineSync />
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Se déconnecter"
          className="text-muted-foreground"
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      {/* Content */}
      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div key={location.pathname} className="page-enter mx-auto max-w-6xl p-4 md:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar — thumb-first navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/92 backdrop-blur md:hidden">
        <div
          className="grid grid-cols-6"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? cn(item.iconColor, 'font-semibold') : 'text-muted-foreground',
                )
              }
            >
              <item.icon className={cn('size-5', 'transition-transform')} />
              {item.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
