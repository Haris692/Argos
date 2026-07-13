import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/hooks/useAuth'
import { Layout } from '@/components/Layout'
import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Clients } from '@/pages/Clients'
import { ClientDetail } from '@/pages/ClientDetail'
import { Tickets } from '@/pages/Tickets'
import { TicketDetail } from '@/pages/TicketDetail'
import { Reports } from '@/pages/Reports'
import { ReportEditor } from '@/pages/ReportEditor'
import { Billing } from '@/pages/Billing'
import { Stats } from '@/pages/Stats'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/rapports" element={<Reports />} />
            <Route path="/rapports/:clientId/:month" element={<ReportEditor />} />
            <Route path="/facturation" element={<Billing />} />
            <Route path="/stats" element={<Stats />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" />
    </AuthProvider>
  )
}
