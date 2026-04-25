import { db, type SyncStatus } from './database'
import { shouldSkipMerge, mergeRecord } from './conflictResolution'
import { apiTaskToDb } from './mappers'
import { httpClient, ApiError } from '../api/httpClient'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'

type EntityType = 'task' | 'project' | 'area' | 'context' | 'tag' | 'verbTemplate'

interface SyncResourceConfig {
  endpoint: string
  table: typeof db.tasks | typeof db.projects | typeof db.areas | typeof db.contexts | typeof db.tags | typeof db.verbTemplates
  entityType: EntityType
  transform: (item: Record<string, unknown>, userId: string) => Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null }
}

function makeTransform(
  mapFn: (item: Record<string, unknown>, userId: string) => Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null }
): (item: Record<string, unknown>, userId: string) => Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null } {
  return mapFn
}

const RESOURCES: SyncResourceConfig[] = [
  {
    endpoint: '/tasks',
    table: db.tasks,
    entityType: 'task',
    transform: makeTransform((item, userId) => apiTaskToDb(item, userId) as unknown as Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null }),
  },
  {
    endpoint: '/projects',
    table: db.projects,
    entityType: 'project',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      name: item.name as string,
      description: (item.description as string | null) ?? null,
      color: (item.color as string | null) ?? null,
      areaId: (item.area_id as string | null) ?? null,
      isActive: (item.is_active as boolean) ?? true,
      sortOrder: (item.sort_order as number) ?? 0,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
  {
    endpoint: '/contexts',
    table: db.contexts,
    entityType: 'context',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      name: item.name as string,
      color: (item.color as string | null) ?? null,
      icon: (item.icon as string | null) ?? null,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
  {
    endpoint: '/areas',
    table: db.areas,
    entityType: 'area',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      name: item.name as string,
      description: (item.description as string | null) ?? null,
      color: (item.color as string | null) ?? null,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
  {
    endpoint: '/tags',
    table: db.tags,
    entityType: 'tag',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      name: item.name as string,
      color: (item.color as string | null) ?? null,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
  {
    endpoint: '/verb-templates',
    table: db.verbTemplates,
    entityType: 'verbTemplate',
    transform: makeTransform((item, userId) => ({
      id: item.id as string,
      userId,
      text: item.text as string,
      icon: item.icon as string,
      position: (item.position as number) ?? 0,
      createdAt: (item.created_at as string) ?? new Date().toISOString(),
      updatedAt: (item.updated_at as string) ?? new Date().toISOString(),
      _syncStatus: 'synced' as SyncStatus,
      _lastSyncedAt: new Date().toISOString(),
    })),
  },
]

async function fetchAllPages(endpoint: string): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = []
  let offset = 0
  const limit = 100

  while (true) {
    const response = await httpClient.get<{ items: Record<string, unknown>[]; total: number }>(
      `${endpoint}?limit=${limit}&offset=${offset}`
    )
    const { items, total } = response.data
    allItems.push(...items)
    offset += limit
    if (offset >= total) break
  }

  return allItems
}

async function mergeAndPut(
  table: SyncResourceConfig['table'],
  entityType: EntityType,
  items: Record<string, unknown>[],
  userId: string,
  transform: SyncResourceConfig['transform']
): Promise<void> {
  for (const item of items) {
    const id = item.id as string
    const skip = await shouldSkipMerge(entityType, id)
    if (skip) continue

    const serverRecord = transform(item, userId)
    const localRecord = await table.get(id)
    const merged = mergeRecord(localRecord as Record<string, unknown> & { updatedAt: string; _syncStatus: SyncStatus; _lastSyncedAt: string | null } | undefined, serverRecord)

    try {
      await table.put(merged as never)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        useToastStore.getState().addToast({
          title: 'Хранилище заполнено',
          body: 'Синхронизация остановлена. Освободите место.',
          type: 'error',
        })
        throw err
      }
      throw err
    }
  }
}

let _initialSyncDone = false
let _initialSyncPromise: Promise<void> | null = null

export function isInitialSyncDone(): boolean {
  return _initialSyncDone
}

export function getInitialSyncPromise(): Promise<void> | null {
  return _initialSyncPromise
}

export async function initialSync(userId: string): Promise<void> {
  _initialSyncPromise = initialSyncInternal(userId)
  try {
    await _initialSyncPromise
  } finally {
    _initialSyncDone = true
    _initialSyncPromise = null
  }
}

async function initialSyncInternal(userId: string): Promise<void> {
  for (const resource of RESOURCES) {
    const items = await fetchAllPages(resource.endpoint)
    await mergeAndPut(resource.table, resource.entityType, items, userId, resource.transform)
  }
}

export async function pull(userId: string): Promise<void> {
  for (const resource of RESOURCES) {
    const items = await fetchAllPages(resource.endpoint)
    await mergeAndPut(resource.table, resource.entityType, items, userId, resource.transform)
  }
}

interface MergedMutations {
  toSend: {
    id: string
    action: string
    entityId: string
    entityType: EntityType
    payload: string | null
    retryCount: number
  }[]
  toDelete: string[]
}

function deduplicateMutations(
  mutations: {
    id: string
    action: string
    entityId: string
    entityType: EntityType
    payload: string | null
    retryCount: number
    timestamp: number
  }[]
): MergedMutations {
  const grouped = new Map<string, typeof mutations>()

  for (const m of mutations) {
    const key = `${m.entityType}:${m.entityId}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(m)
  }

  const toSend: MergedMutations['toSend'] = []
  const toDelete: string[] = []

  const sentIds = new Set<string>()

  for (const [, group] of grouped) {
    const first = group[0]
    if (!first) continue

    if (group.length === 1) {
      toSend.push(first)
      sentIds.add(first.id)
      continue
    }

    const hasCreate = group.some(m => m.action === 'create')
    const hasDelete = group.some(m => m.action === 'delete')

    if (hasCreate && hasDelete) {
      for (const m of group) toDelete.push(m.id)
      const table = getTableForType(first.entityType)
      table.delete(first.entityId).catch(() => {})
      continue
    }

    const updatePayloads: Record<string, unknown> = {}
    for (const m of group) {
      if (m.action === 'update' && m.payload) {
        Object.assign(updatePayloads, JSON.parse(m.payload))
      }
    }

    if (hasDelete) {
      const del = group.find(m => m.action === 'delete')!
      toSend.push(del)
      sentIds.add(del.id)
      continue
    }

    if (hasCreate) {
      const create = group.find(m => m.action === 'create')!
      const createPayload = create.payload ? JSON.parse(create.payload) : {}
      Object.assign(createPayload, updatePayloads)
      toSend.push({ ...create, payload: JSON.stringify(createPayload) })
      sentIds.add(create.id)

      const lastAction = [...group].reverse().find(m => m.action !== 'create' && m.action !== 'update')
      if (lastAction) {
        toSend.push(lastAction)
        sentIds.add(lastAction.id)
      }
      continue
    }

    const hasOtherActions = group.some(m => m.action !== 'update')

    if (Object.keys(updatePayloads).length > 0) {
      const lastUpdate = [...group].reverse().find(m => m.action === 'update')!
      toSend.push({ ...lastUpdate, payload: JSON.stringify(updatePayloads) })
      sentIds.add(lastUpdate.id)
    }

    if (hasOtherActions) {
      const lastOther = [...group].reverse().find(m => m.action !== 'update')!
      toSend.push(lastOther)
      sentIds.add(lastOther.id)
    }
  }

  for (const m of mutations) {
    if (!sentIds.has(m.id)) {
      toDelete.push(m.id)
    }
  }

  return { toSend, toDelete }
}

function getTableForType(entityType: EntityType) {
  switch (entityType) {
    case 'task': return db.tasks
    case 'project': return db.projects
    case 'area': return db.areas
    case 'context': return db.contexts
    case 'tag': return db.tags
    case 'verbTemplate': return db.verbTemplates
  }
}

function getEndpointForType(entityType: EntityType): string {
  switch (entityType) {
    case 'task': return '/tasks'
    case 'project': return '/projects'
    case 'area': return '/areas'
    case 'context': return '/contexts'
    case 'tag': return '/tags'
    case 'verbTemplate': return '/verb-templates'
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function push(): Promise<void> {
  const userId = useAuthStore.getState().user?.id
  if (!userId) return

  const allMutations = await db.mutations.orderBy('timestamp').toArray()
  if (allMutations.length === 0) return

  const { toSend, toDelete } = deduplicateMutations(allMutations)

  for (const id of toDelete) {
    await db.mutations.delete(id)
  }

  for (const mutation of toSend) {
    let success = false

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await executeMutation(mutation)
        success = true
        break
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            try {
              await useAuthStore.getState().refreshToken()
              continue
            } catch {
              useAuthStore.getState().logout()
              return
            }
          }

          if (err.status === 404) {
            console.debug(`[SyncEngine] 404 for ${mutation.action} ${mutation.entityType}/${mutation.entityId}: already gone`)
            const table = getTableForType(mutation.entityType)
            await table.delete(mutation.entityId).catch(() => {})
            await db.mutations.delete(mutation.id)
            success = true
            break
          }

          if (err.status === 409) {
            if (mutation.action === 'create') {
              success = true
              break
            }
            console.warn(`[SyncEngine] 409 for ${mutation.action} ${mutation.entityType}/${mutation.entityId}:`, err.message)
            await db.mutations.delete(mutation.id)
            success = true
            break
          }

          if (err.status === 422) {
            console.warn(`[SyncEngine] 422 for ${mutation.entityType}/${mutation.entityId}:`, err.message)
            await db.mutations.delete(mutation.id)
            success = true
            break
          }

          if (err.status >= 500) {
            if (attempt < 2) {
              await sleep(1000 * Math.pow(2, attempt))
              continue
            }
            console.error(`[SyncEngine] 500 after 3 retries for ${mutation.entityType}/${mutation.entityId}`)
            await db.mutations.update(mutation.id, {
              retryCount: mutation.retryCount + 1,
              lastError: err.message,
            })
            break
          }
        }

        if (err instanceof TypeError) {
          console.warn('[SyncEngine] Network error, stopping push')
          return
        }

        console.error('[SyncEngine] Unexpected error:', err)
        await db.mutations.update(mutation.id, {
          retryCount: mutation.retryCount + 1,
          lastError: err instanceof Error ? err.message : String(err),
        })
        break
      }
    }

    if (success) {
      await db.mutations.delete(mutation.id)
      const table = getTableForType(mutation.entityType)
      await table.update(mutation.entityId, {
        _syncStatus: 'synced',
        _lastSyncedAt: new Date().toISOString(),
      }).catch(() => {})
    }
  }

  try {
    await pull(userId)
  } catch (err) {
    console.warn('[SyncEngine] Pull after push failed:', err)
  }
}

async function executeMutation(
  mutation: {
    action: string
    entityId: string
    entityType: EntityType
    payload: string | null
  }
): Promise<void> {
  const endpoint = getEndpointForType(mutation.entityType)
  const payload = mutation.payload ? JSON.parse(mutation.payload) : null

  switch (mutation.action) {
    case 'create': {
      await httpClient.post(endpoint, payload)
      break
    }
    case 'update': {
      await httpClient.put(`${endpoint}/${mutation.entityId}`, payload)
      break
    }
    case 'toggle': {
      await httpClient.patch(`${endpoint}/${mutation.entityId}/toggle`)
      break
    }
    case 'move': {
      const body = mutation.payload ? JSON.parse(mutation.payload) : {}
      await httpClient.patch(`${endpoint}/${mutation.entityId}/move`, body)
      break
    }
    case 'reorder': {
      const body = mutation.payload ? JSON.parse(mutation.payload) : {}
      await httpClient.put(`${endpoint}/reorder`, body)
      break
    }
    case 'delete': {
      await httpClient.delete(`${endpoint}/${mutation.entityId}`)
      break
    }
    default:
      console.warn(`[SyncEngine] Unknown action: ${mutation.action}`)
  }
}
