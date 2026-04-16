import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import { getCache, setCache } from '../lib/indexedDB'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

interface RequestConfig extends RequestInit {
  skipAuth?: boolean
}

interface ApiResponse<T = unknown> {
  data: T
  status: number
  statusText: string
}

class ApiError extends Error {
  status: number
  statusText: string

  constructor(status: number, statusText: string, message: string) {
    super(message)
    this.status = status
    this.statusText = statusText
    this.name = 'ApiError'
  }
}

class OfflineQueueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OfflineQueueError'
  }
}

interface Mutation {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  body?: string
  timestamp: number
  retryCount: number
}

let queueMutationFn: ((mutation: Mutation) => Promise<void>) | null = null

export const setQueueMutationFn = (fn: typeof queueMutationFn) => {
  queueMutationFn = fn
}

let isRefreshing = false
let refreshPromise: Promise<void> | null = null
let hasShownOfflineToast = false

async function fetchWithAuth<T>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const authStore = useAuthStore.getState()
  const { skipAuth, ...fetchConfig } = config

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchConfig.headers as Record<string, string>),
  }

  if (!skipAuth && authStore.accessToken) {
    headers['Authorization'] = `Bearer ${authStore.accessToken}`
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

  try {
    if (config.method === 'GET' || !config.method) {
      const cached = await getCache<T>(fullUrl)
      if (cached) {
        console.log('[Cache] Using cached data for:', fullUrl)
        fetch(fullUrl, { ...fetchConfig, headers })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json()
              await setCache(fullUrl, data)
            }
          })
          .catch(console.error)
        return { data: cached, status: 200, statusText: 'OK' }
      }
    }

    const response = await fetch(fullUrl, {
      ...fetchConfig,
      headers,
    })

    if (response.status === 401 && !skipAuth) {
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorMessage
      } catch {
      }

      if (errorMessage === 'Refresh token has been revoked') {
        isRefreshing = false
        authStore.logout()
        window.location.href = '/login?reason=token_revoked'
        throw new ApiError(401, 'Unauthorized', 'Token has been revoked')
      }

      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = (async () => {
          try {
            await authStore.refreshToken()
          } finally {
            isRefreshing = false
            refreshPromise = null
          }
        })()
      }

      try {
        await refreshPromise
        return fetchWithAuth<T>(url, { ...config, skipAuth: false })
      } catch {
        authStore.logout()
        window.location.href = '/login?reason=session_expired'
        throw new ApiError(401, 'Unauthorized', 'Session expired')
      }
    }

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorMessage
      } catch {
      }

      const isNetworkError = response.status >= 500 || response.status === 0

      if (isNetworkError && !hasShownOfflineToast) {
        hasShownOfflineToast = true
        try {
          const toastStore = useToastStore.getState()
          console.log('[Offline] Adding offline toast', { toasts: toastStore.toasts.length })
          toastStore.addToast({
            title: 'Вы офлайн',
            body: 'Проверьте подключение к интернету',
            type: 'error'
          })
        } catch (err) {
          console.error('[Offline] Failed to show offline toast:', err)
        }
      }

      if (isNetworkError && queueMutationFn && !skipAuth && config.method && config.method !== 'GET') {
        const mutation: Mutation = {
          id: crypto.randomUUID(),
          method: config.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          url,
          body: config.body as string,
          timestamp: Date.now(),
          retryCount: 0
        }

        console.log('[Offline] Queuing mutation:', { method: mutation.method, url: mutation.url })
        queueMutationFn(mutation).catch((err) => console.error('Failed to queue mutation:', err))

        try {
          useToastStore.getState().addToast({
            title: 'Офлайн режим',
            body: 'Запрос сохранен и будет отправлен при восстановлении сети',
            type: 'info'
          })
        } catch (err) {
          console.error('[Offline] Failed to show queued mutation toast:', err)
        }

        throw new OfflineQueueError('Request saved to offline queue')
      }

      throw new ApiError(response.status, response.statusText, errorMessage)
    }

    const data = response.status === 204 ? null : await response.json()

    if ((config.method === 'GET' || !config.method) && data) {
      await setCache(fullUrl, data)
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      if ((config.method === 'GET' || !config.method)) {
        const cached = await getCache<T>(fullUrl)
        if (cached) {
          console.log('[Cache] Using cached data after error for:', fullUrl)
          return { data: cached, status: 200, statusText: 'OK' }
        }
      }

      if (queueMutationFn && config.method && config.method !== 'GET') {
        const mutation: Mutation = {
          id: crypto.randomUUID(),
          method: config.method as 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          url,
          body: config.body as string,
          timestamp: Date.now(),
          retryCount: 0
        }

        queueMutationFn(mutation).catch((err) => console.error('Failed to queue mutation:', err))

        try {
          useToastStore.getState().addToast({
            title: 'Офлайн режим',
            body: 'Запрос сохранен и будет отправлен при восстановлении сети',
            type: 'info'
          })
        } catch {
        }

        throw new OfflineQueueError('Request saved to offline queue')
      }

      throw new ApiError(0, 'Network Error', 'Network error. Please check your connection.')
    }

    throw new ApiError(0, 'Error', error instanceof Error ? error.message : 'An error occurred')
  }
}

export const httpClient = {
  get: <T = unknown>(url: string, config?: RequestConfig) =>
    fetchWithAuth<T>(url, { ...config, method: 'GET' }),

  post: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) =>
    fetchWithAuth<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) =>
    fetchWithAuth<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(url: string, data?: unknown, config?: RequestConfig) =>
    fetchWithAuth<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, config?: RequestConfig) =>
    fetchWithAuth<T>(url, { ...config, method: 'DELETE' }),
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[Offline] Online event detected')
    hasShownOfflineToast = false
    try {
      useToastStore.getState().addToast({
        title: 'Сеть восстановлена',
        body: 'Соединение с сервером восстановлено',
        type: 'success'
      })
    } catch (err) {
      console.error('[Offline] Failed to show online toast:', err)
    }
    window.dispatchEvent(new CustomEvent('ONLINE_RECONNECT'))
  })

  window.addEventListener('offline', async () => {
    console.log('[Offline] Offline event detected')
    hasShownOfflineToast = true
    try {
      useToastStore.getState().addToast({
        title: 'Вы офлайн',
        body: 'Проверьте подключение к интернету',
        type: 'error'
      })
    } catch (err) {
      console.error('[Offline] Failed to show offline event toast:', err)
    }
  })
}

export { ApiError, OfflineQueueError, type ApiResponse, type RequestConfig, type Mutation }
