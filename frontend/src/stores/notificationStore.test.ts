import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationStore } from './notificationStore'
import * as notificationsApi from '../api/notifications'
import { useAuthStore } from './authStore'

vi.mock('../api/notifications')
vi.mock('../services/sseManager')
vi.mock('./authStore')

const mockNotificationsApi = notificationsApi as any

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(useAuthStore).mockReturnValue({
      accessToken: 'test-token',
    } as any)

    mockNotificationsApi.getAll = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      unread_count: 0,
    })
    mockNotificationsApi.markAsRead = vi.fn().mockResolvedValue({})
    mockNotificationsApi.markAllAsRead = vi.fn().mockResolvedValue({})
    mockNotificationsApi.deleteNotification = vi.fn().mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('refetch', () => {
    it('fetches notifications successfully', async () => {
      mockNotificationsApi.getAll.mockResolvedValueOnce({
        items: [{ id: '1', message: 'Test notification', is_read: false }],
        total: 1,
        unread_count: 1,
      })

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.refetch()
      })

      expect(mockNotificationsApi.getAll).toHaveBeenCalled()
      expect(result.current.total).toBe(1)
      expect(result.current.unreadCount).toBe(1)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('handles fetch error', async () => {
      const error = new Error('Failed to fetch')
      mockNotificationsApi.getAll.mockRejectedValueOnce(error)

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
      mockNotificationsApi.markAsRead.mockResolvedValueOnce({
        id: '1',
        message: 'Test',
        is_read: true,
      })

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.markAsRead('1')
      })

      expect(mockNotificationsApi.markAsRead).toHaveBeenCalledWith('1')
    })

    it('throws error on failure', async () => {
      mockNotificationsApi.markAsRead.mockRejectedValueOnce(new Error('Failed'))

      const { result } = renderHook(() => useNotificationStore())

      await expect(result.current.markAsRead('1')).rejects.toThrow('Failed')
      expect(result.current.error).toBe('Failed')
    })
  })

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      mockNotificationsApi.markAllAsRead.mockResolvedValueOnce(2)

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.markAllAsRead()
      })

      expect(mockNotificationsApi.markAllAsRead).toHaveBeenCalled()
      expect(result.current.unreadCount).toBe(0)
    })
  })

  describe('deleteNotification', () => {
    it('deletes notification', async () => {
      mockNotificationsApi.deleteNotification.mockResolvedValueOnce({})

      const { result } = renderHook(() => useNotificationStore())

      await act(async () => {
        await result.current.deleteNotification('1')
      })

      expect(mockNotificationsApi.deleteNotification).toHaveBeenCalledWith('1')
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

      expect(mockNotificationsApi.getAll).toHaveBeenCalled()

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
