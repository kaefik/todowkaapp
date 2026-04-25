import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

export function useDexieQuery<T>(
  querier: () => T | Promise<T>,
  deps?: unknown[]
) {
  const data = useLiveQuery(querier, deps)
  return {
    data,
    isLoading: data === undefined,
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
