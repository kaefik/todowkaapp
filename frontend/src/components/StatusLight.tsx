import { useEffect, useState } from 'react'
import { useOfflineQueue } from '../hooks/useOfflineQueue'
import { useNotificationStore } from '../stores/notificationStore'
import { useAuthStore } from '../stores/authStore'

type Status = 'online' | 'offline' | 'syncing' | 'error' | 'queued' | 'loading'

const statusConfig: Record<Status, { color: string; label: string; animate: boolean }> = {
  loading: { color: 'bg-gray-400', label: 'Проверка соединения...', animate: true },
  online: { color: 'bg-green-500', label: 'Всё синхронизировано', animate: false },
  offline: { color: 'bg-yellow-500', label: 'Офлайн', animate: false },
  syncing: { color: 'bg-blue-500', label: 'Синхронизация...', animate: true },
  error: { color: 'bg-red-500', label: 'Нет связи с сервером', animate: true },
  queued: { color: 'bg-orange-500', label: 'Ожидает синхронизации', animate: true },
}

type Listener = (alive: boolean | null) => void

class BackendHealthChecker {
  private alive: boolean | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<Listener>()
  private checking = false
  private started = false

  private getHealthUrl(): string {
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
    if (apiBase.startsWith('http')) {
      const url = new URL(apiBase)
      return `${url.origin}/health`
    }
    return '/health'
  }

  start() {
    if (this.started) return
    this.started = true
    this.check()
    this.intervalId = setInterval(() => this.check(), 10000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.started = false
    this.alive = null
    this.listeners.clear()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    fn(this.alive)
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
      this.emit(res.ok)
    } catch {
      this.emit(false)
    } finally {
      this.checking = false
    }
  }

  private emit(value: boolean) {
    if (this.alive === value) return
    this.alive = value
    this.listeners.forEach((fn) => fn(value))
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
  const { isOnline, queueSize, isSyncing } = useOfflineQueue()
  const sseState = useNotificationStore((s) => s.sseState)
  const backendAlive = useBackendAlive()

  if (!isOnline) return 'offline'
  if (backendAlive === null) return 'loading'
  if (!backendAlive) return 'error'
  if (isSyncing) return 'syncing'
  if (sseState === 'error') return 'error'
  if (queueSize > 0) return 'queued'
  return 'online'
}

export function StatusLight() {
  const status = useConnectionStatus()
  const { color, label, animate } = statusConfig[status]

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
