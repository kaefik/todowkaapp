import { v4 as uuidv4 } from 'uuid'

import { db } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface ChecklistItem {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

interface UseChecklistReturn {
  items: ChecklistItem[]
  isLoading: boolean
  error: string | null
  addItem: (title: string) => Promise<void>
  toggleItem: (id: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useChecklist(taskId: string | null): UseChecklistReturn {
  const user = useAuthStore(s => s.user)

  const { data: items = [], isLoading } = useDexieQuery(
    async () => {
      if (!taskId || !user) return []
      const records = await db.checklistItems
        .where('taskId')
        .equals(taskId)
        .filter(i => i._syncStatus !== 'deleted')
        .sortBy('position')
      return records.map(r => ({
        id: r.id,
        task_id: r.taskId,
        title: r.title,
        is_completed: r.isCompleted,
        position: r.position,
        completed_at: r.completedAt,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
      }))
    },
    [user?.id, taskId]
  )

  const addItem = async (title: string) => {
    if (!taskId || !user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    const existing = await db.checklistItems
      .where('taskId')
      .equals(taskId)
      .filter(i => i._syncStatus !== 'deleted')
      .count()
    await db.checklistItems.add({
      id,
      taskId,
      title,
      isCompleted: false,
      position: existing,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'checklistItem',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ title, position: existing, task_id: taskId, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const toggleItem = async (id: string) => {
    if (!user) return
    const existing = await db.checklistItems.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    await db.checklistItems.update(id, {
      isCompleted: !existing.isCompleted,
      completedAt: existing.isCompleted ? null : now,
      updatedAt: now,
      _syncStatus: 'modified',
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'checklistItem',
      entityId: id,
      action: 'update',
      payload: JSON.stringify({ is_completed: !existing.isCompleted }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteItem = async (id: string) => {
    if (!user) return
    await db.checklistItems.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'checklistItem',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    items,
    isLoading,
    error: null,
    addItem,
    toggleItem,
    deleteItem,
    refetch: async () => {},
  }
}
