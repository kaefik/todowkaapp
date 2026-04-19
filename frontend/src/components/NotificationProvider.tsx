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
      activeSSEUserId = user.id
      store.startSSE(user.id)
      store.refetch()
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
    if (!enabled) return

    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent
      const { taskId } = customEvent.detail || {}
      if (!taskId) return

      const notifications = useNotificationStore.getState().notifications
      const notification = notifications.find(
        (n) => n.task_id === taskId && !n.is_read
      )

      const taskTitle = notification?.message || 'Напоминание'
      const ok = await showReminder(taskTitle, taskId)
      if (!ok) {
        addToast({
          title: 'Напоминание о задаче',
          body: taskTitle,
          type: 'reminder',
          taskId,
        })
      }
    }

    window.addEventListener('task:reminder-fired', handler)
    return () => window.removeEventListener('task:reminder-fired', handler)
  }, [enabled, showReminder, addToast])

  return <>{children}</>
}
