import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBrowserNotifications } from '../utils/browserNotifications'

describe('useBrowserNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('feature detection', () => {
    it('returns enabled=false when Notification API not supported', () => {
      vi.stubGlobal('Notification', undefined as any)
      const { result } = renderHook(() => useBrowserNotifications())
      expect(result.current.enabled).toBe(false)
    })

    it('returns enabled=true when Notification API supported and enabled in localStorage', () => {
      const mockNotification = {
        permission: 'granted',
      } as any
      vi.stubGlobal('Notification', mockNotification)
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true')

      const { result } = renderHook(() => useBrowserNotifications())
      expect(result.current.enabled).toBe(true)
    })
  })

  describe('showReminder', () => {
    it('shows browser notification when supported, granted and enabled', async () => {
      const mockNotification = vi.fn()
      mockNotification.permission = 'granted'
      vi.stubGlobal('Notification', mockNotification)
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('true')

      const { result } = renderHook(() => useBrowserNotifications())

      const showSpy = vi.spyOn(result.current, 'showReminder').mockResolvedValue(true)

      await act(async () => {
        const ok = await result.current.showReminder('Test task', 'task-123')
        expect(ok).toBe(true)
      })

      expect(showSpy).toHaveBeenCalledWith('Test task', 'task-123')
    })

    it('returns false when Notification API not supported', async () => {
      vi.stubGlobal('Notification', undefined as any)
      const { result } = renderHook(() => useBrowserNotifications())

      const ok = await result.current.showReminder('Test task', 'task-123')
      expect(ok).toBe(false)
    })
  })

  describe('requestPermission', () => {
    it('requests permission when supported', async () => {
      const mockNotification = {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      } as any
      vi.stubGlobal('Notification', mockNotification)

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('granted')
      })

      expect(mockNotification.requestPermission).toHaveBeenCalled()
    })

    it('returns denied when not supported', async () => {
      vi.stubGlobal('Notification', undefined as any)
      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const permission = await result.current.requestPermission()
        expect(permission).toBe('denied')
      })
    })
  })

  describe('toggle', () => {
    it('toggles enabled state', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      vi.stubGlobal('Notification', { permission: 'granted' } as any)
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('false')

      const { result } = renderHook(() => useBrowserNotifications())

      act(() => {
        result.current.toggle()
      })

      expect(setItemSpy).toHaveBeenCalledWith('ui-browser-notifications-enabled', 'true')
    })
  })
})
