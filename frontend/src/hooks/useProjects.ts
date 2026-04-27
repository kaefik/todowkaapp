import { v4 as uuidv4 } from 'uuid'

import { db, activeTable, activeTasks, activeTasksByProject } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface ProjectProgress {
  tasks_total: number
  tasks_completed: number
  progress_percent: number
}

export interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  area_id: string | null
  is_active: boolean
  user_id: string
  progress: ProjectProgress
  created_at: string
  updated_at: string
  sort_order: number
}

export interface CreateProject {
  name: string
  description?: string | null
  color?: string | null
  area_id?: string | null
  sort_order?: number
}

export interface UpdateProject {
  name?: string
  description?: string | null
  color?: string | null
  area_id?: string | null
  is_active?: boolean
  sort_order?: number
}

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  error: string | null
  addProject: (data: CreateProject) => Promise<void>
  updateProject: (id: string, data: UpdateProject) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  refetch: () => Promise<unknown>
}

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

export function useProjects(): UseProjectsReturn {
  const user = useAuthStore(s => s.user)

  const { data: projects = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.projects, user.id).toArray()
      records.sort((a, b) => a.sortOrder - b.sortOrder)
      const results: Project[] = []
      for (const p of records) {
        const tasks = await activeTasksByProject(user.id, p.id).toArray()
        const tasks_total = tasks.length
        const tasks_completed = tasks.filter(t => t.isCompleted).length
        const progress_percent = tasks_total > 0 ? Math.round((tasks_completed / tasks_total) * 1000) / 10 : 0.0
        results.push({
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          area_id: p.areaId,
          is_active: p.isActive,
          user_id: p.userId,
          progress: { tasks_total, tasks_completed, progress_percent },
          created_at: p.createdAt,
          updated_at: p.updatedAt,
          sort_order: p.sortOrder,
        })
      }
      return results
    },
    [user?.id]
  )

  const addProject = async (data: CreateProject) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    const existingProjects = await activeTable(db.projects, user.id).toArray()
    const maxSortOrder = existingProjects.reduce((max, p) => Math.max(max, p.sortOrder), -1)
    await db.projects.add({
      id,
      userId: user.id,
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      areaId: data.area_id ?? null,
      isActive: true,
      sortOrder: data.sort_order ?? (maxSortOrder + 1),
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'project',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateProject = async (id: string, data: UpdateProject) => {
    if (!user) return
    const existing = await db.projects.get(id)
    if (!existing) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.name !== undefined) { updates.name = data.name; (updates as Record<string, unknown>).name = data.name }
    if (data.description !== undefined) updates.description = data.description
    if (data.color !== undefined) updates.color = data.color
    if (data.area_id !== undefined) updates.areaId = data.area_id
    if (data.is_active !== undefined) updates.isActive = data.is_active
    if (data.sort_order !== undefined) updates.sortOrder = data.sort_order
    await db.projects.update(id, updates)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'project',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteProject = async (id: string) => {
    if (!user) return
    await db.projects.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'project',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return {
    projects,
    isLoading,
    error: null,
    addProject,
    updateProject,
    deleteProject,
    refetch: async () => {},
  }
}

export type SortMode = 'name' | 'date' | 'tasks'

export async function reorderProjects(items: { id: string; sort_order: number }[]): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  for (const item of items) {
    await db.projects.update(item.id, {
      sortOrder: item.sort_order,
      updatedAt: new Date().toISOString(),
      _syncStatus: 'modified',
    })
  }

  try {
    const { httpClient } = await import('../api/httpClient')
    await httpClient.put('/projects/reorder', {
      items: items.map(i => ({ id: i.id, sort_order: i.sort_order })),
    })
    for (const item of items) {
      await db.projects.update(item.id, {
        _syncStatus: 'synced',
        _lastSyncedAt: new Date().toISOString(),
      })
    }
  } catch {
    // will be synced later via SyncEngine push
  }
}

export function autoSortProjects(
  projects: Project[],
  mode: SortMode
): { id: string; sort_order: number }[] {
  const sorted = [...projects]
  switch (mode) {
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
    case 'date':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'tasks':
      sorted.sort((a, b) => b.progress.tasks_total - a.progress.tasks_total)
      break
  }
  return sorted.map((p, i) => ({ id: p.id, sort_order: i }))
}

export function useNoProjectCount() {
  const user = useAuthStore(s => s.user)
  const { data = 0 } = useDexieQuery(
    async () => {
      if (!user) return 0
      const tasks = await activeTasks(user.id)
        .filter(t => !t.projectId)
        .toArray()
      return tasks.length
    },
    [user?.id]
  )
  return data
}
