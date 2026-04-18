import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useToastStore } from '../stores/toastStore'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'
import { taskKeys } from '../hooks/useTasks'

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuthStore()
  const store = useNotificationStore()
  const { showReminder, enabled } = useBrowserNotifications()
  const addToast = useToastStore((s) => s.addToast)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isAuthenticated && user) {
      store.startSSE(user.id)
      store.refetch()
      return () => store.stopSSE()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!enabled) return

    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent
      const { taskId } = customEvent.detail || {}
      if (!taskId) return

      queryClient.invalidateQueries({ queryKey: taskKeys.all })

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
