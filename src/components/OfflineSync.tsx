import { useCallback, useEffect, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { flushQueue, pendingCount } from '@/lib/offlineQueue'
import { Button } from '@/components/ui/button'

// Header widget: shows queued offline time entries and syncs them
// automatically when the network comes back.
export function OfflineSync() {
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setPending(await pendingCount())
  }, [])

  const sync = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    const { sent, remaining } = await flushQueue()
    setSyncing(false)
    setPending(remaining)
    if (sent > 0) {
      toast.success(`${sent} saisie${sent > 1 ? 's' : ''} hors ligne synchronisée${sent > 1 ? 's' : ''}`)
      window.dispatchEvent(new CustomEvent('argos:time-entries-synced'))
    }
  }, [])

  useEffect(() => {
    void refresh().then(sync)
    const onOnline = () => {
      setOnline(true)
      void sync()
    }
    const onOffline = () => setOnline(false)
    const onQueued = () => void refresh()
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    window.addEventListener('argos:time-entry-queued', onQueued)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('argos:time-entry-queued', onQueued)
    }
  }, [refresh, sync])

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Hors ligne">
        <CloudOff className="size-4" />
        {pending > 0 && <span>{pending} en attente</span>}
      </span>
    )
  }

  if (pending === 0) return null

  return (
    <Button variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
      <RefreshCw className={syncing ? 'size-4 animate-spin' : 'size-4'} />
      Synchroniser ({pending})
    </Button>
  )
}
