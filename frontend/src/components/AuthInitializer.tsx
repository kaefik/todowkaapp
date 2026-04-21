import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'

interface AuthInitializerProps {
  children: React.ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const { fetchCurrentUser } = useAuthStore()
  const [initializing, setInitializing] = useState(true)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    fetchCurrentUser()
      .catch(() => {})
      .finally(() => setInitializing(false))
  }, [fetchCurrentUser])

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== 'auth-storage') return
      if (!e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed?.state?.isAuthenticated === false) {
          useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            error: null,
          })
        }
      } catch {}
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
