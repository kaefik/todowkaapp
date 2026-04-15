import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuthStore()
  const store = useNotificationStore()

  useEffect(() => {
    if (isAuthenticated && user) {
      store.startSSE(user.id)
      store.refetch()
      return () => store.stopSSE()
    }
  }, [isAuthenticated, user, store])

  return <>{children}</>
}
