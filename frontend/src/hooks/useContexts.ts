import { v4 as uuidv4 } from 'uuid'

import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface Context {
  id: string
  name: string
  color: string | null
  icon: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateContext {
  name: string
  color?: string | null
  icon?: string | null
}

export interface UpdateContext {
  name?: string
  color?: string | null
  icon?: string | null
}

interface UseContextsReturn {
  contexts: Context[]
  isLoading: boolean
  error: string | null
  addContext: (data: CreateContext) => Promise<void>
  updateContext: (id: string, data: UpdateContext) => Promise<void>
  deleteContext: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const contextKeys = {
  all: ['contexts'] as const,
  lists: () => [...contextKeys.all, 'list'] as const,
  detail: (id: string) => [...contextKeys.all, 'detail', id] as const,
}

export function useContexts(): UseContextsReturn {
  const user = useAuthStore(s => s.user)

  const { data: contexts = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.contexts, user.id).toArray()
      return records.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        user_id: c.userId,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }))
    },
    [user?.id]
  )

  const addContext = async (data: CreateContext) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.contexts.add({
      id,
      userId: user.id,
      name: data.name,
      color: data.color ?? null,
      icon: data.icon ?? null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'context',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateContext = async (id: string, data: UpdateContext) => {
    if (!user) return
    const existing = await db.contexts.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.name !== undefined) updates.name = data.name
    if (data.color !== undefined) updates.color = data.color
    if (data.icon !== undefined) updates.icon = data.icon
    await db.contexts.update(id, updates)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'context',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteContext = async (id: string) => {
    if (!user) return
    await db.contexts.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'context',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    contexts,
    isLoading,
    error: null,
    addContext,
    updateContext,
    deleteContext,
    refetch: async () => {},
  }
}
