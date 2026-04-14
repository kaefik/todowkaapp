import { useState, useEffect, useCallback } from 'react'
import { ApiError } from '../api/httpClient'
import { notificationsApi } from '../api/notifications'
import type { Notification } from '../api/notifications'
import { useSSE } from './useSSE'
import { useAuthStore } from '../stores/authStore'

export const NOTIFICATIONS_CHANGED_EVENT = 'todowka:notifications-changed'

export function notifyNotificationsChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
}

interface UseNotificationsReturn {
  notifications: Notification[]
  total: number
  unreadCount: number
  isLoading: boolean
  error: string | null
  refetch: (params?: { unread_only?: boolean; limit?: number; offset?: number }) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const user = useAuthStore((state) => state.user)
  const { subscribeToNotifications } = useSSE()

  const refetch = useCallback(async (params?: { unread_only?: boolean; limit?: number; offset?: number }) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await notificationsApi.getAll(params)
      setNotifications(data.items)
      setTotal(data.total)
      setUnreadCount(data.unread_count)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load notifications')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const handler = () => refetch()
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler)
  }, [refetch])

  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToNotifications(
      user.id,
      (message) => {
        if (message.event === 'notification') {
          refetch()
        }
      },
      (error) => {
        console.error('SSE notification error:', error)
      }
    )

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user, subscribeToNotifications, refetch])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
      notifyNotificationsChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      }
      throw err
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      notifyNotificationsChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      }
      throw err
    }
  }, [])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId)
      const deleted = notifications.find((n) => n.id === notificationId)
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      setTotal((prev) => Math.max(0, prev - 1))
      if (deleted && !deleted.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      }
      throw err
    }
  }, [notifications])

  return {
    notifications,
    total,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
