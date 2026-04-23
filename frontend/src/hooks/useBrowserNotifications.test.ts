import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'
import * as bnApi from '../utils/browserNotifications'

vi.mock('../utils/browserNotifications')

describe('useBrowserNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(bnApi.isSupported as any).mockReturnValue(true)
    ;(bnApi.isEnabled as any).mockReturnValue(false)
    ;(bnApi.getPermission as any).mockReturnValue('default')
    ;(bnApi.showReminder as any).mockResolvedValue(true)
    ;(bnApi.show as any).mockResolvedValue(true)
    ;(bnApi.requestPermission as any).mockResolvedValue('granted')
    ;(bnApi.setEnabled as any).mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('feature detection', () => {
    it('returns enabled=false when Notification API not supported', () => {
      ;(bnApi.isSupported as any).mockReturnValue(false)
      ;(bnApi.isEnabled as any).mockReturnValue(false)
      const { result } = renderHook(() => useBrowserNotifications())
      expect(result.current.enabled).toBe(false)
    })

    it('returns enabled=true when Notification API supported and enabled in localStorage', () => {
      ;(bnApi.isEnabled as any).mockReturnValue(true)
      const { result } = renderHook(() => useBrowserNotifications())
      expect(result.current.enabled).toBe(true)
    })
  })

  describe('showReminder', () => {
    it('shows browser notification when supported, granted and enabled', async () => {
      ;(bnApi.isEnabled as any).mockReturnValue(true)
      ;(bnApi.getPermission as any).mockReturnValue('granted')
      ;(bnApi.showReminder as any).mockResolvedValue(true)

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const ok = await result.current.showReminder('Test task', 'task-123')
        expect(ok).toBe(true)
      })

      expect(bnApi.showReminder).toHaveBeenCalledWith('Test task', 'task-123')
    })

    it('returns false when Notification API not supported', async () => {
      ;(bnApi.isSupported as any).mockReturnValue(false)
      ;(bnApi.showReminder as any).mockResolvedValue(false)

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const ok = await result.current.showReminder('Test task', 'task-123')
        expect(ok).toBe(false)
      })
    })
  })

  describe('requestPermission', () => {
    it('requests permission when supported', async () => {
      ;(bnApi.requestPermission as any).mockResolvedValue('granted')

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const ok = await result.current.enable()
        expect(ok).toBe(true)
      })

      expect(bnApi.requestPermission).toHaveBeenCalled()
    })

    it('returns denied when not supported', async () => {
      ;(bnApi.isSupported as any).mockReturnValue(false)

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        const ok = await result.current.enable()
        expect(ok).toBe(false)
      })
    })
  })

  describe('toggle', () => {
    it('toggles enabled state', async () => {
      ;(bnApi.isEnabled as any).mockReturnValue(false)

      const { result } = renderHook(() => useBrowserNotifications())

      await act(async () => {
        await result.current.enable()
      })

      expect(bnApi.setEnabled).toHaveBeenCalledWith(true)
    })
  })
})
