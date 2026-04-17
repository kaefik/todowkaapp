import { useCallback, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient, ApiError, OfflineQueueError } from '../api/httpClient'
import type { Tag } from './useTags'
import { tagKeys } from './useTags'
import { notifyTasksChanged } from './useGtdCounts'
import {
  setLocalTaskChange,
  deleteLocalTaskChange,
  mergeTaskWithLocalChanges,
  getLocalTaskChange,
} from '../lib/localTaskChanges'

export type GtdStatus = 'inbox' | 'next' | 'waiting' | 'someday' | 'completed' | 'trash'

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
  parent_task_id: string | null
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
  subtasks_count: number
  subtasks_completed: number
  user_id: string
  created_at: string
  updated_at: string
}

interface ApiTask {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  gtd_status: GtdStatus
  context_id: string | null
  area_id: string | null
  project_id: string | null
  project: ProjectBrief | null
  context: ContextBrief | null
  parent_task_id: string | null
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
  subtasks_count: number
  subtasks_completed: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTask {
  title: string
  description?: string
  gtd_status?: GtdStatus
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
  deleteTask: (id: string) => Promise<void>
  fetchTask: (id: string) => Promise<Task>
  refetch: () => Promise<unknown>
}

function mapTask(t: ApiTask): Task {
  return { ...t, completed: t.is_completed }
}

function buildQueryString(filters?: TaskFilters): string {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (filters.gtd_status) params.set('gtd_status', filters.gtd_status)
  if (filters.context_id) params.set('context_id', filters.context_id)
  if (filters.area_id) params.set('area_id', filters.area_id)
  if (filters.project_id) params.set('project_id', filters.project_id)
  if (filters.tag_id) params.set('tag_id', filters.tag_id)
  if (filters.is_completed !== undefined) params.set('is_completed', String(filters.is_completed))
  if (filters.search) params.set('search', filters.search)
  if (filters.sort_by) params.set('sort_by', filters.sort_by)
  if (filters.sort_order) params.set('sort_order', filters.sort_order)
  if (filters.due_date_from) params.set('due_date_from', filters.due_date_from)
  if (filters.due_date_to) params.set('due_date_to', filters.due_date_to)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

function buildOptimisticPatch(data: UpdateTask, allTags: Tag[]) {
  const patch: Record<string, unknown> = { ...data }
  if (data.tag_ids) {
    const tagMap = new Map(allTags.map(t => [t.id, t]))
    patch.tags = data.tag_ids
      .map(id => tagMap.get(id))
      .filter((t): t is Tag => !!t)
    delete patch.tag_ids
  }
  return patch
}

interface UseTasksOptions {
  staleTime?: number
  refetchOnMount?: boolean | 'always'
}

export function useTasks(filters?: TaskFilters, options?: UseTasksOptions): UseTasksReturn {
  const queryClient = useQueryClient()

  const qs = buildQueryString(filters)

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: async () => {
      const response = await httpClient.get<{ items: ApiTask[]; total: number }>(`/tasks${qs}`)
      return response.data.items.map(mapTask)
    },
    staleTime: options?.staleTime ?? 1000 * 60 * 2,
    refetchOnMount: options?.refetchOnMount,
  })

  const addTaskMutation = useMutation({
    mutationFn: async (data: CreateTask) => {
      const response = await httpClient.post<ApiTask>('/tasks', data)
      return mapTask(response.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      notifyTasksChanged()
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTask }) => {
      const updateData: Record<string, unknown> = {}
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.completed !== undefined) updateData.is_completed = data.completed
      if (data.gtd_status !== undefined) updateData.gtd_status = data.gtd_status
      if (data.context_id !== undefined) updateData.context_id = data.context_id
      if (data.area_id !== undefined) updateData.area_id = data.area_id
      if (data.project_id !== undefined) updateData.project_id = data.project_id
      if (data.due_date !== undefined) updateData.due_date = data.due_date
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.tag_ids !== undefined) updateData.tag_ids = data.tag_ids
      if (data.recurrence_type !== undefined) updateData.recurrence_type = data.recurrence_type
      if (data.recurrence_config !== undefined) updateData.recurrence_config = data.recurrence_config
      if (data.recurrence_end_date !== undefined) updateData.recurrence_end_date = data.recurrence_end_date
      if (data.reminder_time !== undefined) updateData.reminder_time = data.reminder_time
      if (data.reminder_offsets !== undefined) updateData.reminder_offsets = data.reminder_offsets

      const response = await httpClient.put<ApiTask>(`/tasks/${id}`, updateData)
      return mapTask(response.data)
    },
    onMutate: async ({ id, data }) => {
      console.log('[updateTaskMutation] Starting update for task:', id, 'with data:', data)
      
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(id) })
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(id))
      const previousListQueries = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      })

      const allTags = queryClient.getQueryData<Tag[]>(tagKeys.lists()) ?? []
      const patch = buildOptimisticPatch(data, allTags)

      queryClient.setQueryData<Task>(taskKeys.detail(id), (old) => {
        if (!old) return old
        return { ...old, ...patch }
      })

      const listQueries = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      })
      for (const [key] of listQueries) {
        queryClient.setQueryData<Task[]>(key, (old) => {
          if (!old) return old
          return old.map((t) => (t.id === id ? { ...t, ...patch } : t))
        })
      }

      console.log('[updateTaskMutation] Saving local changes to IndexedDB...')
      await setLocalTaskChange(id, data)
      console.log('[updateTaskMutation] Local changes saved to IndexedDB')

      return { previousTask, previousListQueries }
    },
    onError: (err, { id }, context) => {
      console.error('[updateTaskMutation] Update failed:', err)
      
      if (err instanceof OfflineQueueError) {
        console.log('[updateTaskMutation] Offline queue error, keeping local changes for task:', id)
        return
      }

      console.error('[updateTaskMutation] Update failed, but keeping local changes in IndexedDB:', err)
      
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(id), context.previousTask)
      }
      if (context?.previousListQueries) {
        for (const [key, data] of context.previousListQueries) {
          queryClient.setQueryData(key, data)
        }
      }
    },
    onSuccess: (updatedTask, { id }) => {
      console.log('[updateTaskMutation] Update successful, clearing local changes for task:', id)
      deleteLocalTaskChange(id).catch(console.error)

      queryClient.setQueryData<Task>(taskKeys.detail(id), updatedTask)

      const listQueries = queryClient.getQueriesData<Task[]>({
        queryKey: taskKeys.lists(),
      })
      for (const [key] of listQueries) {
        queryClient.setQueryData<Task[]>(key, (old) => {
          if (!old) return old
          return old.map((t) => (t.id === id ? updatedTask : t))
        })
      }

      notifyTasksChanged()
    },
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await httpClient.patch<ApiTask>(`/tasks/${id}/toggle`)
      return mapTask(response.data)
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      notifyTasksChanged()
    },
  })

  const moveTaskMutation = useMutation({
    mutationFn: async ({ id, gtd_status }: { id: string; gtd_status: GtdStatus }) => {
      const response = await httpClient.patch<ApiTask>(`/tasks/${id}/move`, { gtd_status })
      return mapTask(response.data)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      notifyTasksChanged()
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      await httpClient.delete(`/tasks/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      notifyTasksChanged()
    },
  })

  const addTask = async (data: CreateTask) => {
    try {
      await addTaskMutation.mutateAsync(data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to add task')
    }
  }

  const updateTask = async (id: string, data: UpdateTask) => {
    try {
      await updateTaskMutation.mutateAsync({ id, data })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to update task')
    }
  }

  const toggleTask = async (id: string) => {
    try {
      await toggleTaskMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to toggle task')
    }
  }

  const moveTask = async (id: string, gtd_status: GtdStatus) => {
    try {
      await moveTaskMutation.mutateAsync({ id, gtd_status })
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to move task')
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await deleteTaskMutation.mutateAsync(id)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to delete task')
    }
  }

  const fetchTask = useCallback(async (id: string): Promise<Task> => {
    try {
      const response = await httpClient.get<ApiTask>(`/tasks/${id}`)
      return mapTask(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to fetch task')
    }
  }, [])

  return {
    tasks,
    isLoading,
    error: error instanceof Error ? error.message : null,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    deleteTask,
    fetchTask,
    refetch,
  }
}

export function useTask(id: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await httpClient.get<ApiTask>(`/tasks/${id}`)
      return mapTask(response.data)
    },
    enabled: !!id,
  })

  const { data: task, ...rest } = query

  const [mergedTask, setMergedTask] = useState<Task | null>(null)

  useEffect(() => {
    if (!task) {
      setMergedTask(null)
      return
    }

    getLocalTaskChange(id).then((localChange) => {
      if (localChange) {
        const allTags = queryClient.getQueryData<Tag[]>(tagKeys.lists()) ?? []
        const merged = mergeTaskWithLocalChanges(task, localChange, allTags)
        setMergedTask(merged)
      } else {
        setMergedTask(task)
      }
    }).catch(() => {
      setMergedTask(task)
    })
  }, [task, id, queryClient])

  return {
    ...rest,
    data: mergedTask,
  }
}
