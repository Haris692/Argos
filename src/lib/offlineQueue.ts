// Offline queue for time entries (SPEC section 3, "Mode hors ligne").
// Entries created without network are stored in IndexedDB and pushed to
// Supabase when connectivity returns. Single user, last write wins —
// deliberately no conflict resolution.

import { get, set } from 'idb-keyval'
import { supabase } from '@/lib/supabase'

const QUEUE_KEY = 'argos-pending-time-entries'

export interface PendingTimeEntry {
  ticket_id: string
  date: string
  start_time: string | null
  duration_minutes: number
  after_hours: boolean
  description: string | null
  queued_at: string
}

export type TimeEntryPayload = Omit<PendingTimeEntry, 'queued_at'>

async function readQueue(): Promise<PendingTimeEntry[]> {
  return ((await get(QUEUE_KEY)) as PendingTimeEntry[] | undefined) ?? []
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length
}

async function enqueue(entry: TimeEntryPayload): Promise<void> {
  const queue = await readQueue()
  queue.push({ ...entry, queued_at: new Date().toISOString() })
  await set(QUEUE_KEY, queue)
}

/** Push every queued entry to Supabase; keeps the ones that still fail. */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  const queue = await readQueue()
  if (queue.length === 0) return { sent: 0, remaining: 0 }
  const stillPending: PendingTimeEntry[] = []
  let sent = 0
  for (const { queued_at: _queuedAt, ...payload } of queue) {
    try {
      const { error } = await supabase.from('time_entries').insert(payload)
      if (error) stillPending.push({ ...payload, queued_at: new Date().toISOString() })
      else sent++
    } catch {
      stillPending.push({ ...payload, queued_at: new Date().toISOString() })
    }
  }
  await set(QUEUE_KEY, stillPending)
  return { sent, remaining: stillPending.length }
}

/**
 * Save a time entry: straight to Supabase when the network is there,
 * queued in IndexedDB otherwise. Returns how it was saved.
 */
export async function saveTimeEntry(
  entry: TimeEntryPayload,
): Promise<{ queued: boolean; error?: string }> {
  if (!navigator.onLine) {
    await enqueue(entry)
    return { queued: true }
  }
  try {
    const { error } = await supabase.from('time_entries').insert(entry)
    if (!error) return { queued: false }
    // Server rejected the payload (constraint, RLS…): surface it, don't queue
    return { queued: false, error: error.message }
  } catch {
    // fetch threw: network dropped mid-flight → queue for later
    await enqueue(entry)
    return { queued: true }
  }
}
