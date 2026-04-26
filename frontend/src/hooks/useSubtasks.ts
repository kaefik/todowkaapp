import { v4 as uuidv4 } from 'uuid'

import { db } from '../db/database'
import { dbTaskToUi } from '../db/mappers'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'
import type { Task } from './useTasks'

interface UseSubtasksReturn {
  subtasks: Task[]
  isLoading: boolean
  error: string | null
  addSubtask: (title: string, description?: string) => Promise<void>
  toggleSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useSubtasks(parentTaskId: string | null): UseSubtasksReturn {
  const user = useAuthStore(s => s.user)

  const { data: subtasks = [], isLoading } = useDexieQuery(
    async () => {
      if (!parentTaskId || !user) return []
      const records = await db.tasks
        .where('parentTaskId')
        .equals(parentTaskId)
        .filter(t => t._syncStatus !== 'deleted')
        .toArray()
      const uiTasks = await Promise.all(records.map(dbTaskToUi))
      return uiTasks as Task[]
    },
    [user?.id, parentTaskId]
  )

  const addSubtask = async (title: string, description?: string) => {
    if (!parentTaskId || !user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.tasks.add({
      id,
      userId: user.id,
      title,
      description: description ?? null,
      isCompleted: false,
      completedAt: null,
      gtdStatus: 'inbox',
      contextId: null,
      areaId: null,
      projectId: null,
      parentTaskId,
      position: 0,
      dueDate: null,
      notes: null,
      recurrenceType: null,
      recurrenceConfig: null,
      recurrenceEndDate: null,
      reminderTime: null,
      reminderOffsets: null,
      reminderFired: false,
      deadlineNotified: false,
      isRecurring: false,
      tagIds: [],
      trashedAt: null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ title, description, parent_task_id: parentTaskId, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const toggleSubtask = async (id: string) => {
    if (!user) return
    const existing = await db.tasks.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    await db.tasks.update(id, {
      isCompleted: !existing.isCompleted,
      completedAt: existing.isCompleted ? null : now,
      updatedAt: now,
      _syncStatus: 'modified',
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'toggle',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteSubtask = async (id: string) => {
    if (!user) return
    await db.tasks.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'delete',
      payload: null,
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
