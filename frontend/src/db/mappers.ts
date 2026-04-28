import { db, type DbTask } from './database'
import type { Tag } from '../hooks/useTags'

export interface UiTask {
  id: string
  title: string
  description: string | null
  completed: boolean
  gtd_status: string
  context_id: string | null
  area_id: string | null
  area: { id: string; name: string; color: string | null } | null
  project_id: string | null
  project: { id: string; name: string; color: string | null; is_active: boolean } | null
  context: { id: string; name: string; color: string | null; icon: string | null } | null
  position: number
  due_date: string | null
  notes: string | null
  recurrence_type: string | null
  recurrence_config: unknown
  recurrence_end_date: string | null
  reminder_time: string | null
  reminder_offsets: number[] | null
  reminder_fired: boolean
  deadline_notified: boolean
  is_recurring: boolean
  tags: Tag[]
  checklist_total: number
  checklist_completed: number
  user_id: string
  created_at: string
  updated_at: string
}

export async function dbTaskToUi(task: DbTask): Promise<UiTask> {
  let tags: Tag[] = []
  if (task.tagIds.length > 0) {
    const tagRecords = await db.tags.where('id').anyOf(task.tagIds).toArray()
    tags = tagRecords
      .filter(t => t._syncStatus !== 'deleted')
      .map(t => ({ id: t.id, name: t.name, color: t.color, user_id: t.userId, created_at: t.createdAt, updated_at: t.updatedAt }))
  }

  const checklistItems = await db.checklistItems
    .where('taskId')
    .equals(task.id)
    .filter(i => i._syncStatus !== 'deleted')
    .toArray()
  const checklistTotal = checklistItems.length
  const checklistCompleted = checklistItems.filter(i => i.isCompleted).length

  let project = null
  if (task.projectId) {
    const p = await db.projects.get(task.projectId)
    if (p && p._syncStatus !== 'deleted') {
      project = { id: p.id, name: p.name, color: p.color, is_active: p.isActive }
    }
  }

  let context = null
  if (task.contextId) {
    const c = await db.contexts.get(task.contextId)
    if (c && c._syncStatus !== 'deleted') {
      context = { id: c.id, name: c.name, color: c.color, icon: c.icon }
    }
  }

  let area = null
  if (task.areaId) {
    const a = await db.areas.get(task.areaId)
    if (a && a._syncStatus !== 'deleted') {
      area = { id: a.id, name: a.name, color: a.color }
    }
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.isCompleted,
    gtd_status: task.gtdStatus,
    context_id: task.contextId,
    area_id: task.areaId,
    project_id: task.projectId,
    project,
    context,
    area,
    position: task.position,
    due_date: task.dueDate,
    notes: task.notes,
    recurrence_type: task.recurrenceType,
    recurrence_config: task.recurrenceConfig ? JSON.parse(task.recurrenceConfig) : null,
    recurrence_end_date: task.recurrenceEndDate,
    reminder_time: task.reminderTime,
    reminder_offsets: task.reminderOffsets ? JSON.parse(task.reminderOffsets) : null,
    reminder_fired: task.reminderFired,
    deadline_notified: task.deadlineNotified,
    is_recurring: task.isRecurring,
    tags,
    checklist_total: checklistTotal,
    checklist_completed: checklistCompleted,
    user_id: task.userId,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

export function apiTaskToDb(
  apiTask: Record<string, unknown>,
  userId: string
): DbTask {
  const tagIds = (apiTask.tags as { id: string }[] ?? []).map(t => t.id)
  return {
    id: apiTask.id as string,
    userId,
    title: apiTask.title as string,
    description: (apiTask.description as string | null) ?? null,
    isCompleted: (apiTask.is_completed as boolean) ?? false,
    completedAt: (apiTask.completed_at as string | null) ?? null,
    gtdStatus: (apiTask.gtd_status as string) ?? 'inbox',
    contextId: (apiTask.context_id as string | null) ?? null,
    areaId: (apiTask.area_id as string | null) ?? null,
    projectId: (apiTask.project_id as string | null) ?? null,
    position: (apiTask.position as number) ?? 0,
    dueDate: (apiTask.due_date as string | null) ?? null,
    notes: (apiTask.notes as string | null) ?? null,
    recurrenceType: (apiTask.recurrence_type as string | null) ?? null,
    recurrenceConfig: apiTask.recurrence_config ? JSON.stringify(apiTask.recurrence_config) : null,
    recurrenceEndDate: (apiTask.recurrence_end_date as string | null) ?? null,
    reminderTime: (apiTask.reminder_time as string | null) ?? null,
    reminderOffsets: apiTask.reminder_offsets ? JSON.stringify(apiTask.reminder_offsets) : null,
    reminderFired: (apiTask.reminder_fired as boolean) ?? false,
    deadlineNotified: (apiTask.deadline_notified as boolean) ?? false,
    isRecurring: (apiTask.is_recurring as boolean) ?? false,
    tagIds,
    trashedAt: null,
    createdAt: (apiTask.created_at as string) ?? new Date().toISOString(),
    updatedAt: (apiTask.updated_at as string) ?? new Date().toISOString(),
    _syncStatus: 'synced',
    _lastSyncedAt: new Date().toISOString(),
  }
}
