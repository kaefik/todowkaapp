import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DbTask, DbTag, SyncStatus } from '../database'

const {
  mockTagsWhere,
  mockChecklistItemsWhere,
  mockProjectsGet,
  mockContextsGet,
} = vi.hoisted(() => {
  const mockTagsWhere = {
    anyOf: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }
  const mockChecklistItemsWhere = {
    equals: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }
  const mockProjectsGet = vi.fn().mockResolvedValue(undefined)
  const mockContextsGet = vi.fn().mockResolvedValue(undefined)
  return { mockTagsWhere, mockChecklistItemsWhere, mockProjectsGet, mockContextsGet }
})

vi.mock('../database', () => ({
  db: {
    tags: { where: vi.fn().mockReturnValue(mockTagsWhere) },
    checklistItems: { where: vi.fn().mockReturnValue(mockChecklistItemsWhere) },
    projects: { get: (...args: unknown[]) => mockProjectsGet(...args) },
    contexts: { get: (...args: unknown[]) => mockContextsGet(...args) },
  },
}))

import { apiTaskToDb, dbTaskToUi } from '../mappers'

function makeApiTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: 'Test task',
    description: 'desc',
    is_completed: true,
    completed_at: '2026-01-01T00:00:00Z',
    gtd_status: 'next',
    context_id: 'ctx1',
    area_id: 'area1',
    project_id: 'proj1',
    position: 5,
    due_date: '2026-06-01',
    notes: 'some notes',
    recurrence_type: 'daily',
    recurrence_config: { interval: 2 },
    recurrence_end_date: '2026-12-31',
    reminder_time: '09:00',
    reminder_offsets: [10, 30],
    reminder_fired: true,
    is_recurring: true,
    tags: [{ id: 'tag1' }, { id: 'tag2' }],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
    ...overrides,
  }
}

function makeDbTask(overrides: Partial<DbTask> = {}): DbTask {
  return {
    id: 't1',
    userId: 'u1',
    title: 'Test task',
    description: 'desc',
    isCompleted: true,
    completedAt: '2026-01-01T00:00:00Z',
    gtdStatus: 'next',
    contextId: 'ctx1',
    areaId: 'area1',
    projectId: 'proj1',
    position: 5,
    dueDate: '2026-06-01',
    notes: 'some notes',
    recurrenceType: 'daily',
    recurrenceConfig: JSON.stringify({ interval: 2 }),
    recurrenceEndDate: '2026-12-31',
    reminderTime: '09:00',
    reminderOffsets: JSON.stringify([10, 30]),
    reminderFired: true,
    isRecurring: true,
    tagIds: ['tag1', 'tag2'],
    trashedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-18T00:00:00Z',
    _syncStatus: 'synced' as SyncStatus,
    _lastSyncedAt: '2026-04-18T00:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTagsWhere.toArray.mockResolvedValue([])
  mockChecklistItemsWhere.toArray.mockResolvedValue([])
  mockProjectsGet.mockResolvedValue(undefined)
  mockContextsGet.mockResolvedValue(undefined)
})

describe('apiTaskToDb', () => {
  it('maps all fields from snake_case API to camelCase DbTask', () => {
    const result = apiTaskToDb(makeApiTask(), 'u1')

    expect(result.id).toBe('t1')
    expect(result.userId).toBe('u1')
    expect(result.title).toBe('Test task')
    expect(result.description).toBe('desc')
    expect(result.isCompleted).toBe(true)
    expect(result.completedAt).toBe('2026-01-01T00:00:00Z')
    expect(result.gtdStatus).toBe('next')
    expect(result.contextId).toBe('ctx1')
    expect(result.areaId).toBe('area1')
    expect(result.projectId).toBe('proj1')
    expect(result.position).toBe(5)
    expect(result.dueDate).toBe('2026-06-01')
    expect(result.notes).toBe('some notes')
    expect(result.recurrenceType).toBe('daily')
    expect(result.recurrenceEndDate).toBe('2026-12-31')
    expect(result.reminderTime).toBe('09:00')
    expect(result.reminderFired).toBe(true)
    expect(result.isRecurring).toBe(true)
    expect(result.trashedAt).toBeNull()
    expect(result.createdAt).toBe('2026-01-01T00:00:00Z')
    expect(result.updatedAt).toBe('2026-04-18T00:00:00Z')
  })

  it('extracts tagIds from tags[].id', () => {
    const result = apiTaskToDb(makeApiTask(), 'u1')
    expect(result.tagIds).toEqual(['tag1', 'tag2'])
  })

  it('sets _syncStatus to synced and fills _lastSyncedAt', () => {
    const result = apiTaskToDb(makeApiTask(), 'u1')
    expect(result._syncStatus).toBe('synced')
    expect(result._lastSyncedAt).toBeTruthy()
  })

  it('JSON.stringify for recurrenceConfig and reminderOffsets', () => {
    const result = apiTaskToDb(makeApiTask(), 'u1')
    expect(result.recurrenceConfig).toBe('{"interval":2}')
    expect(result.reminderOffsets).toBe('[10,30]')
  })
})

describe('dbTaskToUi', () => {
  it('maps DbTask back to UiTask with all fields', async () => {
    const ui = await dbTaskToUi(makeDbTask())

    expect(ui.id).toBe('t1')
    expect(ui.title).toBe('Test task')
    expect(ui.description).toBe('desc')
    expect(ui.completed).toBe(true)
    expect(ui.gtd_status).toBe('next')
    expect(ui.context_id).toBe('ctx1')
    expect(ui.area_id).toBe('area1')
    expect(ui.project_id).toBe('proj1')
    expect(ui.position).toBe(5)
    expect(ui.due_date).toBe('2026-06-01')
    expect(ui.notes).toBe('some notes')
    expect(ui.recurrence_type).toBe('daily')
    expect(ui.recurrence_end_date).toBe('2026-12-31')
    expect(ui.reminder_time).toBe('09:00')
    expect(ui.reminder_fired).toBe(true)
    expect(ui.is_recurring).toBe(true)
    expect(ui.user_id).toBe('u1')
    expect(ui.created_at).toBe('2026-01-01T00:00:00Z')
    expect(ui.updated_at).toBe('2026-04-18T00:00:00Z')
  })

  it('JSON.parse for recurrenceConfig and reminderOffsets', async () => {
    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.recurrence_config).toEqual({ interval: 2 })
    expect(ui.reminder_offsets).toEqual([10, 30])
  })

  it('joins tags from db.tags excluding soft-deleted', async () => {
    const tagRecords: DbTag[] = [
      { id: 'tag1', userId: 'u1', name: 'Tag1', color: 'red', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', _syncStatus: 'synced', _lastSyncedAt: null },
      { id: 'tag2', userId: 'u1', name: 'Tag2', color: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', _syncStatus: 'deleted', _lastSyncedAt: null },
    ]
    mockTagsWhere.toArray.mockResolvedValueOnce(tagRecords)

    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.tags).toHaveLength(1)
    expect(ui.tags[0].id).toBe('tag1')
    expect(ui.tags[0].name).toBe('Tag1')
  })

  it('joins project from db.projects excluding soft-deleted', async () => {
    mockProjectsGet.mockResolvedValueOnce({
      id: 'proj1', name: 'My Project', color: 'blue', isActive: true, _syncStatus: 'synced',
    })

    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.project).toEqual({ id: 'proj1', name: 'My Project', color: 'blue', is_active: true })
  })

  it('joins context from db.contexts excluding soft-deleted', async () => {
    mockContextsGet.mockResolvedValueOnce({
      id: 'ctx1', name: 'Work', color: 'green', icon: '💼', _syncStatus: 'synced',
    })

    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.context).toEqual({ id: 'ctx1', name: 'Work', color: 'green', icon: '💼' })
  })

  it('computes checklist_total and checklist_completed dynamically', async () => {
    mockChecklistItemsWhere.toArray.mockResolvedValueOnce([
      { id: 'c1', isCompleted: true, _syncStatus: 'synced' } as any,
      { id: 'c2', isCompleted: false, _syncStatus: 'synced' } as any,
    ])

    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.checklist_total).toBe(2)
    expect(ui.checklist_completed).toBe(1)
  })

  it('excludes soft-deleted projects and contexts', async () => {
    mockProjectsGet.mockResolvedValueOnce({
      id: 'proj1', name: 'Deleted', color: null, isActive: false, _syncStatus: 'deleted',
    })
    mockContextsGet.mockResolvedValueOnce({
      id: 'ctx1', name: 'Deleted', color: null, icon: null, _syncStatus: 'deleted',
    })

    const ui = await dbTaskToUi(makeDbTask())
    expect(ui.project).toBeNull()
    expect(ui.context).toBeNull()
  })
})
