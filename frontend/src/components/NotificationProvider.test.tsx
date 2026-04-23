import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { NotificationProvider } from './NotificationProvider'
import * as authStore from '../stores/authStore'
import * as notificationStore from '../stores/notificationStore'
import * as toastStore from '../stores/toastStore'
import * as useBrowserNotificationsHook from '../hooks/useBrowserNotifications'

vi.mock('../stores/authStore', () => ({
  useAuthStore: Object.assign(
    vi.fn(),
    { getState: vi.fn().mockReturnValue({ isAuthenticated: false, user: null }) }
  ),
}))
vi.mock('../stores/notificationStore', () => ({
  useNotificationStore: Object.assign(
    vi.fn(),
    { getState: vi.fn().mockReturnValue({ notifications: [] }) }
  ),
}))
vi.mock('../stores/toastStore', () => ({
  useToastStore: vi.fn(),
}))
vi.mock('../hooks/useBrowserNotifications', () => ({
  useBrowserNotifications: vi.fn(),
}))

const mockAuthStore = authStore as any
const mockNotificationStore = notificationStore as any
const mockToastStore = toastStore as any
const mockUseBrowserNotifications = useBrowserNotificationsHook as any

describe('NotificationProvider', () => {
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@test.com',
    is_active: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    mockAuthStore.useAuthStore.mockImplementation((selector?: any) => {
      const state = { isAuthenticated: false, user: null }
      return selector ? selector(state) : state
    })
    mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: false, user: null })

    mockNotificationStore.useNotificationStore.mockImplementation((selector?: any) => {
      const state = {
        startSSE: vi.fn(),
        stopSSE: vi.fn(),
        refetch: vi.fn(),
        notifications: [],
      }
      return selector ? selector(state) : state
    })
    mockNotificationStore.useNotificationStore.getState.mockReturnValue({ notifications: [] })

    mockToastStore.useToastStore.mockImplementation((selector?: any) => {
      const state = { addToast: vi.fn() }
      return selector ? selector(state) : state
    })

    mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
      showReminder: vi.fn().mockResolvedValue(true),
      enabled: true,
    })

    vi.stubGlobal('Notification', {
      permission: 'granted',
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('SSE connection', () => {
    it('starts SSE when user authenticates', () => {
      const startSSE = vi.fn()

      mockAuthStore.useAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
      })
      mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: true, user: mockUser })

      mockNotificationStore.useNotificationStore.mockReturnValue({
        startSSE,
        stopSSE: vi.fn(),
        refetch: vi.fn(),
        notifications: [],
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      expect(startSSE).toHaveBeenCalledWith('user-123')
    })

    it('stops SSE when user logs out', () => {
      const stopSSE = vi.fn()

      mockAuthStore.useAuthStore.mockReturnValue({
        isAuthenticated: false,
        user: null,
      })

      mockNotificationStore.useNotificationStore.mockReturnValue({
        startSSE: vi.fn(),
        stopSSE,
        refetch: vi.fn(),
        notifications: [],
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      expect(stopSSE).toHaveBeenCalled()
    })

    it('refetches notifications on mount when authenticated', () => {
      const refetch = vi.fn()

      mockAuthStore.useAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
      })
      mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: true, user: mockUser })

      mockNotificationStore.useNotificationStore.mockReturnValue({
        startSSE: vi.fn(),
        stopSSE: vi.fn(),
        refetch,
        notifications: [],
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('reminder handler', () => {
    it('always registers handler regardless of enabled state', async () => {
      const showReminder = vi.fn().mockResolvedValue(true)
      const addToast = vi.fn()

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: false,
      })

      mockToastStore.useToastStore.mockImplementation((selector?: any) => {
        const state = { addToast }
        return selector ? selector(state) : state
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: {
            message: 'Test reminder',
          },
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(addToast).toHaveBeenCalled()
      })
    })

    it('shows browser notification when enabled and supported', async () => {
      const showReminder = vi.fn().mockResolvedValue(true)

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: true,
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: {
            message: 'Test reminder',
          },
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(showReminder).toHaveBeenCalledWith('Test reminder', 'task-123')
      })
    })

    it('falls back to toast when browser notification fails', async () => {
      const showReminder = vi.fn().mockResolvedValue(false)
      const addToast = vi.fn()

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: true,
      })

      mockToastStore.useToastStore.mockImplementation((selector?: any) => {
        const state = { addToast }
        return selector ? selector(state) : state
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: {
            message: 'Test reminder',
          },
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(showReminder).toHaveBeenCalled()
        expect(addToast).toHaveBeenCalledWith({
          title: 'Напоминание о задаче',
          body: 'Test reminder',
          type: 'reminder',
          taskId: 'task-123',
        })
      })
    })

    it('uses notificationData from event when available', async () => {
      const showReminder = vi.fn().mockResolvedValue(true)

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: true,
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: {
            message: 'Message from event',
            id: 'notif-123',
          },
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(showReminder).toHaveBeenCalledWith('Message from event', 'task-123')
      })
    })

    it('falls back to store when notificationData not in event', async () => {
      const showReminder = vi.fn().mockResolvedValue(true)
      const notifications = [
        { id: 'notif-123', task_id: 'task-123', message: 'Message from store', is_read: false },
      ]

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: true,
      })

      mockNotificationStore.useNotificationStore.mockImplementation((selector?: any) => {
        const state = {
          startSSE: vi.fn(),
          stopSSE: vi.fn(),
          refetch: vi.fn(),
          notifications,
        }
        return selector ? selector(state) : state
      })
      mockNotificationStore.useNotificationStore.getState.mockReturnValue({ notifications })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: null,
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(showReminder).toHaveBeenCalledWith('Message from store', 'task-123')
      })
    })

    it('shows toast when Notification API not supported', async () => {
      const showReminder = vi.fn().mockResolvedValue(false)
      const addToast = vi.fn()

      vi.stubGlobal('Notification', undefined as any)

      mockUseBrowserNotifications.useBrowserNotifications.mockReturnValue({
        showReminder,
        enabled: true,
      })

      mockToastStore.useToastStore.mockImplementation((selector?: any) => {
        const state = { addToast }
        return selector ? selector(state) : state
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const event = new CustomEvent('task:reminder-fired', {
        detail: {
          taskId: 'task-123',
          notificationData: {
            message: 'Test reminder',
          },
        },
      })

      window.dispatchEvent(event)

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith({
          title: 'Напоминание о задаче',
          body: 'Test reminder',
          type: 'reminder',
          taskId: 'task-123',
        })
      })
    })
  })

  describe('online/offline handling', () => {
    it('restarts SSE when browser goes online', () => {
      const startSSE = vi.fn()
      const stopSSE = vi.fn()

      mockAuthStore.useAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
      })
      mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: true, user: mockUser })

      mockNotificationStore.useNotificationStore.mockReturnValue({
        startSSE,
        stopSSE,
        refetch: vi.fn(),
        notifications: [],
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      const startSSECalls = startSSE.mock.calls.length

      window.dispatchEvent(new Event('offline'))
      mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: true, user: mockUser })
      window.dispatchEvent(new Event('online'))

      expect(startSSE.mock.calls.length).toBeGreaterThan(startSSECalls)
    })

    it('stops SSE when browser goes offline', () => {
      const stopSSE = vi.fn()

      mockAuthStore.useAuthStore.mockReturnValue({
        isAuthenticated: true,
        user: mockUser,
      })
      mockAuthStore.useAuthStore.getState.mockReturnValue({ isAuthenticated: true, user: mockUser })

      mockNotificationStore.useNotificationStore.mockReturnValue({
        startSSE: vi.fn(),
        stopSSE,
        refetch: vi.fn(),
        notifications: [],
      })

      render(<NotificationProvider><div>Test</div></NotificationProvider>)

      window.dispatchEvent(new Event('offline'))

      expect(stopSSE).toHaveBeenCalled()
    })
  })
})
