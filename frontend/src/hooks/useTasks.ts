import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient, ApiError } from '../api/httpClient'
import type { Tag } from './useTags'
import { notifyTasksChanged } from './useGtdCounts'

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

export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const queryClient = useQueryClient()

  const qs = buildQueryString(filters)

  const { data: tasks = [], isLoading, error, refetch } = useQuery({
    queryKey: taskKeys.list(filters || {}),
    queryFn: async () => {
      const response = await httpClient.get<{ items: ApiTask[]; total: number }>(`/tasks${qs}`)
      return response.data.items.map(mapTask)
    },
    staleTime: 1000 * 60 * 2,
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
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
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

  const fetchTask = async (id: string): Promise<Task> => {
    try {
      const response = await httpClient.get<ApiTask>(`/tasks/${id}`)
      return mapTask(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        throw err
      }
      throw new Error('Failed to fetch task')
    }
  }

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
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await httpClient.get<ApiTask>(`/tasks/${id}`)
      return mapTask(response.data)
    },
    enabled: !!id,
  })
}
