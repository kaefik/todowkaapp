import { create } from 'zustand'
import { notificationsApi } from '../api/notifications'
import type { Notification } from '../api/notifications'
import { sseManager } from '../services/sseManager'
import { useAuthStore } from './authStore'

export type SSEState = 'disconnected' | 'connecting' | 'connected' | 'error'

interface NotificationState {
  notifications: Notification[]
  total: number
  unreadCount: number
  isLoading: boolean
  error: string | null
  sseState: SSEState
  pollingTimerId: ReturnType<typeof setInterval> | null
  pollingDelay: number
  sseDownSince: number | null

  refetch: (params?: { unread_only?: boolean; limit?: number; offset?: number }) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  startSSE: (userId: string) => void
  stopSSE: () => void
  _startPolling: () => void
  _stopPolling: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  total: 0,
  unreadCount: 0,
  isLoading: false,
  error: null,
  sseState: 'disconnected',
  pollingTimerId: null,
  pollingDelay: 30000,
  sseDownSince: null,

  _startPolling: () => {
    const state = get()
    if (state.pollingTimerId) return
    const auth = useAuthStore.getState()
    if (!auth.accessToken) return

    const delay = get().pollingDelay
    const timerId = setInterval(() => {
      get().refetch({ limit: 5 })
      const currentDelay = get().pollingDelay
      set({ pollingDelay: Math.min(currentDelay * 2, 120000) })
    }, delay)
    set({ pollingTimerId: timerId })
  },

  _stopPolling: () => {
    const timerId = get().pollingTimerId
    if (timerId) {
      clearInterval(timerId)
      set({ pollingTimerId: null, pollingDelay: 30000, sseDownSince: null })
    }
  },

  refetch: async (params) => {
    console.log('Fetching notifications with params:', params)
    set({ isLoading: true, error: null })
    try {
      const data = await notificationsApi.getAll(params)
      console.log('Notifications fetched:', { items: data.items.length, total: data.total, unread_count: data.unread_count })
      set({
        notifications: data.items,
        total: data.total,
        unreadCount: data.unread_count,
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load notifications',
      })
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id)
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to mark notification as read',
      })
      throw err
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead()
      set({
        notifications: (get().notifications).map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to mark all as read',
      })
      throw err
    }
  },

  deleteNotification: async (id) => {
    try {
      await notificationsApi.deleteNotification(id)
      const deleted = get().notifications.find((n) => n.id === id)
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        total: Math.max(0, state.total - 1),
        unreadCount: deleted && !deleted.is_read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete notification',
      })
      throw err
    }
  },

  startSSE: (userId) => {
    set({ sseState: 'connecting' })
    const token = useAuthStore.getState().accessToken
    sseManager.connect(userId, {
      onMessage: (message) => {
        console.log('SSE message received in store:', message)
        if (message.event === 'notification') {
          console.log('Calling refetch due to notification event')
          get().refetch()
          try {
            const data = JSON.parse(message.data)
            if (data?.type === 'queue_overflow') {
              get().refetch()
            } else if (data?.data?.type === 'due_reminder' && data?.data?.task_id) {
              window.dispatchEvent(new CustomEvent('task:reminder-fired', {
                detail: { taskId: data.data.task_id }
              }))
            }
          } catch {}
        }
      },
      onStateChange: (state) => {
        console.log('SSE state changed:', state)
        set({ sseState: state })
        if (state === 'connected') {
          get()._stopPolling()
        } else if (state === 'error' || state === 'disconnected') {
          if (!get().sseDownSince) {
            set({ sseDownSince: Date.now() })
          }
          if (!get().pollingTimerId) {
            const sseDownSince = get().sseDownSince || Date.now()
            const elapsed = Date.now() - sseDownSince
            if (elapsed >= 30000) {
              get()._startPolling()
            } else {
              setTimeout(() => {
                if (get().sseState === 'error' || get().sseState === 'disconnected') {
                  get()._startPolling()
                }
              }, 30000 - elapsed)
            }
          }
        }
      },
      onError: (error) => {
        console.error('SSE error:', error)
        set({ sseState: 'error' })
      },
    }, token || undefined)
  },

  stopSSE: () => {
    sseManager.disconnect()
    get()._stopPolling()
    set({ sseState: 'disconnected' })
  },
}))
