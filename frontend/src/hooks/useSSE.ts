import { useState, useEffect, useRef, useCallback } from 'react'

type SSEState = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface SSEMessage {
  event: string
  data: string
}

export interface SSEConnection {
  connect: () => void
  disconnect: () => void
  state: SSEState
}

export function useSSE() {
  const [notificationState, setNotificationState] = useState<SSEState>('disconnected')
  const [syncState, setSyncState] = useState<SSEState>('disconnected')
  
  const notificationEventSourceRef = useRef<EventSource | null>(null)
  const syncEventSourceRef = useRef<EventSource | null>(null)
  const notificationRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const notificationRetryDelayRef = useRef(1000)
  const syncRetryDelayRef = useRef(1000)
  const maxRetryDelay = 30000
  
  const notificationParamsRef = useRef<{
    userId: string
    onMessage: (message: SSEMessage) => void
    onError?: (error: Error) => void
  } | null>(null)
  
  const syncParamsRef = useRef<{
    onMessage: (message: SSEMessage) => void
    onError?: (error: Error) => void
  } | null>(null)
  
  const clearNotificationRetryRef = useRef<(() => void) | null>(null)
  const clearSyncRetryRef = useRef<(() => void) | null>(null)

  clearNotificationRetryRef.current = () => {
    if (notificationRetryTimeoutRef.current) {
      clearTimeout(notificationRetryTimeoutRef.current)
      notificationRetryTimeoutRef.current = null
    }
  }

  clearSyncRetryRef.current = () => {
    if (syncRetryTimeoutRef.current) {
      clearTimeout(syncRetryTimeoutRef.current)
      syncRetryTimeoutRef.current = null
    }
  }

  const connectNotificationsRef = useRef<(() => void) | null>(null)
  const connectSyncRef = useRef<(() => void) | null>(null)

  connectNotificationsRef.current = () => {
    const params = notificationParamsRef.current
    if (!params) return

    if (clearNotificationRetryRef.current) {
      clearNotificationRetryRef.current()
    }
    
    if (notificationEventSourceRef.current) {
      notificationEventSourceRef.current.close()
    }

    setNotificationState('connecting')

    const url = new URL('/api/sse/notifications', window.location.origin)
    
    const eventSource = new EventSource(url.toString())
    notificationEventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setNotificationState('connected')
      notificationRetryDelayRef.current = 1000
    }

    eventSource.onmessage = () => {
    }

    eventSource.addEventListener('notification', (event) => {
      params.onMessage({
        event: 'notification',
        data: event.data
      })
    })

    eventSource.addEventListener('error', () => {
      setNotificationState('error')
      eventSource.close()
      notificationEventSourceRef.current = null

      const error = new Error('SSE connection error')
      if (params.onError) {
        params.onError(error)
      }

      const delay = notificationRetryDelayRef.current
      notificationRetryDelayRef.current = Math.min(delay * 2, maxRetryDelay)
      
      notificationRetryTimeoutRef.current = setTimeout(() => {
        if (connectNotificationsRef.current) {
          connectNotificationsRef.current()
        }
      }, delay)
    })
  }

  connectSyncRef.current = () => {
    const params = syncParamsRef.current
    if (!params) return

    if (clearSyncRetryRef.current) {
      clearSyncRetryRef.current()
    }
    
    if (syncEventSourceRef.current) {
      syncEventSourceRef.current.close()
    }

    setSyncState('connecting')

    const url = new URL('/api/sse/sync', window.location.origin)
    
    const eventSource = new EventSource(url.toString())
    syncEventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setSyncState('connected')
      syncRetryDelayRef.current = 1000
    }

    eventSource.onmessage = () => {
    }

    eventSource.addEventListener('task_updated', (event) => {
      params.onMessage({
        event: 'task_updated',
        data: event.data
      })
    })

    eventSource.addEventListener('error', () => {
      setSyncState('error')
      eventSource.close()
      syncEventSourceRef.current = null

      const error = new Error('SSE connection error')
      if (params.onError) {
        params.onError(error)
      }

      const delay = syncRetryDelayRef.current
      syncRetryDelayRef.current = Math.min(delay * 2, maxRetryDelay)
      
      syncRetryTimeoutRef.current = setTimeout(() => {
        if (connectSyncRef.current) {
          connectSyncRef.current()
        }
      }, delay)
    })
  }

  const subscribeToNotifications = useCallback((
    userId: string,
    onMessage: (message: SSEMessage) => void,
    onError?: (error: Error) => void
  ) => {
    notificationParamsRef.current = { userId, onMessage, onError }
    if (connectNotificationsRef.current) {
      connectNotificationsRef.current()
    }

    return () => {
      if (clearNotificationRetryRef.current) {
        clearNotificationRetryRef.current()
      }
      if (notificationEventSourceRef.current) {
        notificationEventSourceRef.current.close()
        notificationEventSourceRef.current = null
      }
      notificationParamsRef.current = null
    }
  }, [])

  const subscribeToSync = useCallback((
    onMessage: (message: SSEMessage) => void,
    onError?: (error: Error) => void
  ) => {
    syncParamsRef.current = { onMessage, onError }
    if (connectSyncRef.current) {
      connectSyncRef.current()
    }

    return () => {
      if (clearSyncRetryRef.current) {
        clearSyncRetryRef.current()
      }
      if (syncEventSourceRef.current) {
        syncEventSourceRef.current.close()
        syncEventSourceRef.current = null
      }
      syncParamsRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (clearNotificationRetryRef.current) {
        clearNotificationRetryRef.current()
      }
      if (clearSyncRetryRef.current) {
        clearSyncRetryRef.current()
      }
      if (notificationEventSourceRef.current) {
        notificationEventSourceRef.current.close()
      }
      if (syncEventSourceRef.current) {
        syncEventSourceRef.current.close()
      }
    }
  }, [])

  return {
    subscribeToNotifications,
    subscribeToSync,
    notificationState,
    syncState,
  }
}
