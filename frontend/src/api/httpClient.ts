import { useAuthStore } from '../stores/authStore'

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

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

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
    const response = await fetch(fullUrl, {
      ...fetchConfig,
      headers,
    })

    if (response.status === 401 && !skipAuth) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          await authStore.refreshToken()
          const newToken = authStore.accessToken
          onTokenRefreshed(newToken || '')
          isRefreshing = false

          return fetchWithAuth<T>(url, { ...config, skipAuth: false })
        } catch (refreshError) {
          isRefreshing = false
          authStore.logout()
          window.location.href = '/login'
          throw new ApiError(401, 'Unauthorized', 'Session expired')
        }
      } else {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(() => {
            fetchWithAuth<T>(url, { ...config, skipAuth: false })
              .then(resolve)
              .catch(reject)
          })
        })
      }
    }

    if (!response.ok) {
      let errorMessage = response.statusText
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorMessage
      } catch {
      }
      throw new ApiError(response.status, response.statusText, errorMessage)
    }

    const data = await response.json()

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

export { ApiError, type ApiResponse, type RequestConfig }
