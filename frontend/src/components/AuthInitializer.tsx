import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { fetchCurrentUser, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      fetchCurrentUser().catch(() => {})
    }
  }, [isAuthenticated, fetchCurrentUser])

  return <>{children}</>
}
