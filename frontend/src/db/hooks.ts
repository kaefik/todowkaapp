import { useState, useEffect, useRef, useCallback } from 'react'
import { db } from './database'

export function useDexieQuery<T>(
  querier: () => T | Promise<T>,
  deps?: unknown[]
) {
  const [result, setResult] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const querierRef = useRef(querier)
  querierRef.current = querier
  const versionRef = useRef(0)

  const execute = useCallback(async () => {
    const v = ++versionRef.current
    try {
      const data = await querierRef.current()
      if (v === versionRef.current) {
        setResult(data)
        setIsLoading(false)
      }
    } catch {
      if (v === versionRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    execute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const handler = () => {
      if (cancelled) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!cancelled) execute()
      }, 50)
    }

    let subscribed = false
    try {
      db.on('changes', handler)
      subscribed = true
    } catch {}

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (subscribed) {
        try {
          db.on('changes').unsubscribe(handler)
        } catch {}
      }
    }
  }, [execute])

  return {
    data: result,
    isLoading,
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
