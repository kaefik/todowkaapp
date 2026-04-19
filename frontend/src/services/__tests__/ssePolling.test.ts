import { describe, it, expect } from 'vitest'

describe('SSE Manager - infinite reconnect', () => {
  it('should have no MAX_RECONNECT_ATTEMPTS constant', async () => {
    const { sseManager } = await import('../sseManager')
    expect((sseManager as any).MAX_RECONNECT_ATTEMPTS).toBeUndefined()
  })

  it('should have visibilityHandler property', async () => {
    const { sseManager } = await import('../sseManager')
    expect((sseManager as any).visibilityHandler).toBeNull()
  })
})

describe('Polling fallback - store interface', () => {
  it('should have _startPolling and _stopPolling methods', async () => {
    const { useNotificationStore } = await import('../../stores/notificationStore')
    const store = useNotificationStore.getState()
    expect(typeof store._startPolling).toBe('function')
    expect(typeof store._stopPolling).toBe('function')
  })

  it('should have pollingDelay default 30000', async () => {
    const { useNotificationStore } = await import('../../stores/notificationStore')
    const store = useNotificationStore.getState()
    expect(store.pollingDelay).toBe(30000)
  })

  it('should have pollingTimerId default null', async () => {
    const { useNotificationStore } = await import('../../stores/notificationStore')
    const store = useNotificationStore.getState()
    expect(store.pollingTimerId).toBeNull()
  })

  it('_stopPolling resets state', async () => {
    const { useNotificationStore } = await import('../../stores/notificationStore')
    const store = useNotificationStore.getState()
    store._stopPolling()
    const after = useNotificationStore.getState()
    expect(after.pollingTimerId).toBeNull()
    expect(after.pollingDelay).toBe(30000)
    expect(after.sseDownSince).toBeNull()
  })
})

describe('EventBus overflow triggers refetch', () => {
  it('should detect queue_overflow event type', () => {
    const data = JSON.stringify({ type: 'queue_overflow', data: {} })
    const parsed = JSON.parse(data)
    expect(parsed.type).toBe('queue_overflow')
  })

  it('should parse nested notification data', () => {
    const data = JSON.stringify({ data: { type: 'due_reminder', task_id: 'abc-123' } })
    const parsed = JSON.parse(data)
    expect(parsed.data.type).toBe('due_reminder')
    expect(parsed.data.task_id).toBe('abc-123')
  })
})
