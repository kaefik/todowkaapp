export type SSEState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SSEMessage {
  event: string
  data: string
}

export interface SSESyncManagerCallbacks {
  onSync?: (data: unknown) => void
  onStateChange?: (state: SSEState) => void
  onError?: (error: Error) => void
}

class SSESyncManager {
  private eventSource: EventSource | null = null
  private currentUserId: string | null = null
  private retryTimeout: NodeJS.Timeout | null = null
  private retryDelay: number = 1000
  private readonly maxRetryDelay: number = 30000
  private retryCount: number = 0
  private readonly maxRetries: number = 5
  private callbacks: SSESyncManagerCallbacks | null = null

  private token: string | null = null

  connect(userId: string, callbacks: SSESyncManagerCallbacks, token?: string) {
    this.disconnect()

    this.currentUserId = userId
    this.callbacks = callbacks
    this.token = token || null

    this.setState('connecting')
    this.openConnection()
  }

  private openConnection() {
    if (!this.currentUserId || !this.callbacks) {
      return
    }

    let sseUrl: string
    if (import.meta.env.DEV) {
      sseUrl = 'http://127.0.0.1:8000/api/sse/sync'
    } else {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
      if (apiBaseUrl.startsWith('http')) {
        const apiUrl = new URL(apiBaseUrl)
        sseUrl = `${apiUrl.origin}${apiUrl.pathname}/sse/sync`
      } else {
        sseUrl = `${apiBaseUrl}/sse/sync`
      }
    }

    if (this.token) {
      const sep = sseUrl.includes('?') ? '&' : '?'
      sseUrl = `${sseUrl}${sep}token=${encodeURIComponent(this.token)}`
    }
    
    console.log('Connecting to SSE Sync:', sseUrl)
    
    this.eventSource = new EventSource(sseUrl, { withCredentials: true })

    this.eventSource.onopen = () => {
      this.retryDelay = 1000
      this.retryCount = 0
      this.setState('connected')
      console.log('SSE Sync: Connected successfully')
    }

    this.eventSource.onmessage = () => {
    }

    this.eventSource.addEventListener('sync', (event) => {
      console.log('SSE sync received:', event.data)
      try {
        const data = JSON.parse(event.data)
        if (this.callbacks?.onSync) {
          this.callbacks.onSync(data)
        }
      } catch (error) {
        console.error('Failed to parse sync data:', error)
      }
    })

    this.eventSource.addEventListener('error', () => {
      this.setState('error')
      this.closeConnection()

      const error = new Error('SSE sync connection error')
      if (this.callbacks?.onError) {
        this.callbacks.onError(error)
      }

      if (navigator.onLine) {
        this.scheduleReconnect()
      } else {
        console.log('SSE Sync: Browser is offline, skipping reconnection')
      }
    })
  }

  private scheduleReconnect() {
    const delay = this.retryDelay
    this.retryDelay = Math.min(delay * 2, this.maxRetryDelay)

    this.retryTimeout = setTimeout(() => {
      this.setState('connecting')
      this.openConnection()
    }, delay)
  }

  private closeConnection() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
  }

  private scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.log('SSE Sync: Max retries reached, stopping reconnection')
      this.setState('error')
      return
    }

    this.retryCount++
    const delay = this.retryDelay
    this.retryDelay = Math.min(delay * 2, this.maxRetryDelay)

    console.log(`SSE Sync: Scheduling reconnect attempt ${this.retryCount}/${this.maxRetries} in ${delay}ms`)

    this.retryTimeout = setTimeout(() => {
      this.setState('connecting')
      this.openConnection()
    }, delay)
  }

  disconnect() {
    this.closeConnection()
    this.currentUserId = null
    this.callbacks = null
    this.token = null
    this.retryDelay = 1000
    this.retryCount = 0
  }

  private setState(state: SSEState) {
    if (this.callbacks?.onStateChange) {
      this.callbacks.onStateChange(state)
    }
  }
}

export const sseSyncManager = new SSESyncManager()
