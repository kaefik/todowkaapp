import { useSSEStore } from '../stores/sseStore'

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

const logger = {
  info: (msg: string, data?: unknown) => console.log(`[SSE] [INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  warn: (msg: string, data?: unknown) => console.warn(`[SSE] [WARN] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg: string, data?: unknown) => console.error(`[SSE] [ERROR] ${new Date().toISOString()} - ${msg}`, data || ''),
  debug: (msg: string, data?: unknown) => console.debug(`[SSE] [DEBUG] ${new Date().toISOString()} - ${msg}`, data || ''),
}

class SSEManager {
  private eventSource: EventSource | null = null
  private currentUserId: string | null = null
  private retryTimeout: NodeJS.Timeout | null = null
  private retryDelay: number = 1000
  private readonly maxRetryDelay: number = 30000
  private callbacks: SSEManagerCallbacks | null = null
  private reconnectAttempts: number = 0
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private backendRecoveredHandler: (() => void) | null = null

  private token: string | null = null

  connect(userId: string, callbacks: SSEManagerCallbacks, token?: string) {
    this.disconnect()

    this.currentUserId = userId
    this.callbacks = callbacks
    this.token = token || null
    this.reconnectAttempts = 0

    if (!this.backendRecoveredHandler) {
      this.backendRecoveredHandler = () => {
        if (!this.currentUserId || !this.callbacks) return
        logger.info('Backend recovered, reconnecting SSE')
        this.reconnectAttempts = 0
        this.retryDelay = 1000
        this.closeConnection()
        this.setState('connecting')
        this.openConnection()
      }
      window.addEventListener('BACKEND_RECOVERED', this.backendRecoveredHandler)
    }

    const sseStore = useSSEStore.getState()
    sseStore.resetAttempts()
    sseStore.updateStatus('connecting')

    logger.info('Connecting to SSE', { userId, attempt: this.reconnectAttempts + 1 })
    this.setState('connecting')
    this.openConnection()
  }

  private openConnection() {
    if (!this.currentUserId || !this.callbacks) {
      return
    }

    let sseUrl: string
    if (import.meta.env.DEV) {
      sseUrl = 'http://127.0.0.1:8000/api/sse/notifications'
    } else {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'
      if (apiBaseUrl.startsWith('http')) {
        const apiUrl = new URL(apiBaseUrl)
        sseUrl = `${apiUrl.origin}${apiUrl.pathname}/sse/notifications`
      } else {
        sseUrl = `${apiBaseUrl}/sse/notifications`
      }
    }

    if (this.token) {
      const sep = sseUrl.includes('?') ? '&' : '?'
      sseUrl = `${sseUrl}${sep}token=${encodeURIComponent(this.token)}`
    }

    logger.debug('Opening SSE connection', { url: sseUrl, userId: this.currentUserId })
    
    const sseStore = useSSEStore.getState()
    sseStore.recordConnectionStart()

    this.eventSource = new EventSource(sseUrl, { withCredentials: true })

    this.eventSource.onopen = () => {
      this.retryDelay = 1000
      this.reconnectAttempts = 0
      
      sseStore.updateStatus('connected')
      sseStore.resetAttempts()
      
      const duration = sseStore.currentConnectionStartTime 
        ? Date.now() - sseStore.currentConnectionStartTime 
        : 0
      logger.info('SSE connection established', { url: sseUrl, duration: `${duration}ms` })
      
      this.setState('connected')
    }

    this.eventSource.onmessage = () => {
    }

    this.eventSource.addEventListener('notification', (event) => {
      logger.debug('SSE message received', { event: 'notification', data: event.data })
      if (this.callbacks) {
        this.callbacks.onMessage({
          event: 'notification',
          data: event.data,
        })
      }
    })

    this.eventSource.addEventListener('error', () => {
      const error = new Error('SSE connection error')
      
      sseStore.updateStatus('error')
      sseStore.recordError(error.message)
      sseStore.recordConnectionEnd()
      
      const duration = sseStore.currentConnectionStartTime 
        ? Date.now() - sseStore.currentConnectionStartTime 
        : 0
      logger.error('SSE connection error', { 
        error: error.message, 
        attempt: this.reconnectAttempts,
        duration: `${duration}ms`,
        url: sseUrl
      })
      
      this.setState('error')
      this.closeConnection()

      if (this.callbacks?.onError) {
        this.callbacks.onError(error)
      }

      this.scheduleReconnect()
    })
  }

  private scheduleReconnect() {
    this.reconnectAttempts++

    const sseStore = useSSEStore.getState()
    sseStore.incrementAttempts()

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      sseStore.recordError('SSE reconnect limit reached')
      logger.error('SSE reconnect limit reached', { 
        attempts: this.reconnectAttempts, 
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS 
      })
      this.setState('error')
      return
    }

    const delay = this.retryDelay
    this.retryDelay = Math.min(delay * 2, this.maxRetryDelay)

    sseStore.updateStatus('connecting')

    logger.info('Scheduling reconnect', { 
      attempt: this.reconnectAttempts, 
      delay: `${delay}ms`,
      nextDelay: `${this.retryDelay}ms`
    })

    this.retryTimeout = setTimeout(() => {
      this.setState('connecting')
      this.openConnection()
    }, delay)
  }

  private closeConnection() {
    if (this.eventSource) {
      const sseStore = useSSEStore.getState()
      const duration = sseStore.currentConnectionStartTime 
        ? Date.now() - sseStore.currentConnectionStartTime 
        : 0
      
      logger.info('Closing SSE connection', { 
        userId: this.currentUserId,
        duration: `${duration}ms`
      })
      
      sseStore.updateStatus('disconnected')
      sseStore.recordConnectionEnd()
      
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
      this.retryTimeout = null
    }
  }

  disconnect() {
    const sseStore = useSSEStore.getState()
    sseStore.updateStatus('disconnected')
    
    logger.info('Disconnecting from SSE', { userId: this.currentUserId })
    this.closeConnection()
    this.currentUserId = null
    this.callbacks = null
    this.token = null
    this.retryDelay = 1000
    this.reconnectAttempts = 0

    if (this.backendRecoveredHandler) {
      window.removeEventListener('BACKEND_RECOVERED', this.backendRecoveredHandler)
      this.backendRecoveredHandler = null
    }
  }

  resetReconnectAttempts(): void {
    const sseStore = useSSEStore.getState()
    sseStore.resetAttempts()
    logger.info('Resetting reconnect attempts', { previousAttempts: this.reconnectAttempts })
    this.reconnectAttempts = 0
  }

  private setState(state: SSEState) {
    logger.debug('SSE state changed', { from: this.getCurrentState(), to: state })
    if (this.callbacks?.onStateChange) {
      this.callbacks.onStateChange(state)
    }
  }

  private getCurrentState(): SSEState {
    if (!this.eventSource) return 'disconnected'
    if (this.eventSource.readyState === EventSource.CONNECTING) return 'connecting'
    if (this.eventSource.readyState === EventSource.OPEN) return 'connected'
    return 'error'
  }
}

export const sseManager = new SSEManager()
