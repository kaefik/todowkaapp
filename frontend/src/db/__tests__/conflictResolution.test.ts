import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeRecord, shouldSkipMerge } from '../conflictResolution'
import type { SyncStatus } from '../database'

interface TestRecord {
  id: string
  name: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

function makeRecord(overrides: Partial<TestRecord> = {}): TestRecord {
  return {
    id: 'r1',
    name: 'test',
    updatedAt: '2026-04-18T10:00:00Z',
    _syncStatus: 'synced',
    _lastSyncedAt: '2026-04-18T10:00:00Z',
    ...overrides,
  }
}

vi.mock('../database', () => {
  const mutationsMock = {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    count: vi.fn().mockResolvedValue(0),
  }
  return {
    db: {
      mutations: mutationsMock,
    },
    get mutationsMock() {
      return mutationsMock
    },
  }
})

describe('mergeRecord', () => {
  it('returns server record when no local record exists', () => {
    const server = makeRecord({ name: 'server' })
    const result = mergeRecord(undefined, server)
    expect(result).toBe(server)
  })

  it('returns server record when local is synced', () => {
    const local = makeRecord({ _syncStatus: 'synced', name: 'local' })
    const server = makeRecord({ name: 'server' })
    const result = mergeRecord(local, server)
    expect(result).toBe(server)
  })

  it('returns server record when local is modified but server is newer', () => {
    const local = makeRecord({
      _syncStatus: 'modified',
      updatedAt: '2026-04-18T10:00:00Z',
      name: 'local',
    })
    const server = makeRecord({
      updatedAt: '2026-04-18T11:00:00Z',
      name: 'server',
    })
    const result = mergeRecord(local, server)
    expect(result).toBe(server)
  })

  it('returns local record when local is modified and newer than server', () => {
    const local = makeRecord({
      _syncStatus: 'modified',
      updatedAt: '2026-04-18T11:00:00Z',
      name: 'local',
    })
    const server = makeRecord({
      updatedAt: '2026-04-18T10:00:00Z',
      name: 'server',
    })
    const result = mergeRecord(local, server)
    expect(result).toBe(local)
  })

  it('returns local record when updatedAt timestamps are equal', () => {
    const local = makeRecord({
      _syncStatus: 'modified',
      updatedAt: '2026-04-18T10:00:00Z',
      name: 'local',
    })
    const server = makeRecord({
      updatedAt: '2026-04-18T10:00:00Z',
      name: 'server',
    })
    const result = mergeRecord(local, server)
    expect(result).toBe(local)
  })
})

describe('shouldSkipMerge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when pending mutations exist', async () => {
    const { db } = await import('../database')
    const mutations = db.mutations as unknown as {
      where: ReturnType<typeof vi.fn>
      equals: ReturnType<typeof vi.fn>
      count: ReturnType<typeof vi.fn>
    }
    mutations.count.mockResolvedValueOnce(3)

    const result = await shouldSkipMerge('task', 'r1')
    expect(result).toBe(true)
  })

  it('returns false when no pending mutations exist', async () => {
    const { db } = await import('../database')
    const mutations = db.mutations as unknown as {
      where: ReturnType<typeof vi.fn>
      equals: ReturnType<typeof vi.fn>
      count: ReturnType<typeof vi.fn>
    }
    mutations.count.mockResolvedValueOnce(0)

    const result = await shouldSkipMerge('task', 'r1')
    expect(result).toBe(false)
  })
})
