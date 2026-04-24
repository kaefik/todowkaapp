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
  parentTaskId: string | null
  position: number
  dueDate: string | null
  notes: string | null
  recurrenceType: string | null
  recurrenceConfig: string | null
  recurrenceEndDate: string | null
  reminderTime: string | null
  reminderOffsets: string | null
  reminderFired: boolean
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

export interface DbMutation {
  id: string
  entityType: 'task' | 'project' | 'area' | 'context' | 'tag'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'toggle' | 'move'
  payload: string | null
  timestamp: number
  retryCount: number
  lastError: string | null
}

export interface DbSyncMeta {
  key: string
  value: string
}

export class TodowkaDB extends Dexie {
  tasks!: Table<DbTask>
  projects!: Table<DbProject>
  areas!: Table<DbArea>
  contexts!: Table<DbContext>
  tags!: Table<DbTag>
  mutations!: Table<DbMutation>
  syncMeta!: Table<DbSyncMeta>

  constructor() {
    super('todowka')

    this.version(1).stores({
      tasks: [
        'id', 'userId', 'gtdStatus', 'projectId', 'contextId',
        'areaId', 'parentTaskId', 'isCompleted', '_syncStatus',
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
    .filter(t => t._syncStatus !== 'deleted' && !t.parentTaskId)
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
