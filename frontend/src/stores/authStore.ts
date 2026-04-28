import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearLocalData, performInitialSync } from '../db/init'
import i18n from '../i18n'

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  timezone: string | null
  default_section: string
  language: string | null
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  telegram_notifications_enabled: boolean
  capitalize_first: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (credentials: { username: string; password: string }) => Promise<void>
  register: (data: { username: string; email: string; password: string; invite_code?: string }) => Promise<void>
  registerAndLogin: (data: { username: string; email: string; password: string; invite_code?: string }) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  clearError: () => void
  fetchCurrentUser: () => Promise<void>
  setCurrentUser: (user: User) => void
  deleteAccount: (password: string) => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 429) {
          throw new Error(i18n.t('auth:tooManyAttempts'))
        }
        throw new Error(error.detail || 'Login failed')
      }

      const data = await response.json()
      if (data.user?.default_section) {
        localStorage.setItem('default-section', data.user.default_section)
      }
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      if (data.user?.id) {
        performInitialSync(data.user.id).catch((err) => {
          if (import.meta.env.DEV) {
            console.warn('[Auth] Initial sync after login failed:', err)
          }
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      })
      throw error
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const registerData: Record<string, unknown> = {
        username: data.username,
        email: data.email,
        password: data.password,
      }
      if (data.invite_code) {
        registerData.invite_code = data.invite_code
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 429) {
          throw new Error(i18n.t('auth:tooManyRegisterAttempts'))
        }
        throw new Error(error.detail || 'Registration failed')
      }

      set({ isLoading: false, error: null })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      })
      throw error
    }
  },

  registerAndLogin: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const registerData: Record<string, unknown> = {
        username: data.username,
        email: data.email,
        password: data.password,
      }
      if (data.invite_code) {
        registerData.invite_code = data.invite_code
      }

      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      if (!registerResponse.ok) {
        const error = await registerResponse.json()
        throw new Error(error.detail || 'Registration failed')
      }

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password }),
        credentials: 'include',
      })

      if (!loginResponse.ok) {
        const error = await loginResponse.json()
        if (loginResponse.status === 429) {
          throw new Error(i18n.t('auth:tooManyAttempts'))
        }
        throw new Error(error.detail || 'Login after registration failed')
      }

      const loginData = await loginResponse.json()
      set({
        user: loginData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      if (loginData.user?.id) {
        performInitialSync(loginData.user.id).catch((err) => {
          if (import.meta.env.DEV) {
            console.warn('[Auth] Initial sync after registration failed:', err)
          }
        })
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      })
      throw error
    }
  },

  logout: () => {
    const userId = useAuthStore.getState().user?.id
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    if (userId) {
      clearLocalData(userId).catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Auth] Failed to clear local data:', err)
        }
      })
    }
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  refreshToken: async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Token refresh failed')
      }

      const data = await response.json()
      set({
        user: data.user,
        isAuthenticated: true,
      })
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
      })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          set({
            isLoading: false,
            error: null,
            user: null,
            isAuthenticated: false,
          })
          return
        }
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          set({ isLoading: false })
          return
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      if (data.default_section) {
        localStorage.setItem('default-section', data.default_section)
      }
      set({
        user: data,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      if (!navigator.onLine) {
        set({ isLoading: false })
        return
      }
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
        user: null,
        isAuthenticated: false,
      })
      throw error
    }
  },

  setCurrentUser: (user) => {
    if (user.default_section) {
      localStorage.setItem('default-section', user.default_section)
    }
    set({ user })
  },

  deleteAccount: async (password) => {
    const userId = useAuthStore.getState().user?.id
    const response = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to delete account')
    }

    if (userId) {
      clearLocalData(userId).catch((err) => {
        if (import.meta.env.DEV) {
          console.error('[Auth] Failed to clear local data after account deletion:', err)
        }
      })
    }

    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },
}),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
