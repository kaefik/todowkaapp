import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { pull, push, selectivePull, deleteLocalEntity, getResourceTypeFromSSE, type EntityType } from '../db/syncEngine'
import { useAuthStore } from '../stores/authStore'
import { db } from '../db/database'
import { useOnlineStatus } from '../db/hooks'
import { isPushEcho } from '../db/pushEcho'
import { SyncContext } from './SyncContext'
import { performInitialSync } from '../db/init'

const PULL_INTERVAL = 15 * 60 * 1000
const PUSH_DEBOUNCE_MS = 1500
const PULL_DEBOUNCE_MS = 3000

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pullTimer: ReturnType<typeof setTimeout> | null = null
let setIsSyncingFn: ((v: boolean) => void) | null = null
let setLastSyncAtFn: ((d: Date) => void) | null = null

class Mutex {
  private queue: Promise<void> = Promise.resolve()

  async runExclusive<T>(fn: () => Promise<T>, timeoutMs = 60000): Promise<T> {
    let release: () => void
    const prev = this.queue
    this.queue = new Promise<void>(resolve => { release = resolve })

    await prev

    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Mutex execution timeout')), timeoutMs)
        )
      ])
    } finally {
      release!()
    }
  }
}

const syncMutex = new Mutex()

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    syncMutex.runExclusive(async () => {
      setIsSyncingFn?.(true)
      try {
        await push()
        setLastSyncAtFn?.(new Date())
      } finally {
        setIsSyncingFn?.(false)
      }
    })
  }, PUSH_DEBOUNCE_MS)
}

function schedulePull(userId: string, eventType?: string) {
  if (pullTimer) clearTimeout(pullTimer)
  pullTimer = setTimeout(() => {
    syncMutex.runExclusive(async () => {
      setIsSyncingFn?.(true)
      try {
        if (eventType) {
          const resourceType = getResourceTypeFromSSE(eventType)
          if (resourceType) {
            if (eventType === 'task_updated' || eventType === 'task_deleted' || eventType === 'tasks_cleared') {
              await pull(userId)
            } else {
              await selectivePull(userId, [resourceType])
            }
          } else {
            await pull(userId)
          }
        } else {
          await pull(userId)
        }
        setLastSyncAtFn?.(new Date())
      } finally {
        setIsSyncingFn?.(false)
      }
    })
  }, PULL_DEBOUNCE_MS)
}

function extractEntityId(data: Record<string, unknown>): string | undefined {
  return (data.task_id ?? data.project_id ?? data.area_id ??
          data.context_id ?? data.tag_id ?? data.verb_template_id ??
          data.calendar_event_id ?? data.checklist_item_id) as string | undefined
}

class SyncSSEListener {
  private es: EventSource | null = null
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  private retryDelay = 2000
  private readonly maxRetryDelay = 30000
  private onPull: ((eventType: string) => void) | null = null
  private onDelete: ((entityType: EntityType, entityId: string) => void) | null = null

  connect(onPull: (eventType: string) => void, onDelete: (entityType: EntityType, entityId: string) => void) {
    this.disconnect()
    this.onPull = onPull
    this.onDelete = onDelete
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
      'task_deleted',
      'tasks_cleared',
      'checklist_updated',
      'project_created', 'project_updated', 'project_deleted',
      'area_created', 'area_updated', 'area_deleted',
      'context_created', 'context_updated', 'context_deleted',
      'tag_created', 'tag_updated', 'tag_deleted',
      'verb_template_created', 'verb_template_updated', 'verb_template_deleted',
      'calendar_event_created', 'calendar_event_updated', 'calendar_event_deleted',
    ]
    for (const evt of events) {
      this.es!.addEventListener(evt, (event) => {
        let data: Record<string, unknown>
        try {
          data = JSON.parse((event as MessageEvent).data)
          if (!data || typeof data !== 'object') return
        } catch {
          if (import.meta.env.DEV) console.warn('[SyncSSE] Invalid SSE payload for', evt)
          return
        }
        const entityId = extractEntityId(data)
        const resourceType = getResourceTypeFromSSE(evt)

        if (isPushEcho(resourceType ?? 'task', entityId)) return

        if (evt === 'tasks_cleared') {
          this.onPull?.(evt)
          return
        }

        if (evt === 'task_deleted' || evt.endsWith('_deleted')) {
          if (entityId && resourceType) {
            this.onDelete?.(resourceType, entityId)
          }
          return
        }

        this.onPull?.(evt)
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
    if (!userRef.current) return
    await syncMutex.runExclusive(async () => {
      setIsSyncingFn?.(true)
      try {
        await push()
        if (isMountedRef.current) setLastSyncAt(new Date())
      } finally {
        setIsSyncingFn?.(false)
      }
    })
  }, [])

  const doPull = useCallback(async () => {
    if (!userRef.current) return
    await syncMutex.runExclusive(async () => {
      setIsSyncingFn?.(true)
      try {
        await pull(userRef.current!.id)
        if (isMountedRef.current) setLastSyncAt(new Date())
      } finally {
        setIsSyncingFn?.(false)
      }
    })
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

    syncSSE.connect(
      (eventType: string) => {
        if (!userRef.current) return
        if (eventType === 'data_imported') {
          performInitialSync(userRef.current.id)
        } else {
          schedulePull(userRef.current.id, eventType)
        }
      },
      (entityType: EntityType, entityId: string) => {
        deleteLocalEntity(entityType, entityId)
      }
    )

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
