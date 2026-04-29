import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { pull, push, selectivePull, getResourceTypeFromSSE, type EntityType } from '../db/syncEngine'
import { useAuthStore } from '../stores/authStore'
import { db } from '../db/database'
import { useOnlineStatus } from '../db/hooks'
import { SyncContext } from './SyncContext'

const PULL_INTERVAL = 15 * 60 * 1000
const PUSH_DEBOUNCE_MS = 1500
const PULL_DEBOUNCE_MS = 3000

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pullTimer: ReturnType<typeof setTimeout> | null = null
let pushingRefGlobal = false
let pullingRefGlobal = false
let setIsSyncingFn: ((v: boolean) => void) | null = null
let setLastSyncAtFn: ((d: Date) => void) | null = null

const pushEchoEntities = new Map<string, number>()
const PUSH_ECHO_WINDOW_MS = 5000

function markPushEcho(entityType: string, entityId: string) {
  pushEchoEntities.set(`${entityType}:${entityId}`, Date.now())
}

function isPushEcho(entityType: string, entityId?: string): boolean {
  const now = Date.now()
  for (const [key, ts] of pushEchoEntities) {
    if (now - ts > PUSH_ECHO_WINDOW_MS) {
      pushEchoEntities.delete(key)
    }
  }
  if (entityId) {
    return pushEchoEntities.has(`${entityType}:${entityId}`)
  }
  for (const key of pushEchoEntities.keys()) {
    if (key.startsWith(`${entityType}:`)) return true
  }
  return false
}

function updateSyncing() {
  setIsSyncingFn?.(pushingRefGlobal || pullingRefGlobal)
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    if (pushingRefGlobal) return
    pushingRefGlobal = true
    updateSyncing()
    try {
      const sent = await push()
      setLastSyncAtFn?.(new Date())
      if (sent) {
        for (const { entityType, entityId } of sent) {
          markPushEcho(entityType, entityId)
        }
      }
    } catch (err) {
      console.warn('[SyncProvider] Debounced push failed:', err)
    } finally {
      pushingRefGlobal = false
      updateSyncing()
    }
  }, PUSH_DEBOUNCE_MS)
}

function schedulePull(userId: string, eventType?: string) {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(async () => {
    if (pullingRefGlobal) return
    pullingRefGlobal = true
    updateSyncing()
    try {
      if (eventType) {
        const resourceType = getResourceTypeFromSSE(eventType)
        if (resourceType) {
          await selectivePull(userId, [resourceType])
        } else {
          await pull(userId)
        }
      } else {
        await pull(userId)
      }
      setLastSyncAtFn?.(new Date())
    } catch (err) {
      console.warn('[SyncProvider] Debounced pull failed:', err)
    } finally {
      pullingRefGlobal = false
      updateSyncing()
    }
  }, PULL_DEBOUNCE_MS)
}

class SyncSSEListener {
  private es: EventSource | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private retryDelay = 2000
  private readonly maxRetryDelay = 30000
  private onPull: ((eventType: string) => void) | null = null

  connect(onPull: (eventType: string) => void) {
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
      'task_updated',
      'checklist_updated',
      'project_created', 'project_updated', 'project_deleted',
      'area_created', 'area_updated', 'area_deleted',
      'context_created', 'context_updated', 'context_deleted',
      'tag_created', 'tag_updated', 'tag_deleted',
      'verb_template_created', 'verb_template_updated', 'verb_template_deleted',
    ]
    for (const evt of events) {
      this.es!.addEventListener(evt, (event) => {
        const resourceType = evt.split('_')[0] as EntityType
        let entityId: string | undefined
        try {
          const data = JSON.parse((event as MessageEvent).data)
          entityId = data[`${resourceType}_id`]
        } catch {}
        if (!isPushEcho(resourceType, entityId)) {
          this.onPull?.(evt)
        }
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

  useEffect(() => {
    isMountedRef.current = true
    setIsSyncingFn = (v: boolean) => { if (isMountedRef.current) setIsSyncing(v) }
    setLastSyncAtFn = (d: Date) => { if (isMountedRef.current) setLastSyncAt(d) }
    return () => {
      isMountedRef.current = false
      setIsSyncingFn = null
      setLastSyncAtFn = null
    }
  }, [])

  const userRef = useRef(user)
  userRef.current = user

  const doPush = useCallback(async () => {
    if (!userRef.current || pushingRefGlobal) return
    pushingRefGlobal = true
    updateSyncing()
    try {
      const sent = await push()
      if (isMountedRef.current) setLastSyncAt(new Date())
      if (sent) {
        for (const { entityType, entityId } of sent) {
          markPushEcho(entityType, entityId)
        }
      }
    } catch (err) {
      console.warn('[SyncProvider] Push failed:', err)
    } finally {
      pushingRefGlobal = false
      updateSyncing()
    }
  }, [])

  const doPull = useCallback(async () => {
    if (!userRef.current || pullingRefGlobal) return
    pullingRefGlobal = true
    updateSyncing()
    try {
      await pull(userRef.current.id)
      if (isMountedRef.current) setLastSyncAt(new Date())
    } catch (err) {
      console.warn('[SyncProvider] Pull failed:', err)
    } finally {
      pullingRefGlobal = false
      updateSyncing()
    }
  }, [])

  useEffect(() => {
    if (!userRef.current) return

    const countPending = async () => {
      const count = await db.mutations.count()
      if (isMountedRef.current) setPendingCount(count)
    }

    countPending()
    const interval = setInterval(countPending, 15000)

    doPush()
    doPull()

    if (isMountedRef.current) {
      intervalRef.current = setInterval(() => {
        doPull()
      }, PULL_INTERVAL)
    }

    db.mutations.hook('creating', () => {
      schedulePush()
    })

    syncSSE.connect((eventType: string) => {
      if (userRef.current) schedulePull(userRef.current.id, eventType)
    })

    return () => {
      clearInterval(interval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      syncSSE.disconnect()
    }
  }, [user?.id, doPush, doPull])

  const prevOnlineRef = useRef(isOnline)

  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline && userRef.current) {
      doPush()
      doPull()
    }
    prevOnlineRef.current = isOnline
  }, [isOnline, doPush, doPull])

  return (
    <SyncContext.Provider value={{ isSyncing, pendingCount, lastSyncAt, isOnline }}>
      {children}
    </SyncContext.Provider>
  )
}
