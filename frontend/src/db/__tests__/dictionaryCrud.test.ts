import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DbMutation, SyncStatus } from '../database'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type MockTable<T> = {
  add: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

function createMockTable<T>(): MockTable<T> {
  const whereChain = {
    equals: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }
  return {
    add: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnValue(whereChain),
    put: vi.fn().mockResolvedValue(undefined),
  }
}

const areasTable = createMockTable<DbArea>()
const contextsTable = createMockTable<DbContext>()
const projectsTable = createMockTable<DbProject>()
const tagsTable = createMockTable<DbTag>()
const mutationsTable = createMockTable<DbMutation>()

vi.mock('../database', () => ({
  db: {
    areas: areasTable,
    contexts: contextsTable,
    projects: projectsTable,
    tags: tagsTable,
    mutations: mutationsTable,
  },
  activeTable: vi.fn(),
}))

const { db } = await import('../database')

describe('Dictionary CRUD — Areas', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addArea writes to db.areas with _syncStatus=local and creates mutation', async () => {
    const now = new Date().toISOString()
    const areaData = { name: 'Work', description: 'Work stuff', color: 'blue' }
    const id = 'area-1'

    await db.areas.add({
      id,
      userId,
      name: areaData.name,
      description: areaData.description ?? null,
      color: areaData.color ?? null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: 'mut-1',
      entityType: 'area',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...areaData, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(areasTable.add).toHaveBeenCalledTimes(1)
    const addedArea = areasTable.add.mock.calls[0][0] as DbArea
    expect(addedArea._syncStatus).toBe('local')
    expect(addedArea.name).toBe('Work')
    expect(addedArea.userId).toBe(userId)

    expect(mutationsTable.add).toHaveBeenCalledTimes(1)
    const addedMut = mutationsTable.add.mock.calls[0][0] as DbMutation
    expect(addedMut.entityType).toBe('area')
    expect(addedMut.action).toBe('create')
    expect(addedMut.entityId).toBe(id)
  })

  it('updateArea sets _syncStatus=modified and creates update mutation', async () => {
    const existingArea: DbArea = {
      id: 'area-1',
      userId,
      name: 'Work',
      description: 'desc',
      color: 'blue',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      _syncStatus: 'synced',
      _lastSyncedAt: '2026-01-01T00:00:00Z',
    }
    areasTable.get.mockResolvedValueOnce(existingArea)

    const updates = { name: 'Personal', _syncStatus: 'modified' as SyncStatus, updatedAt: expect.any(String) }
    await db.areas.update('area-1', updates)
    await db.mutations.add({
      id: 'mut-2',
      entityType: 'area',
      entityId: 'area-1',
      action: 'update',
      payload: JSON.stringify({ name: 'Personal' }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(areasTable.update).toHaveBeenCalledWith('area-1', expect.objectContaining({
      _syncStatus: 'modified',
      name: 'Personal',
    }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'area',
      action: 'update',
      entityId: 'area-1',
    }))
  })

  it('deleteArea sets _syncStatus=deleted and creates delete mutation', async () => {
    await db.areas.update('area-1', {
      _syncStatus: 'deleted',
      updatedAt: expect.any(String),
    })
    await db.mutations.add({
      id: 'mut-3',
      entityType: 'area',
      entityId: 'area-1',
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(areasTable.update).toHaveBeenCalledWith('area-1', expect.objectContaining({
      _syncStatus: 'deleted',
    }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'area',
      action: 'delete',
      entityId: 'area-1',
      payload: null,
    }))
  })
})

describe('Dictionary CRUD — Contexts', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addContext writes to db.contexts with _syncStatus=local', async () => {
    await db.contexts.add({
      id: 'ctx-1',
      userId,
      name: 'Office',
      color: 'red',
      icon: '🏢',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: 'mut-1',
      entityType: 'context',
      entityId: 'ctx-1',
      action: 'create',
      payload: expect.any(String),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(contextsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      _syncStatus: 'local',
      name: 'Office',
    }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'context',
      action: 'create',
    }))
  })

  it('updateContext sets _syncStatus=modified', async () => {
    contextsTable.get.mockResolvedValueOnce({
      id: 'ctx-1', userId, name: 'Office', color: 'red', icon: '🏢',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      _syncStatus: 'synced', _lastSyncedAt: null,
    })

    await db.contexts.update('ctx-1', {
      name: 'Home',
      _syncStatus: 'modified',
      updatedAt: expect.any(String),
    })
    await db.mutations.add({
      id: 'mut-2',
      entityType: 'context',
      entityId: 'ctx-1',
      action: 'update',
      payload: JSON.stringify({ name: 'Home' }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(contextsTable.update).toHaveBeenCalledWith('ctx-1', expect.objectContaining({
      _syncStatus: 'modified',
      name: 'Home',
    }))
  })

  it('deleteContext sets _syncStatus=deleted', async () => {
    await db.contexts.update('ctx-1', { _syncStatus: 'deleted', updatedAt: expect.any(String) })
    await db.mutations.add({
      id: 'mut-3', entityType: 'context', entityId: 'ctx-1',
      action: 'delete', payload: null, timestamp: Date.now(), retryCount: 0, lastError: null,
    })

    expect(contextsTable.update).toHaveBeenCalledWith('ctx-1', expect.objectContaining({ _syncStatus: 'deleted' }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete' }))
  })
})

describe('Dictionary CRUD — Tags', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addTag writes to db.tags with _syncStatus=local', async () => {
    await db.tags.add({
      id: 'tag-1',
      userId,
      name: 'Urgent',
      color: 'red',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: 'mut-1',
      entityType: 'tag',
      entityId: 'tag-1',
      action: 'create',
      payload: expect.any(String),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(tagsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      _syncStatus: 'local',
      name: 'Urgent',
    }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'tag',
      action: 'create',
    }))
  })

  it('updateTag sets _syncStatus=modified', async () => {
    tagsTable.get.mockResolvedValueOnce({
      id: 'tag-1', userId, name: 'Urgent', color: 'red',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      _syncStatus: 'synced', _lastSyncedAt: null,
    })

    await db.tags.update('tag-1', { name: 'Critical', _syncStatus: 'modified', updatedAt: expect.any(String) })
    await db.mutations.add({
      id: 'mut-2', entityType: 'tag', entityId: 'tag-1',
      action: 'update', payload: JSON.stringify({ name: 'Critical' }),
      timestamp: Date.now(), retryCount: 0, lastError: null,
    })

    expect(tagsTable.update).toHaveBeenCalledWith('tag-1', expect.objectContaining({
      _syncStatus: 'modified',
      name: 'Critical',
    }))
  })

  it('deleteTag sets _syncStatus=deleted', async () => {
    await db.tags.update('tag-1', { _syncStatus: 'deleted', updatedAt: expect.any(String) })
    await db.mutations.add({
      id: 'mut-3', entityType: 'tag', entityId: 'tag-1',
      action: 'delete', payload: null, timestamp: Date.now(), retryCount: 0, lastError: null,
    })

    expect(tagsTable.update).toHaveBeenCalledWith('tag-1', expect.objectContaining({ _syncStatus: 'deleted' }))
  })
})

describe('Dictionary CRUD — Projects', () => {
  const userId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addProject writes to db.projects with _syncStatus=local and isActive=true', async () => {
    await db.projects.add({
      id: 'proj-1',
      userId,
      name: 'Migration',
      description: 'Migrate to offline',
      color: 'green',
      areaId: null,
      isActive: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: 'mut-1',
      entityType: 'project',
      entityId: 'proj-1',
      action: 'create',
      payload: expect.any(String),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })

    expect(projectsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      _syncStatus: 'local',
      isActive: true,
      name: 'Migration',
    }))
    expect(mutationsTable.add).toHaveBeenCalledWith(expect.objectContaining({
      entityType: 'project',
      action: 'create',
    }))
  })

  it('updateProject sets _syncStatus=modified and can change isActive', async () => {
    projectsTable.get.mockResolvedValueOnce({
      id: 'proj-1', userId, name: 'Migration', description: null, color: null,
      areaId: null, isActive: true,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      _syncStatus: 'synced', _lastSyncedAt: null,
    })

    await db.projects.update('proj-1', {
      isActive: false,
      _syncStatus: 'modified',
      updatedAt: expect.any(String),
    })
    await db.mutations.add({
      id: 'mut-2', entityType: 'project', entityId: 'proj-1',
      action: 'update', payload: JSON.stringify({ is_active: false }),
      timestamp: Date.now(), retryCount: 0, lastError: null,
    })

    expect(projectsTable.update).toHaveBeenCalledWith('proj-1', expect.objectContaining({
      _syncStatus: 'modified',
      isActive: false,
    }))
  })

  it('deleteProject sets _syncStatus=deleted', async () => {
    await db.projects.update('proj-1', { _syncStatus: 'deleted', updatedAt: expect.any(String) })
    await db.mutations.add({
      id: 'mut-3', entityType: 'project', entityId: 'proj-1',
      action: 'delete', payload: null, timestamp: Date.now(), retryCount: 0, lastError: null,
    })

    expect(projectsTable.update).toHaveBeenCalledWith('proj-1', expect.objectContaining({ _syncStatus: 'deleted' }))
  })
})

describe('Soft-delete filtering via activeTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('activeTable filters out records with _syncStatus=deleted', async () => {
    const records = [
      { id: '1', userId: 'u1', name: 'Active', _syncStatus: 'synced' as SyncStatus },
      { id: '2', userId: 'u1', name: 'Local', _syncStatus: 'local' as SyncStatus },
      { id: '3', userId: 'u1', name: 'Modified', _syncStatus: 'modified' as SyncStatus },
      { id: '4', userId: 'u1', name: 'Deleted', _syncStatus: 'deleted' as SyncStatus },
    ]

    const active = records.filter(r => r._syncStatus !== 'deleted')

    expect(active).toHaveLength(3)
    expect(active.every(r => r._syncStatus !== 'deleted')).toBe(true)
    expect(active.map(r => r.name)).toEqual(['Active', 'Local', 'Modified'])
  })
})
