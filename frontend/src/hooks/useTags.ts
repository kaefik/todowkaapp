import { v4 as uuidv4 } from 'uuid'

import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface Tag {
  id: string
  name: string
  color: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTag {
  name: string
  color?: string | null
}

export interface UpdateTag {
  name?: string
  color?: string | null
}

interface UseTagsReturn {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  addTag: (data: CreateTag) => Promise<void>
  updateTag: (id: string, data: UpdateTag) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const tagKeys = {
  all: ['tags'] as const,
  lists: () => [...tagKeys.all, 'list'] as const,
  detail: (id: string) => [...tagKeys.all, 'detail', id] as const,
}

export function useTags(): UseTagsReturn {
  const user = useAuthStore(s => s.user)

  const { data: tags = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.tags, user.id).toArray()
      return records.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        user_id: t.userId,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
      }))
    },
    [user?.id]
  )

  const addTag = async (data: CreateTag) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.tags.add({
      id,
      userId: user.id,
      name: data.name,
      color: data.color ?? null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'tag',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateTag = async (id: string, data: UpdateTag) => {
    if (!user) return
    const existing = await db.tags.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.name !== undefined) updates.name = data.name
    if (data.color !== undefined) updates.color = data.color
    await db.tags.update(id, updates)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'tag',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteTag = async (id: string) => {
    if (!user) return
    await db.tags.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'tag',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    tags,
    isLoading,
    error: null,
    addTag,
    updateTag,
    deleteTag,
    refetch: async () => {},
  }
}
