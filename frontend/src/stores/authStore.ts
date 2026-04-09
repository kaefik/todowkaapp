import { create } from 'zustand'

export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  created_at: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
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
        throw new Error(error.detail || 'Login failed')
      }

      const data = await response.json()
      set({
        user: data.user,
        accessToken: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
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
        throw new Error(error.detail || 'Login after registration failed')
      }

      const loginData = await loginResponse.json()
      set({
        user: loginData.user,
        accessToken: loginData.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      })
      throw error
    }
  },

  logout: () => {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
    set({
      user: null,
      accessToken: null,
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
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      set({
        accessToken: data.access_token,
        isAuthenticated: true,
      })
    } catch (error) {
      set({
        user: null,
        accessToken: null,
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
            accessToken: null,
            isAuthenticated: false,
          })
          return
        }
        throw new Error('Failed to fetch user')
      }

      const data = await response.json()
      set({
        user: data,
        accessToken: data.access_token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch user',
        user: null,
        accessToken: null,
        isAuthenticated: false,
      })
      throw error
    }
  },
}))
