import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArgosMark } from '@/components/ArgosMark'

export function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const message = await signIn(email, password)
    if (message) setError('Identifiants invalides')
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="page-enter w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <ArgosMark className="size-12 text-primary drop-shadow-[0_0_24px_oklch(0.82_0.16_165_/_0.55)]" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Argos</h1>
            <p className="mt-1 text-xs tracking-[0.22em] text-muted-foreground uppercase">
              Clients · Tickets · Facturation
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border bg-card/60 p-6 shadow-[0_20px_60px_-20px_oklch(0_0_0/0.5)]"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accès privé — compte unique.
        </p>
      </div>
    </div>
  )
}
