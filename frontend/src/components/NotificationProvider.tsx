import { useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useToastStore } from '../stores/toastStore'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'

interface NotificationProviderProps {
  children: React.ReactNode
}

let activeSSEUserId: string | null = null

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuthStore()
  const store = useNotificationStore()
  const { showReminder, enabled } = useBrowserNotifications()
  const addToast = useToastStore((s) => s.addToast)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (isAuthenticated && user && user.id !== activeSSEUserId) {
      if (navigator.onLine) {
        activeSSEUserId = user.id
        store.startSSE(user.id)
        store.refetch()
      }
    }
    if (!isAuthenticated && activeSSEUserId) {
      activeSSEUserId = null
      store.stopSSE()
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
        store.startSSE(u.id)
        store.refetch()
      }
    }
    const handleOffline = () => {
      if (activeSSEUserId) {
        store.stopSSE()
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
    console.log('[NotificationProvider] Setting up reminder handler')
    const isSupported = typeof Notification !== 'undefined'
    console.log('[NotificationProvider] Notification API supported:', isSupported, 'Browser notifications enabled:', enabled)

    const handler = async (e: Event) => {
      console.log('[NotificationProvider] === Reminder Event Start ===')
      const customEvent = e as CustomEvent
      const { taskId, notificationData } = customEvent.detail || {}
      console.log('[NotificationProvider] task:reminder-fired event', { taskId, notificationData, enabled, isSupported })

      if (!taskId) {
        console.warn('[NotificationProvider] No taskId in event')
        return
      }

      let taskTitle = 'Напоминание'

      if (notificationData?.message) {
        taskTitle = notificationData.message
        console.log('[NotificationProvider] Using message from notificationData:', taskTitle)
      } else {
        const notifications = useNotificationStore.getState().notifications
        const notification = notifications.find(
          (n) => n.task_id === taskId && !n.is_read
        )
        if (notification?.message) {
          taskTitle = notification.message
          console.log('[NotificationProvider] Using message from store:', taskTitle)
        } else {
          console.warn('[NotificationProvider] No message found in notificationData or store')
        }
      }

      console.log('[NotificationProvider] Will show:', { isSupported, enabled, taskTitle })

      try {
        if (isSupported && enabled) {
          console.log('[NotificationProvider] Showing browser notification')
          const ok = await showReminder(taskTitle, taskId)
          if (!ok) {
            console.log('[NotificationProvider] Browser notification failed, showing toast')
            addToast({
              title: 'Напоминание о задаче',
              body: taskTitle,
              type: 'reminder',
              taskId,
            })
          } else {
            console.log('[NotificationProvider] Browser notification shown successfully')
          }
        } else {
          console.log('[NotificationProvider] Browser notifications disabled or not supported, showing toast')
          addToast({
            title: 'Напоминание о задаче',
            body: taskTitle,
            type: 'reminder',
            taskId,
          })
        }
      } catch (error) {
        console.error('[NotificationProvider] Error showing notification:', error)
        addToast({
          title: 'Напоминание о задаче',
          body: taskTitle,
          type: 'reminder',
          taskId,
        })
      }

      console.log('[NotificationProvider] === Reminder Event End ===')
    }

    window.addEventListener('task:reminder-fired', handler)
    return () => {
      console.log('[NotificationProvider] Cleaning up reminder handler')
      window.removeEventListener('task:reminder-fired', handler)
    }
  }, [enabled, showReminder, addToast])

  return <>{children}</>
}
