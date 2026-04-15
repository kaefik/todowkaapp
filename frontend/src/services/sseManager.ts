export type SSEState = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SSEMessage {
  event: string
  data: string
}

export interface SSEManagerCallbacks {
  onMessage: (message: SSEMessage) => void
  onStateChange?: (state: SSEState) => void
  onError?: (error: Error) => void
}

class SSEManager {
  private eventSource: EventSource | null = null
  private currentUserId: string | null = null
  private retryTimeout: NodeJS.Timeout | null = null
  private retryDelay: number = 1000
  private readonly maxRetryDelay: number = 30000
  private callbacks: SSEManagerCallbacks | null = null

  connect(userId: string, callbacks: SSEManagerCallbacks) {
    this.disconnect()

    this.currentUserId = userId
    this.callbacks = callbacks

    this.setState('connecting')
    this.openConnection()
  }

  private openConnection() {
    if (!this.currentUserId || !this.callbacks) {
      return
    }

    const url = new URL('/api/sse/notifications', window.location.origin)
    
    this.eventSource = new EventSource(url.toString())

    this.eventSource.onopen = () => {
      this.retryDelay = 1000
      this.setState('connected')
    }

    this.eventSource.onmessage = () => {
    }

    this.eventSource.addEventListener('notification', (event) => {
      if (this.callbacks) {
        this.callbacks.onMessage({
          event: 'notification',
          data: event.data,
        })
      }
    })

    this.eventSource.addEventListener('error', () => {
      this.setState('error')
      this.closeConnection()

      const error = new Error('SSE connection error')
      if (this.callbacks?.onError) {
        this.callbacks.onError(error)
      }

      this.scheduleReconnect()
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

  disconnect() {
    this.closeConnection()
    this.currentUserId = null
    this.callbacks = null
    this.retryDelay = 1000
  }

  private setState(state: SSEState) {
    if (this.callbacks?.onStateChange) {
      this.callbacks.onStateChange(state)
    }
  }
}

export const sseManager = new SSEManager()
