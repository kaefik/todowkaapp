import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { fetchCurrentUser, isAuthenticated } = useAuthStore()
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (isAuthenticated) {
      setInitializing(false)
      return
    }
    fetchCurrentUser()
      .catch(() => {})
      .finally(() => setInitializing(false))
  }, [fetchCurrentUser, isAuthenticated])

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
