import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useToastStore } from '../stores/toastStore'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'

interface NotificationProviderProps {
  children: React.ReactNode
}

let activeSSEUserId: string | null = null

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { t } = useTranslation('notifications')
  const { isAuthenticated, user } = useAuthStore()
  const store = useNotificationStore()
  const storeRef = useRef(store)
  storeRef.current = store
  const { showReminder, enabled } = useBrowserNotifications()
  const addToast = useToastStore((s) => s.addToast)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (isAuthenticated && user && user.id !== activeSSEUserId) {
      if (navigator.onLine) {
        activeSSEUserId = user.id
        storeRef.current.startSSE(user.id)
        storeRef.current.refetch()
      }
    }
    if (!isAuthenticated && activeSSEUserId) {
      activeSSEUserId = null
      storeRef.current.stopSSE()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      if (!mountedRef.current) return
      const { isAuthenticated: authed, user: u } = useAuthStore.getState()
      if (authed && u && !activeSSEUserId) {
        activeSSEUserId = u.id
        storeRef.current.startSSE(u.id)
        storeRef.current.refetch()
      }
    }
    const handleOffline = () => {
      if (activeSSEUserId) {
        storeRef.current.stopSSE()
        activeSSEUserId = null
      }
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const isSupported = typeof Notification !== 'undefined'

    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent
      const { taskId, notificationData } = customEvent.detail || {}

      if (!taskId) {
        if (import.meta.env.DEV) console.warn('[NotificationProvider] No taskId in event')
        return
      }

      let taskTitle = t('reminder')

      if (notificationData?.message) {
        taskTitle = notificationData.message
      } else {
        const notifications = useNotificationStore.getState().notifications
        const notification = notifications.find(
          (n) => n.task_id === taskId && !n.is_read
        )
        if (notification?.message) {
          taskTitle = notification.message
        }
      }

      try {
        if (isSupported && enabled) {
          const ok = await showReminder(taskTitle, taskId)
          if (!ok) {
            addToast({
              title: t('taskReminder'),
              body: taskTitle,
              type: 'reminder',
              taskId,
            })
          }
        } else {
          addToast({
            title: t('taskReminder'),
            body: taskTitle,
            type: 'reminder',
            taskId,
          })
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('[NotificationProvider] Error showing notification:', error)
        addToast({
          title: t('taskReminder'),
          body: taskTitle,
          type: 'reminder',
          taskId,
        })
      }
    }

    window.addEventListener('task:reminder-fired', handler)
    return () => {
      window.removeEventListener('task:reminder-fired', handler)
    }
  }, [enabled, showReminder, addToast, t])

  return <>{children}</>
}
