import { v4 as uuidv4 } from 'uuid'

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
}

export interface CreateArea {
  name: string
  description?: string | null
  color?: string | null
}

export interface UpdateArea {
  name?: string
  description?: string | null
  color?: string | null
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
      return records.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        color: a.color,
        user_id: a.userId,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      }))
    },
    [user?.id]
  )

  const addArea = async (data: CreateArea) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.areas.add({
      id,
      userId: user.id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
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
