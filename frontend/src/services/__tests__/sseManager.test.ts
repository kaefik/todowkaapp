import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sseManager } from '../sseManager'

describe('SSE Reconnect Limit', () => {
  const MAX_RECONNECT_ATTEMPTS = 5

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sseManager.disconnect()
  })

  it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => handler(new Event('error')), 0)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    for (let i = 0; i < MAX_RECONNECT_ATTEMPTS + 1; i++) {
      vi.advanceTimersByTime(1000)
    }

    const errorCalls = mockCallbacks.onError.mock.calls.length
    const reconnectCalls = onStateChange.mock.calls.filter(
      call => call[0] === 'connecting'
    ).length

    expect(errorCalls).toBeGreaterThan(0)
    expect(reconnectCalls).toBeLessThanOrEqual(MAX_RECONNECT_ATTEMPTS)
  })

  it('should track reconnect attempts correctly', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => handler(new Event('error')), 0)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(1000)
    }

    const errorCalls = mockCallbacks.onError.mock.calls.length
    expect(errorCalls).toBe(3)
  })

  it('should reset reconnect attempts on manual reset', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => handler(new Event('error')), 0)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    for (let i = 0; i < 2; i++) {
      vi.advanceTimersByTime(1000)
    }

    sseManager.resetReconnectAttempts()

    const beforeReset = mockCallbacks.onError.mock.calls.length
    sseManager.connect('test-user', mockCallbacks)

    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(1000)
    }

    const afterReset = mockCallbacks.onError.mock.calls.length

    expect(afterReset - beforeReset).toBe(3)
  })

  it('should reset attempts on successful connection', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    let errorCount = 0
    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CONNECTING,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => {
              errorCount++
              handler(new Event('error'))
            }, 0)
          } else if (event === 'open') {
            setTimeout(() => {
              handler(new Event('open'))
            }, 100)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    vi.advanceTimersByTime(1000)

    expect(errorCount).toBe(1)

    vi.advanceTimersByTime(100)

    expect(errorCount).toBe(2)

    vi.advanceTimersByTime(100)

    expect(errorCount).toBe(2)
  })

  it('should stop reconnecting after manual disconnect', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => handler(new Event('error')), 0)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    vi.advanceTimersByTime(1000)

    const beforeDisconnect = mockCallbacks.onError.mock.calls.length

    sseManager.disconnect()

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000)
    }

    const afterDisconnect = mockCallbacks.onError.mock.calls.length

    expect(afterDisconnect).toBe(beforeDisconnect)
  })

  it('should reset attempts when connecting again after disconnect', () => {
    const onStateChange = vi.fn()

    const mockCallbacks = {
      onMessage: vi.fn(),
      onStateChange,
      onError: vi.fn(),
    }

    vi.spyOn(global, 'EventSource').mockImplementation(() => {
      const mockEventSource = {
        readyState: EventSource.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'error') {
            setTimeout(() => handler(new Event('error')), 0)
          }
        }),
        removeEventListener: vi.fn(),
      }

      return mockEventSource as unknown as EventSource
    })

    sseManager.connect('test-user', mockCallbacks)

    vi.advanceTimersByTime(1000)

    sseManager.disconnect()

    sseManager.connect('test-user', mockCallbacks)

    vi.advanceTimersByTime(1000)

    const secondConnectErrors = mockCallbacks.onError.mock.calls.filter(
      (call, index) => index >= mockCallbacks.onError.mock.calls.length - 1
    ).length

    expect(secondConnectErrors).toBe(1)
  })
})
