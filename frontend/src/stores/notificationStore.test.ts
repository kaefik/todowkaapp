import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationStore } from './notificationStore'

const mockGetAll = vi.fn().mockResolvedValue({ items: [], total: 0, unread_count: 0 })
const mockMarkAsRead = vi.fn().mockResolvedValue({})
const mockMarkAllAsRead = vi.fn().mockResolvedValue({})
const mockDeleteNotification = vi.fn().mockResolvedValue({})

vi.mock('../api/notifications', () => ({
  notificationsApi: {
    getAll: (...args: any[]) => mockGetAll(...args),
    markAsRead: (...args: any[]) => mockMarkAsRead(...args),
    markAllAsRead: (...args: any[]) => mockMarkAllAsRead(...args),
    deleteNotification: (...args: any[]) => mockDeleteNotification(...args),
  },
}))

vi.mock('../services/sseManager')

const mockAuthState = { isAuthenticated: true }
vi.mock('./authStore', () => ({
  useAuthStore: Object.assign(
    vi.fn(),
    { getState: () => mockAuthState }
  ),
}))

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockGetAll.mockResolvedValue({ items: [], total: 0, unread_count: 0 })
    mockMarkAsRead.mockResolvedValue({})
    mockMarkAllAsRead.mockResolvedValue({})
    mockDeleteNotification.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('refetch', () => {
    it('fetches notifications successfully', async () => {
      mockGetAll.mockResolvedValueOnce({
        items: [{ id: '1', message: 'Test notification', is_read: false }],
        total: 1,
        unread_count: 1,
      })

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockGetAll).toHaveBeenCalled()
      expect(result.current.total).toBe(1)
      expect(result.current.unreadCount).toBe(1)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('handles fetch error', async () => {
      const error = new Error('Failed to fetch')
      mockGetAll.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.refetch()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch')
    })
  })

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      mockMarkAsRead.mockResolvedValueOnce({
        id: '1',
        message: 'Test',
        is_read: true,
      })

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.markAsRead('1')
      })

      expect(mockMarkAsRead).toHaveBeenCalledWith('1')
    })

    it('throws error on failure', async () => {
      mockMarkAsRead.mockRejectedValueOnce(new Error('Failed'))

      const { result } = renderHook(() => useNotificationStore())

      await expect(result.current.markAsRead('1')).rejects.toThrow('Failed')
      expect(result.current.error).toBe('Failed')
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      mockMarkAllAsRead.mockResolvedValueOnce(2)

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.markAllAsRead()
      })

      expect(mockMarkAllAsRead).toHaveBeenCalled()
      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('deletes notification', async () => {
      mockDeleteNotification.mockResolvedValueOnce({})

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.deleteNotification('1')
      })

      expect(mockDeleteNotification).toHaveBeenCalledWith('1')
    })
  })

  describe('polling fallback', () => {
    it('starts polling', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.startPolling()
      })

      expect(result.current.pollingInterval).not.toBe(null)

      vi.advanceTimersByTime(30000)

      expect(mockGetAll).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('stops polling', () => {
      vi.useFakeTimers()

      const { result } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.startPolling()
      })

      expect(result.current.pollingInterval).not.toBe(null)

      act(() => {
        result.current.stopPolling()
      })

      expect(result.current.pollingInterval).toBe(null)

      vi.useRealTimers()
    })
  })

  describe('cleanup', () => {
    it('stops polling on cleanup', () => {
      vi.useFakeTimers()

      const { result, unmount } = renderHook(() => useNotificationStore())

      act(() => {
        result.current.startPolling()
      })

      expect(result.current.pollingInterval).not.toBe(null)

      act(() => {
        result.current.cleanup()
      })

      expect(result.current.pollingInterval).toBe(null)

      unmount()
      vi.useRealTimers()
    })
  })
})
