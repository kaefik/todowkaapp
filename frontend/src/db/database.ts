import Dexie, { type Table } from 'dexie'

export type SyncStatus = 'synced' | 'local' | 'modified' | 'deleted'

export interface DbTask {
  id: string
  userId: string
  title: string
  description: string | null
  isCompleted: boolean
  completedAt: string | null
  gtdStatus: string
  contextId: string | null
  areaId: string | null
  projectId: string | null
  eventId: string | null
  position: number
  dueDate: string | null
  notes: string | null
  recurrenceType: string | null
  recurrenceConfig: string | null
  recurrenceEndDate: string | null
  reminderTime: string | null
  reminderOffsets: string | null
  reminderFired: boolean
  deadlineNotified: boolean
  isRecurring: boolean
  tagIds: string[]
  trashedAt: string | null
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbProject {
  id: string
  userId: string
  areaId: string | null
  name: string
  description: string | null
  color: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbArea {
  id: string
  userId: string
  name: string
  description: string | null
  color: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbContext {
  id: string
  userId: string
  name: string
  color: string | null
  icon: string | null
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbTag {
  id: string
  userId: string
  name: string
  color: string | null
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbVerbTemplate {
  id: string
  userId: string
  text: string
  icon: string
  position: number
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbMutation {
  id: string
  entityType: 'task' | 'project' | 'area' | 'context' | 'tag' | 'verbTemplate' | 'checklistItem' | 'calendarEvent'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'toggle' | 'move' | 'reorder' | 'stop_recurrence' | 'restore' | 'permanent_delete'
  payload: string | null
  timestamp: number
  retryCount: number
  lastError: string | null
}

export interface DbChecklistItem {
  id: string
  taskId: string
  userId: string
  title: string
  isCompleted: boolean
  position: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export interface DbSyncMeta {
  key: string
  value: string
}

export interface DbCalendarEvent {
  id: string
  userId: string
  title: string
  description: string | null
  startTime: string
  endTime: string | null
  allDay: boolean
  color: string | null
  location: string | null
  attendees: string[] | null
  recurrenceType: string | null
  recurrenceConfig: string | null
  recurrenceEndDate: string | null
  createdAt: string
  updatedAt: string
  _syncStatus: SyncStatus
  _lastSyncedAt: string | null
}

export class TodowkaDB extends Dexie {
  tasks!: Table<DbTask>
  projects!: Table<DbProject>
  areas!: Table<DbArea>
  contexts!: Table<DbContext>
  tags!: Table<DbTag>
  verbTemplates!: Table<DbVerbTemplate>
  checklistItems!: Table<DbChecklistItem>
  mutations!: Table<DbMutation>
  syncMeta!: Table<DbSyncMeta>
  calendarEvents!: Table<DbCalendarEvent>

  constructor() {
    super('todowka')

    this.version(1).stores({
      tasks: [
        'id', 'userId', 'gtdStatus', 'projectId', 'contextId',
        'areaId', 'isCompleted', '_syncStatus',
        '[userId+gtdStatus]', '[userId+projectId]',
        '[userId+contextId]', '[userId+areaId]', 'updatedAt',
      ].join(','),
      projects: 'id, userId, areaId, _syncStatus, updatedAt',
      areas: 'id, userId, _syncStatus, updatedAt',
      contexts: 'id, userId, _syncStatus, updatedAt',
      tags: 'id, userId, _syncStatus, updatedAt',
      mutations: 'id, [entityType+entityId], timestamp, retryCount',
      syncMeta: 'key',
    })

    this.version(2).stores({
      projects: 'id, userId, areaId, _syncStatus, updatedAt, sortOrder',
    }).upgrade(tx => {
      return tx.table('projects').toCollection().modify(project => {
        project.sortOrder = 0
      })
    })

    this.version(3).stores({
      verbTemplates: 'id, userId, _syncStatus, updatedAt, position',
    })

    this.version(4).stores({
      tasks: [
        'id', 'userId', 'gtdStatus', 'projectId', 'contextId',
        'areaId', 'isCompleted', '_syncStatus',
        '[userId+gtdStatus]', '[userId+projectId]',
        '[userId+contextId]', '[userId+areaId]', 'updatedAt',
      ].join(','),
    }).upgrade(tx => {
      return tx.table('tasks').toCollection().modify(task => {
        task.deadlineNotified = false
      })
    })

    this.version(5).stores({
      areas: 'id, userId, _syncStatus, updatedAt, sortOrder',
    }).upgrade(tx => {
      return tx.table('areas').toCollection().modify(area => {
        area.sortOrder = 0
      })
    })

    this.version(6).stores({
      tasks: [
        'id', 'userId', 'gtdStatus', 'projectId', 'contextId',
        'areaId', 'isCompleted', '_syncStatus',
        '[userId+gtdStatus]', '[userId+projectId]',
        '[userId+contextId]', '[userId+areaId]', 'updatedAt',
      ].join(','),
      checklistItems: 'id, taskId, _syncStatus, updatedAt, position',
    }).upgrade(async tx => {
      await tx.table('tasks').toCollection().modify(task => {
        delete task.parentTaskId
      })
      const subtasks: Record<string, unknown>[] = []
      await tx.table('tasks').toCollection().each(task => {
        if (task.parentTaskId && task._syncStatus !== 'deleted') {
          subtasks.push({
            id: task.id,
            taskId: task.parentTaskId,
            title: task.title,
            isCompleted: task.isCompleted,
            position: task.position || 0,
            completedAt: task.completedAt,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            _syncStatus: 'synced' as SyncStatus,
            _lastSyncedAt: task._lastSyncedAt,
          })
        }
      })
      if (subtasks.length > 0) {
        await tx.table('checklistItems').bulkPut(subtasks)
      }
      await tx.table('tasks').filter(t => !!t.parentTaskId).modify(t => {
        t._syncStatus = 'deleted'
      })
    })

    this.version(7).stores({
      checklistItems: 'id, taskId, userId, _syncStatus, updatedAt, position',
    }).upgrade(async tx => {
      await tx.table('checklistItems').toCollection().modify(item => {
        item.userId = ''
      })
    })

    this.version(8).stores({
      calendarEvents: 'id, userId, _syncStatus, updatedAt, startTime',
    })
  }
}

export const db = new TodowkaDB()

export function activeTasks(userId: string) {
  return db.tasks
    .where('[userId+gtdStatus]')
    .between(
      [userId, Dexie.minKey],
      [userId, Dexie.maxKey]
    )
    .filter(t => t._syncStatus !== 'deleted')
}

export function activeTasksByStatus(userId: string, status: string) {
  return db.tasks
    .where('[userId+gtdStatus]')
    .equals([userId, status])
    .filter(t => t._syncStatus !== 'deleted')
}

export function activeTasksByProject(userId: string, projectId: string) {
  return db.tasks
    .where('[userId+projectId]')
    .equals([userId, projectId])
    .filter(t => t._syncStatus !== 'deleted')
}

export function activeTable<T extends { _syncStatus: SyncStatus }>(
  table: Table<T>,
  userId: string
) {
  return table
    .where('userId')
    .equals(userId)
    .filter(r => r._syncStatus !== 'deleted')
}
