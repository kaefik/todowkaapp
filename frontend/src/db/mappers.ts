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

export async function dbTasksToUiBatch(tasks: DbTask[]): Promise<UiTask[]> {
  if (tasks.length === 0) return []

  const allTagIds = [...new Set(tasks.flatMap(t => t.tagIds))]
  const allProjectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean))] as string[]
  const allContextIds = [...new Set(tasks.map(t => t.contextId).filter(Boolean))] as string[]
  const allAreaIds = [...new Set(tasks.map(t => t.areaId).filter(Boolean))] as string[]
  const allTaskIds = tasks.map(t => t.id)

  const [tagRecords, checklistItems, projects, contexts, areas] = await Promise.all([
    allTagIds.length > 0
      ? db.tags.where('id').anyOf(allTagIds).filter(t => t._syncStatus !== 'deleted').toArray()
      : Promise.resolve([]),
    allTaskIds.length > 0
      ? db.checklistItems.where('taskId').anyOf(allTaskIds).filter(i => i._syncStatus !== 'deleted').toArray()
      : Promise.resolve([]),
    allProjectIds.length > 0
      ? db.projects.where('id').anyOf(allProjectIds).toArray()
      : Promise.resolve([]),
    allContextIds.length > 0
      ? db.contexts.where('id').anyOf(allContextIds).toArray()
      : Promise.resolve([]),
    allAreaIds.length > 0
      ? db.areas.where('id').anyOf(allAreaIds).toArray()
      : Promise.resolve([]),
  ])

  const tagsMap = new Map(tagRecords.map(t => [t.id, t]))
  const projectsMap = new Map(projects.filter(p => p._syncStatus !== 'deleted').map(p => [p.id, p]))
  const contextsMap = new Map(contexts.filter(c => c._syncStatus !== 'deleted').map(c => [c.id, c]))
  const areasMap = new Map(areas.filter(a => a._syncStatus !== 'deleted').map(a => [a.id, a]))

  const checklistByTask = new Map<string, { total: number; completed: number }>()
  for (const item of checklistItems) {
    const existing = checklistByTask.get(item.taskId) ?? { total: 0, completed: 0 }
    existing.total++
    if (item.isCompleted) existing.completed++
    checklistByTask.set(item.taskId, existing)
  }

  return tasks.map(task => {
    const taskTags = task.tagIds
      .map(id => tagsMap.get(id))
      .filter(Boolean)
      .map(t => ({
        id: t!.id, name: t!.name, color: t!.color,
        user_id: t!.userId, created_at: t!.createdAt, updated_at: t!.updatedAt,
      }))

    const p = task.projectId ? projectsMap.get(task.projectId) : null
    const project = p ? { id: p.id, name: p.name, color: p.color, is_active: p.isActive } : null

    const c = task.contextId ? contextsMap.get(task.contextId) : null
    const context = c ? { id: c.id, name: c.name, color: c.color, icon: c.icon } : null

    const a = task.areaId ? areasMap.get(task.areaId) : null
    const area = a ? { id: a.id, name: a.name, color: a.color } : null

    const checklist = checklistByTask.get(task.id) ?? { total: 0, completed: 0 }

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
      tags: taskTags,
      checklist_total: checklist.total,
      checklist_completed: checklist.completed,
      user_id: task.userId,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    }
  })
}

export async function dbTaskToUi(task: DbTask): Promise<UiTask> {
  const results = await dbTasksToUiBatch([task])
  return results[0]!
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
