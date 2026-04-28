import { v4 as uuidv4 } from 'uuid'

import { httpClient } from '../api/httpClient'
import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface Area {
  id: string
  name: string
  description: string | null
  color: string | null
  user_id: string
  created_at: string
  updated_at: string
  sort_order: number
}

export interface CreateArea {
  name: string
  description?: string | null
  color?: string | null
  sort_order?: number
}

export interface UpdateArea {
  name?: string
  description?: string | null
  color?: string | null
  sort_order?: number
}

interface UseAreasReturn {
  areas: Area[]
  isLoading: boolean
  error: string | null
  addArea: (data: CreateArea) => Promise<void>
  updateArea: (id: string, data: UpdateArea) => Promise<void>
  deleteArea: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const areaKeys = {
  all: ['areas'] as const,
  lists: () => [...areaKeys.all, 'list'] as const,
  detail: (id: string) => [...areaKeys.all, 'detail', id] as const,
}

export function useAreas(): UseAreasReturn {
  const user = useAuthStore(s => s.user)

  const { data: areas = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.areas, user.id).toArray()
      records.sort((a, b) => a.sortOrder - b.sortOrder)
      return records.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        color: a.color,
        user_id: a.userId,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        sort_order: a.sortOrder,
      }))
    },
    [user?.id]
  )

  const addArea = async (data: CreateArea) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    const existingAreas = await activeTable(db.areas, user.id).toArray()
    const maxSortOrder = existingAreas.reduce((max, a) => Math.max(max, a.sortOrder), -1)
    await db.areas.add({
      id,
      userId: user.id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      sortOrder: data.sort_order ?? (maxSortOrder + 1),
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'area',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateArea = async (id: string, data: UpdateArea) => {
    if (!user) return
    const existing = await db.areas.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.name !== undefined) updates.name = data.name
    if (data.description !== undefined) updates.description = data.description
    if (data.color !== undefined) updates.color = data.color
    if (data.sort_order !== undefined) updates.sortOrder = data.sort_order
    await db.areas.update(id, updates)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'area',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteArea = async (id: string) => {
    if (!user) return
    await db.areas.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'area',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    areas,
    isLoading,
    error: null,
    addArea,
    updateArea,
    deleteArea,
    refetch: async () => {},
  }
}

export type AreaSortMode = 'name' | 'date' | 'projects'

export async function reorderAreas(items: { id: string; sort_order: number }[]): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  for (const item of items) {
    await db.areas.update(item.id, {
      sortOrder: item.sort_order,
      updatedAt: new Date().toISOString(),
      _syncStatus: 'modified',
    })
  }

  try {
    await httpClient.put('/areas/reorder', {
      items: items.map(i => ({ id: i.id, sort_order: i.sort_order })),
    })
    for (const item of items) {
      await db.areas.update(item.id, {
        _syncStatus: 'synced',
        _lastSyncedAt: new Date().toISOString(),
      })
    }
  } catch {
    // will be synced later via SyncEngine push
  }
}

export function autoSortAreas(
  areas: Area[],
  mode: AreaSortMode
): { id: string; sort_order: number }[] {
  const sorted = [...areas]
  switch (mode) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
    case 'date':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'projects':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
  }
  return sorted.map((a, i) => ({ id: a.id, sort_order: i }))
}
