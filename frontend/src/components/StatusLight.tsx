import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSyncStatus } from './SyncContext'
import { useNotificationStore } from '../stores/notificationStore'
import { useAuthStore } from '../stores/authStore'

type Status = 'online' | 'offline' | 'syncing' | 'error' | 'queued' | 'loading'

type Listener = (alive: boolean | null) => void

class BackendHealthChecker {
  private alive: boolean | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<Listener>()
  private checking = false
  private started = false
  private failCount = 0

  private getHealthUrl(): string {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    if (apiBase.startsWith('http')) {
      const url = new URL(apiBase)
      return `${url.origin}/health`
    }
    return '/health'
  }

  private getCheckInterval(): number {
    if (this.failCount === 0) return 10000
    return Math.min(10000 * Math.pow(2, this.failCount - 1), 120000)
  }

  private scheduleNext() {
    if (this.intervalId) clearInterval(this.intervalId)
    this.intervalId = setInterval(() => this.check(), this.getCheckInterval())
  }

  start() {
    if (this.started) return
    this.started = true
    this.check()
    this.scheduleNext()
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.started = false
    this.alive = null
    this.failCount = 0
    this.listeners.clear()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.alive)
    this.start()
    return () => {
      this.listeners.delete(fn)
      if (this.listeners.size === 0) {
        this.stop()
      }
    }
  }

  private async check() {
    if (this.checking) return
    if (!navigator.onLine) {
      this.failCount++
      this.emit(false)
      return
    }
    this.checking = true
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(this.getHealthUrl(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (res.ok) {
        this.failCount = 0
      } else {
        this.failCount++
      }
      this.emit(res.ok)
      this.scheduleNext()
    } catch {
      this.failCount++
      this.emit(false)
      this.scheduleNext()
    } finally {
      this.checking = false
    }
  }

  private emit(value: boolean) {
    const wasAlive = this.alive
    if (wasAlive === value) return
    this.alive = value
    this.listeners.forEach((fn) => fn(value))
    if (value && wasAlive === false) {
      window.dispatchEvent(new CustomEvent('BACKEND_RECOVERED'))
    }
  }
}

const healthChecker = new BackendHealthChecker()

function useBackendAlive(): boolean | null {
  const [alive, setAlive] = useState<boolean | null>(null)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) {
      setAlive(null)
      return
    }

    const unsub = healthChecker.subscribe(setAlive)
    return unsub
  }, [isAuthenticated])

  return alive
}

function useConnectionStatus(): Status {
  const { isOnline, pendingCount, isSyncing } = useSyncStatus()
  const sseState = useNotificationStore((s) => s.sseState)
  const backendAlive = useBackendAlive()

  if (!isOnline) return 'offline'
  if (backendAlive === null) return 'loading'
  if (!backendAlive) return 'error'
  if (isSyncing) return 'syncing'
  if (pendingCount > 0) return 'queued'
  if (sseState === 'error') return 'syncing'
  return 'online'
}

export function StatusLight() {
  const { t } = useTranslation('sync')
  const status = useConnectionStatus()

  const statusLabels: Record<Status, string> = {
    loading: t('checkingConnection'),
    online: t('allSynced'),
    offline: t('offline'),
    syncing: t('syncingLabel'),
    error: t('noServerConnection'),
    queued: t('pendingSync'),
  }

  const statusColors: Record<Status, { color: string; animate: boolean }> = {
    loading: { color: 'bg-gray-400', animate: true },
    online: { color: 'bg-green-500', animate: false },
    offline: { color: 'bg-yellow-500', animate: false },
    syncing: { color: 'bg-blue-500', animate: true },
    error: { color: 'bg-red-500', animate: true },
    queued: { color: 'bg-orange-500', animate: true },
  }

  const { color, animate } = statusColors[status]
  const label = statusLabels[status]

  return (
    <span className="relative inline-flex items-center ml-1.5" title={label}>
      {animate && (
        <span
          className={`absolute inline-flex h-2.5 w-2.5 rounded-full ${color} opacity-75`}
          style={{ animation: 'pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color} ${animate ? 'animate-pulse' : ''}`} />
    </span>
  )
}
