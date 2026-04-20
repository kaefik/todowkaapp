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
  pollingInterval: number | null
  pollingDelay: number
  sseDownSince: number | null

  refetch: (params?: { unread_only?: boolean; limit?: number; offset?: number }) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
  startSSE: (userId: string) => void
  stopSSE: () => void
  startPolling: () => void
  stopPolling: () => void
  cleanup: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  total: 0,
  unreadCount: 0,
  isLoading: false,
  error: null,
  sseState: 'disconnected',
  pollingInterval: null,
  pollingDelay: 30000,
  sseDownSince: null,

  startPolling: () => {
    const state = get()
    if (state.pollingInterval) {
      console.log('[NotificationStore] Polling already running')
      return
    }
    const auth = useAuthStore.getState()
    if (!auth.accessToken) {
      console.log('[NotificationStore] Cannot start polling: no access token')
      return
    }

    console.log('[NotificationStore] Starting polling')
    get().refetch({ limit: 5 })
    const intervalId = setInterval(() => {
      console.log('[NotificationStore] Polling tick')
      get().refetch({ limit: 5 })
      const currentDelay = get().pollingDelay
      set({ pollingDelay: Math.min(currentDelay * 2, 120000) })
    }, 30000)
    set({ pollingInterval: intervalId })
  },

  stopPolling: () => {
    const intervalId = get().pollingInterval
    if (intervalId) {
      console.log('[NotificationStore] Stopping polling')
      clearInterval(intervalId)
      set({ pollingInterval: null, pollingDelay: 30000, sseDownSince: null })
    } else {
      console.log('[NotificationStore] Polling not running')
    }
  },

  refetch: async (params) => {
    console.log('[NotificationStore] Refetching notifications...', params)
    set({ isLoading: true, error: null })
    try {
      const data = await notificationsApi.getAll(params)
      console.log('[NotificationStore] Notifications loaded:', {
        count: data.items.length,
        total: data.total,
        unreadCount: data.unread_count
      })
      set({
        notifications: data.items,
        total: data.total,
        unreadCount: data.unread_count,
        isLoading: false,
      })
    } catch (err) {
      console.error('[NotificationStore] Failed to fetch notifications:', err)
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
        console.log('[NotificationStore] SSE event:', { event: message.event, data: message.data })
        if (message.event === 'notification') {
          console.log('[NotificationStore] Notification event received, calling refetch')
          get().refetch()
          try {
            const data = JSON.parse(message.data)
            console.log('[NotificationStore] SSE data parsed:', data)

            if (!data || typeof data !== 'object') {
              console.warn('[NotificationStore] Invalid data structure received:', data)
              return
            }

            if (data?.type === 'queue_overflow') {
              console.log('[NotificationStore] Queue overflow detected, refetching')
              get().refetch()
            } else if (data?.data?.type === 'due_reminder' && data?.data?.task_id) {
              const notificationData = data?.data?.notification_data
              console.log('[NotificationStore] Due reminder fired:', { taskId: data.data.task_id, notificationData })
              window.dispatchEvent(new CustomEvent('task:reminder-fired', {
                detail: {
                  taskId: data.data.task_id,
                  notificationData: notificationData
                }
              }))
            } else {
              console.warn('[NotificationStore] Unknown event type:', data?.data?.type)
            }
          } catch (error) {
            console.error('[NotificationStore] Failed to parse SSE message:', error, 'Raw data:', message.data)
          }
        }
      },
      onStateChange: (state) => {
        console.log('[NotificationStore] SSE state changed:', state)
        set({ sseState: state })
        if (state === 'connected') {
          get().stopPolling()
        } else if (state === 'error' || state === 'disconnected') {
          if (!get().sseDownSince) {
            set({ sseDownSince: Date.now() })
          }
          if (!get().pollingInterval) {
            const sseDownSince = get().sseDownSince || Date.now()
            const elapsed = Date.now() - sseDownSince
            if (elapsed >= 30000) {
              get().startPolling()
            } else {
              setTimeout(() => {
                if (get().sseState === 'error' || get().sseState === 'disconnected') {
                  get().startPolling()
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
    console.log('[NotificationStore] Stopping SSE')
    sseManager.disconnect()
    get().stopPolling()
    set({ sseState: 'disconnected' })
  },

  cleanup: () => {
    console.log('[NotificationStore] Cleanup called')
    get().stopPolling()
  },
}))
