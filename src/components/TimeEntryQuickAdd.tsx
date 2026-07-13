import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { isAfterHours } from '@/lib/billing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Props {
  ticketId: string
  onSaved: () => void
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nowTime(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const QUICK_DURATIONS = [15, 30, 45, 60]

// Time entry must be near-instant and mobile-friendly: date/time prefilled,
// one tap on a duration chip + save. after_hours is computed from the start
// time and can be manually overridden (SPEC section 2).
export function TimeEntryQuickAdd({ ticketId, onSaved }: Props) {
  const [date, setDate] = useState(today())
  const [startTime, setStartTime] = useState(nowTime())
  const [duration, setDuration] = useState('30')
  const [description, setDescription] = useState('')
  const [afterHours, setAfterHours] = useState(isAfterHours(today(), nowTime()))
  const [afterHoursTouched, setAfterHoursTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Recompute after_hours from start time unless manually overridden
  useEffect(() => {
    if (!afterHoursTouched && date && startTime) {
      setAfterHours(isAfterHours(date, startTime))
    }
  }, [date, startTime, afterHoursTouched])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const minutes = Number(duration)
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error('Durée invalide')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('time_entries').insert({
      ticket_id: ticketId,
      date,
      start_time: startTime || null,
      duration_minutes: Math.round(minutes),
      after_hours: afterHours,
      description: description.trim() || null,
    })
    setSubmitting(false)
    if (error) {
      toast.error(`Erreur : ${error.message}`)
      return
    }
    toast.success(`${minutes} min saisies`)
    setDescription('')
    setDate(today())
    setStartTime(nowTime())
    setAfterHoursTouched(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_DURATIONS.map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={duration === String(m) ? 'default' : 'outline'}
            onClick={() => setDuration(String(m))}
          >
            {m} min
          </Button>
        ))}
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-20"
          aria-label="Durée (minutes)"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          aria-label="Heure de début"
        />
        <div className="col-span-2 flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
          <Label htmlFor="after_hours" className="text-sm">
            Hors horaires {!afterHoursTouched && <span className="text-muted-foreground">(auto)</span>}
          </Label>
          <Switch
            id="after_hours"
            checked={afterHours}
            onCheckedChange={(v) => {
              setAfterHours(v)
              setAfterHoursTouched(true)
            }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ce que j'ai fait…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? '…' : 'Saisir'}
        </Button>
      </div>
    </form>
  )
}
