import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { httpClient, ApiError } from './httpClient'

const mockAccessToken = 'mock-access-token'

let currentAuthStore: any = {
  user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
  accessToken: mockAccessToken,
  refreshToken: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => currentAuthStore,
  },
}))

describe('httpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn() as any
    const mockRefreshFn = vi.fn().mockResolvedValue(undefined)
    currentAuthStore = {
      user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
      accessToken: mockAccessToken,
      refreshToken: mockRefreshFn,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authorization header', () => {
    it('adds Authorization header when accessToken exists', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('does not add Authorization header when skipAuth is true', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('/test', { skipAuth: true })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
    })

    it('does not add Authorization header when accessToken is null', async () => {
      currentAuthStore = {
        user: null,
        accessToken: null,
        refreshToken: vi.fn(),
        isAuthenticated: false,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }

      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.any(String),
          }),
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })
  })

  describe('HTTP methods', () => {
    it('handles GET request', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })

    it('handles POST request with body', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.post('/test', { foo: 'bar' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ foo: 'bar' }),
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })

    it('handles POST request without body', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.post('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('handles PUT request', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.put('/test', { foo: 'bar' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ foo: 'bar' }),
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })

    it('handles PATCH request', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.patch('/test', { foo: 'bar' })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ foo: 'bar' }),
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })

    it('handles DELETE request', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.delete('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
      expect(result.data).toEqual({ data: 'test' })
    })
  })

  describe('401 handling and token refresh', () => {
    it('attempts to refresh token on 401 response', async () => {
      const authStore = {
        user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
        accessToken: mockAccessToken,
        refreshToken: vi.fn().mockResolvedValue(undefined),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }
      currentAuthStore = authStore

      const failResponse = { ok: false, status: 401, statusText: 'Unauthorized' }
      const successResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'success' }) }
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(failResponse as any)
        .mockResolvedValueOnce(successResponse as any)

      await httpClient.get('/test')

      expect(authStore.refreshToken).toHaveBeenCalled()
    })

    it('retries original request with new token after refresh', async () => {
      const newToken = 'new-access-token'
      const authStore = {
        user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
        accessToken: mockAccessToken,
        refreshToken: vi.fn().mockImplementation(() => {
          authStore.accessToken = newToken
        }),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }
      currentAuthStore = authStore

      const failResponse = { ok: false, status: 401, statusText: 'Unauthorized' }
      const successResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'success' }) }
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(failResponse as any)
        .mockResolvedValueOnce(successResponse as any)

      await httpClient.get('/test')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${newToken}`,
          }),
        })
      )
    })

    it('refreshes token and retries for parallel requests', async () => {
      const newToken = 'new-access-token'
      const authStore = {
        user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
        accessToken: mockAccessToken,
        refreshToken: vi.fn().mockImplementation(async () => {
          authStore.accessToken = newToken
        }),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }
      currentAuthStore = authStore

      const failResponse = { ok: false, status: 401, statusText: 'Unauthorized' }
      const successResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'success' }) }
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(failResponse as any)
        .mockResolvedValueOnce(successResponse as any)
        .mockResolvedValueOnce(failResponse as any)
        .mockResolvedValueOnce(successResponse as any)

      const [result1, result2] = await Promise.all([
        httpClient.get('/test1'),
        httpClient.get('/test2'),
      ])

      expect(authStore.refreshToken).toHaveBeenCalled()
      expect(result1.data).toEqual({ data: 'success' })
      expect(result2.data).toEqual({ data: 'success' })
    })

    it('calls logout and redirects when token refresh fails', async () => {
      const authStore = {
        user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
        accessToken: mockAccessToken,
        refreshToken: vi.fn().mockRejectedValue(new Error('Refresh failed')),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }
      currentAuthStore = authStore
      delete (window as any).location
      window.location = { href: '' } as any

      const failResponse = { ok: false, status: 401, statusText: 'Unauthorized' }
      vi.mocked(global.fetch).mockResolvedValueOnce(failResponse as any)

      await expect(httpClient.get('/test')).rejects.toThrow(ApiError)

      expect(authStore.logout).toHaveBeenCalled()
      expect(window.location.href).toBe('/login?reason=session_expired')
    })

    it('throws ApiError when refresh fails', async () => {
      const authStore = {
        user: { id: '1', username: 'test', email: 'test@test.com', is_active: true, is_admin: false, created_at: '2024-01-01' },
        accessToken: mockAccessToken,
        refreshToken: vi.fn().mockRejectedValue(new Error('Refresh failed')),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        login: vi.fn(),
        logout: vi.fn(),
      }
      currentAuthStore = authStore
      delete (window as any).location
      window.location = { href: '' } as any

      const failResponse = { ok: false, status: 401, statusText: 'Unauthorized' }
      vi.mocked(global.fetch).mockResolvedValueOnce(failResponse as any)

      await expect(httpClient.get('/test')).rejects.toThrow('Session expired')
    })
  })

  describe('error handling', () => {
    it('throws ApiError on non-OK response', async () => {
      const mockResponse = { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ detail: 'Invalid input' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await expect(httpClient.get('/test')).rejects.toThrow(ApiError)
    })

    it('includes detail from response in error message', async () => {
      const mockResponse = { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({ detail: 'Invalid input' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Invalid input')
      }
    })

    it('falls back to statusText when detail is not available', async () => {
      const mockResponse = { ok: false, status: 400, statusText: 'Bad Request', json: async () => ({}) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      try {
        await httpClient.get('/test')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Bad Request')
      }
    })

    it('handles network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(httpClient.get('/test')).rejects.toThrow('Network error')
    })

    it('handles unexpected errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Unexpected error'))

      await expect(httpClient.get('/test')).rejects.toThrow('Unexpected error')
    })
  })

  describe('204 No Content response', () => {
    it('returns null for 204 responses', async () => {
      const mockResponse = { ok: true, status: 204, statusText: 'No Content' }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.delete('/test')

      expect(result.data).toBeNull()
    })
  })

  describe('URL handling', () => {
    it('prepends API_BASE_URL to relative URLs', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.any(Object)
      )
    })

    it('does not prepend API_BASE_URL to absolute URLs', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('https://api.example.com/test')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.any(Object)
      )
    })
  })

  describe('response structure', () => {
    it('returns data, status, and statusText in response', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ foo: 'bar' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      const result = await httpClient.get('/test')

      expect(result).toEqual({
        data: { foo: 'bar' },
        status: 200,
        statusText: 'OK',
      })
    })
  })

  describe('custom headers', () => {
    it('merges custom headers with default headers', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('/test', {
        headers: { 'X-Custom-Header': 'custom-value' } as any,
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockAccessToken}`,
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })

    it('allows overriding Content-Type', async () => {
      const mockResponse = { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: 'test' }) }
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any)

      await httpClient.get('/test', {
        headers: { 'Content-Type': 'text/plain' } as any,
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        })
      )
    })
  })

  describe('ApiError class', () => {
    it('creates ApiError with correct properties', () => {
      const error = new ApiError(404, 'Not Found', 'Resource not found')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ApiError)
      expect(error.status).toBe(404)
      expect(error.statusText).toBe('Not Found')
      expect(error.message).toBe('Resource not found')
      expect(error.name).toBe('ApiError')
    })
  })
})
