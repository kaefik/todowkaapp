import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import i18n from '../i18n'

import { db, activeTasks } from '../db/database'
import { dbTaskToUi, type UiTask } from '../db/mappers'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'
import type { Tag } from './useTags'

export type GtdStatus = 'inbox' | 'active' | 'next' | 'waiting' | 'someday' | 'completed' | 'trash'

export interface RecurrenceConfig {
  type: 'daily' | 'weekly' | 'monthly'
  interval: number
  days?: number[]
  day_of_month?: number
  week_of_month?: number
  day_of_week?: number
}

export interface ProjectBrief {
  id: string
  name: string
  color: string | null
  is_active: boolean
}

export interface ContextBrief {
  id: string
  name: string
  color: string | null
  icon: string | null
}

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  gtd_status: GtdStatus
  context_id: string | null
  area_id: string | null
  project_id: string | null
  project: ProjectBrief | null
  context: ContextBrief | null
  position: number
  due_date: string | null
  notes: string | null
  recurrence_type: string | null
  recurrence_config: RecurrenceConfig | null
  recurrence_end_date: string | null
  reminder_time: string | null
  reminder_offsets: number[] | null
  reminder_fired: boolean
  is_recurring: boolean
  tags: Tag[]
  checklist_total: number
  checklist_completed: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTask {
  title: string
  description?: string
  gtd_status?: GtdStatus
  due_date?: string | null
  context_id?: string | null
  area_id?: string | null
  project_id?: string | null
  tag_ids?: string[]
}

export interface UpdateTask {
  title?: string
  description?: string | null
  completed?: boolean
  gtd_status?: GtdStatus
  context_id?: string | null
  area_id?: string | null
  project_id?: string | null
  due_date?: string | null
  notes?: string | null
  tag_ids?: string[]
  recurrence_type?: string | null
  recurrence_config?: RecurrenceConfig | null
  recurrence_end_date?: string | null
  reminder_time?: string | null
  reminder_offsets?: number[] | null
}

export interface TaskFilters {
  gtd_status?: GtdStatus
  context_id?: string
  area_id?: string
  project_id?: string
  no_project?: boolean
  tag_id?: string
  is_completed?: boolean
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  due_date_from?: string
  due_date_to?: string
}

interface UseTasksReturn {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  addTask: (data: CreateTask) => Promise<void>
  updateTask: (id: string, data: UpdateTask) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  moveTask: (id: string, gtd_status: GtdStatus) => Promise<void>
  restoreTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  fetchTask: (id: string) => Promise<Task>
  refetch: () => Promise<unknown>
}

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

function applyFilters(records: UiTask[], filters?: TaskFilters): UiTask[] {
  let result = records
  if (filters?.gtd_status) {
    result = result.filter(t => t.gtd_status === filters.gtd_status)
  }
  if (filters?.context_id) {
    result = result.filter(t => t.context_id === filters.context_id)
  }
  if (filters?.area_id) {
    result = result.filter(t => t.area_id === filters.area_id)
  }
  if (filters?.project_id) {
    result = result.filter(t => t.project_id === filters.project_id)
  }
  if (filters?.no_project) {
    result = result.filter(t => !t.project_id)
  }
  if (filters?.tag_id) {
    result = result.filter(t => t.tags.some(tag => tag.id === filters.tag_id))
  }
  if (filters?.is_completed !== undefined) {
    result = result.filter(t => t.completed === filters.is_completed)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(t => t.title.toLowerCase().includes(q))
  }
  if (filters?.due_date_from) {
    result = result.filter(t => t.due_date !== null && t.due_date >= filters.due_date_from!)
  }
  if (filters?.due_date_to) {
    result = result.filter(t => t.due_date !== null && t.due_date <= filters.due_date_to!)
  }
  if (filters?.sort_by) {
    const dir = filters.sort_order === 'desc' ? -1 : 1
    result.sort((a, b) => {
      const aVal = a[filters.sort_by as keyof UiTask]
      const bVal = b[filters.sort_by as keyof UiTask]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (aVal < bVal) return -1 * dir
      if (aVal > bVal) return 1 * dir
      return 0
    })
  } else {
    result.sort((a, b) => a.position - b.position)
  }
  return result
}

export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const user = useAuthStore(s => s.user)

  const { data: rawTasks = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const dbRecords = await activeTasks(user.id).toArray()
      const uiTasks = await Promise.all(dbRecords.map(dbTaskToUi))
      return applyFilters(uiTasks, filters)
    },
    [user?.id]
  )

  const tasks = rawTasks as Task[]

  const addTask = async (data: CreateTask) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.tasks.add({
      id,
      userId: user.id,
      title: data.title,
      description: data.description ?? null,
      isCompleted: false,
      completedAt: null,
      gtdStatus: data.gtd_status ?? (data.due_date ? 'active' : 'someday'),
      contextId: data.context_id ?? null,
        areaId: data.area_id ?? null,
        projectId: data.project_id ?? null,
        position: 0,
      dueDate: data.due_date ?? null,
      notes: null,
      recurrenceType: null,
      recurrenceConfig: null,
      recurrenceEndDate: null,
      reminderTime: null,
      reminderOffsets: null,
      reminderFired: false,
      deadlineNotified: false,
      isRecurring: false,
      tagIds: data.tag_ids ?? [],
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
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateTask = async (id: string, data: UpdateTask) => {
    if (!user) return
    const existing = await db.tasks.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.completed !== undefined) {
      updates.isCompleted = data.completed
      updates.completedAt = data.completed ? now : null
    }
    if (data.gtd_status !== undefined) updates.gtdStatus = data.gtd_status
    if (data.context_id !== undefined) updates.contextId = data.context_id
    if (data.area_id !== undefined) updates.areaId = data.area_id
    if (data.project_id !== undefined) updates.projectId = data.project_id
    if (data.due_date !== undefined) updates.dueDate = data.due_date
    if (data.due_date !== undefined && data.due_date !== null && existing.gtdStatus === 'inbox') {
      updates.gtdStatus = 'active'
    }
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.tag_ids !== undefined) updates.tagIds = data.tag_ids
    if (data.recurrence_type !== undefined) updates.recurrenceType = data.recurrence_type
    if (data.recurrence_config !== undefined) {
      updates.recurrenceConfig = data.recurrence_config ? JSON.stringify(data.recurrence_config) : null
    }
    if (data.recurrence_end_date !== undefined) updates.recurrenceEndDate = data.recurrence_end_date
    if (data.reminder_time !== undefined) updates.reminderTime = data.reminder_time
    if (data.reminder_offsets !== undefined) {
      updates.reminderOffsets = data.reminder_offsets ? JSON.stringify(data.reminder_offsets) : null
    }
    await db.tasks.update(id, updates as never)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const toggleTask = async (id: string) => {
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

  const moveTask = async (id: string, gtd_status: GtdStatus) => {
    if (!user) return
    const now = new Date().toISOString()
    await db.tasks.update(id, {
      gtdStatus: gtd_status,
      updatedAt: now,
      _syncStatus: 'modified',
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'move',
      payload: JSON.stringify({ gtd_status }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const restoreTask = async (id: string) => {
    if (!user) return
    const now = new Date().toISOString()
    await db.tasks.update(id, {
      gtdStatus: 'inbox',
      dueDate: null,
      reminderTime: null,
      reminderOffsets: null,
      reminderFired: false,
      trashedAt: null,
      updatedAt: now,
      _syncStatus: 'modified',
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'task',
      entityId: id,
      action: 'move',
      payload: JSON.stringify({ gtd_status: 'inbox' }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteTask = async (id: string) => {
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

  const fetchTask = useCallback(async (id: string): Promise<Task> => {
    const record = await db.tasks.get(id)
    if (!record) throw new Error(i18n.t('tasks:taskNotFoundMaybe'))
    if (record._syncStatus === 'deleted') throw new Error(i18n.t('tasks:taskDeleted'))
    return dbTaskToUi(record) as Promise<Task>
  }, [])

  return {
    tasks,
    isLoading,
    error: null,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    restoreTask,
    deleteTask,
    fetchTask,
    refetch: async () => {},
  }
}

export function useTask(id: string) {
  const user = useAuthStore(s => s.user)

  const { data, isLoading } = useDexieQuery(
    async () => {
      if (!user || !id) return null
      const record = await db.tasks.get(id)
      if (!record || record._syncStatus === 'deleted') return null
      return dbTaskToUi(record)
    },
    [user?.id, id]
  )

  return {
    data: data ?? null,
    isLoading,
    error: null,
  }
}
