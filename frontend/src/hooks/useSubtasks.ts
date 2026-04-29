import { v4 as uuidv4 } from 'uuid'

import { db } from '../db/database'
import { useDexieQuery } from '../db/hooks'

export interface ChecklistItem {
  id: string
  taskId: string
  title: string
  isCompleted: boolean
  position: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

interface UseSubtasksReturn {
  subtasks: ChecklistItem[]
  isLoading: boolean
  error: string | null
  addSubtask: (title: string) => Promise<void>
  toggleSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useSubtasks(taskId: string | null): UseSubtasksReturn {
  const { data: subtasks = [], isLoading } = useDexieQuery(
    async () => {
      if (!taskId) return []
      return db.checklistItems
        .where('taskId')
        .equals(taskId)
        .filter(i => i._syncStatus !== 'deleted')
        .toArray()
    },
    [taskId]
  )

  const addSubtask = async (title: string) => {
    if (!taskId) return
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
      userId: '',
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
      payload: JSON.stringify({ task_id: taskId, title, position: existing, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const toggleSubtask = async (id: string) => {
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
      payload: JSON.stringify({ is_completed: !existing.isCompleted, task_id: existing.taskId }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteSubtask = async (id: string) => {
    const existing = await db.checklistItems.get(id)
    await db.checklistItems.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'checklistItem',
      entityId: id,
      action: 'delete',
      payload: JSON.stringify({ task_id: existing?.taskId }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    subtasks,
    isLoading,
    error: null,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    refetch: async () => {},
  }
}
