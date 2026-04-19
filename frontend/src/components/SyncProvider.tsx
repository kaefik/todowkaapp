import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
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

    return () => {
      clearInterval(interval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user?.id])

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
