import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { pull, push } from '../db/syncEngine'
import { useAuthStore } from '../stores/authStore'
import { db } from '../db/database'
import { useOnlineStatus } from '../db/hooks'

interface SyncContextValue {
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: Date | null
  isOnline: boolean
}

const SyncContext = createContext<SyncContextValue>({
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  isOnline: true,
})

export function useSyncStatus(): SyncContextValue {
  return useContext(SyncContext)
}

const PULL_INTERVAL = 15 * 60 * 1000
const PUSH_DEBOUNCE_MS = 2000
const PULL_DEBOUNCE_MS = 1500

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pullTimer: ReturnType<typeof setTimeout> | null = null
let isPushRunning = false
let isPullRunning = false

function schedulePush(onSyncChange: (syncing: boolean, lastSyncAt: Date | null) => void) {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    if (isPushRunning) return
    isPushRunning = true
    onSyncChange(true, null)
    try {
      await push()
      onSyncChange(false, new Date())
    } catch (err) {
      console.warn('[SyncProvider] Debounced push failed:', err)
      onSyncChange(false, null)
    } finally {
      isPushRunning = false
    }
  }, PUSH_DEBOUNCE_MS)
}

function schedulePull(userId: string, onSyncChange: (syncing: boolean, lastSyncAt: Date | null) => void) {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(async () => {
    if (isPullRunning) return
    isPullRunning = true
    onSyncChange(true, null)
    try {
      await pull(userId)
      onSyncChange(false, new Date())
    } catch (err) {
      console.warn('[SyncProvider] Debounced pull failed:', err)
      onSyncChange(false, null)
    } finally {
      isPullRunning = false
    }
  }, PULL_DEBOUNCE_MS)
}

class SyncSSEListener {
  private es: EventSource | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private retryDelay = 2000
  private readonly maxRetryDelay = 30000
  private onPull: (() => void) | null = null

  connect(onPull: () => void) {
    this.disconnect()
    this.onPull = onPull
    this.retryDelay = 2000
    this.open()
  }

  private open() {
    if (this.es) this.es.close()

    this.es = new EventSource('/api/sse/sync', { withCredentials: true })

    this.es.onopen = () => {
      this.retryDelay = 2000
    }

    const events = [
      'task_updated', 'task_created', 'task_deleted',
      'task_moved', 'task_toggled', 'task_reordered',
      'subtask_created', 'recurrence_stopped', 'trash_cleared',
    ]
    for (const evt of events) {
      this.es!.addEventListener(evt, () => {
        this.onPull?.()
      })
    }

    this.es.onerror = () => {
      this.es?.close()
      this.es = null
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (!navigator.onLine || !this.onPull) return
    const delay = this.retryDelay
    this.retryDelay = Math.min(delay * 2, this.maxRetryDelay)
    this.retryTimeout = setTimeout(() => this.open(), delay)
  }

  disconnect() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
    if (this.es) {
      this.es.close()
      this.es = null
    }
    this.onPull = null
  }
}

const syncSSE = new SyncSSEListener()

interface SyncProviderProps {
  children: ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const user = useAuthStore(s => s.user)
  const isOnline = useOnlineStatus()
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const onSyncChange = useCallback((syncing: boolean, last: Date | null) => {
    if (!isMountedRef.current) return
    setIsSyncing(syncing)
    if (last) setLastSyncAt(last)
  }, [])

  const doPush = async () => {
    if (!user || isSyncing) return
    setIsSyncing(true)
    try {
      await push()
      setLastSyncAt(new Date())
    } catch (err) {
      console.warn('[SyncProvider] Push failed:', err)
    } finally {
      if (isMountedRef.current) setIsSyncing(false)
    }
  }

  const doPull = async () => {
    if (!user || isSyncing) return
    setIsSyncing(true)
    try {
      await pull(user.id)
      setLastSyncAt(new Date())
    } catch (err) {
      console.warn('[SyncProvider] Pull failed:', err)
    } finally {
      if (isMountedRef.current) setIsSyncing(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const countPending = async () => {
      const count = await db.mutations.count()
      if (isMountedRef.current) setPendingCount(count)
    }

    countPending()

    const interval = setInterval(countPending, 5000)

    doPush().then(() => doPull()).then(() => {
      if (isMountedRef.current) {
        intervalRef.current = setInterval(() => {
          doPull()
        }, PULL_INTERVAL)
      }
    })

    db.mutations.hook('creating', () => {
      schedulePush(onSyncChange)
    })

    syncSSE.connect(() => {
      if (user) schedulePull(user.id, onSyncChange)
    })

    return () => {
      clearInterval(interval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      syncSSE.disconnect()
    }
  }, [user?.id, onSyncChange])

  useEffect(() => {
    if (isOnline && user) {
      doPush().then(() => doPull())
    }
  }, [isOnline])

  return (
    <SyncContext.Provider value={{ isSyncing, pendingCount, lastSyncAt, isOnline }}>
      {children}
    </SyncContext.Provider>
  )
}
