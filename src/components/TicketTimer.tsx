import { useEffect, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { toast } from 'sonner'
import { isAfterHours } from '@/lib/billing'
import { saveTimeEntry } from '@/lib/offlineQueue'
import { Button } from '@/components/ui/button'

interface Props {
  ticketId: string
  onSaved: () => void
}

// The running timer survives page reloads and phone lock: only the start
// timestamp is persisted (localStorage), elapsed time is derived from it.
const storageKey = (ticketId: string) => `argos-timer-${ticketId}`

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function TicketTimer({ ticketId, onSaved }: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(() => {
    const raw = localStorage.getItem(storageKey(ticketId))
    return raw ? Number(raw) : null
  })
  const [now, setNow] = useState(Date.now())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (startedAt === null) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  function start() {
    const ts = Date.now()
    localStorage.setItem(storageKey(ticketId), String(ts))
    setStartedAt(ts)
    setNow(ts)
  }

  async function stop() {
    if (startedAt === null) return
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    const startDate = new Date(startedAt)
    const date = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
    const startTime = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
    setSaving(true)
    const result = await saveTimeEntry({
      ticket_id: ticketId,
      date,
      start_time: startTime,
      duration_minutes: elapsedMinutes,
      after_hours: isAfterHours(date, startTime),
      description: null,
    })
    setSaving(false)
    if (result.error) {
      toast.error(`Erreur : ${result.error}`)
      return
    }
    localStorage.removeItem(storageKey(ticketId))
    setStartedAt(null)
    if (result.queued) {
      window.dispatchEvent(new CustomEvent('argos:time-entry-queued'))
      toast.info(`Chrono arrêté : ${elapsedMinutes} min enregistrées hors ligne`)
    } else {
      toast.success(`Chrono arrêté : ${elapsedMinutes} min saisies`)
    }
    onSaved()
  }

  if (startedAt === null) {
    return (
      <Button variant="outline" onClick={start}>
        <Play className="size-4" />
        Chrono
      </Button>
    )
  }

  return (
    <Button variant="destructive" onClick={stop} disabled={saving}>
      <Square className="size-4" />
      {formatElapsed(now - startedAt)}
    </Button>
  )
}
