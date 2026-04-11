import { useState, useEffect, useCallback, useMemo } from 'react'
import { httpClient, ApiError } from '../api/httpClient'
import type { Tag } from './useTags'
import { notifyTasksChanged } from './useGtdCounts'

export type GtdStatus = 'inbox' | 'next' | 'waiting' | 'someday' | 'completed' | 'trash'

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  gtd_status: GtdStatus
  context_id: string | null
  area_id: string | null
  project_id: string | null
  parent_task_id: string | null
  position: number
  due_date: string | null
  notes: string | null
  tags: Tag[]
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
  parent_task_id: string | null
  position: number
  due_date: string | null
  notes: string | null
  tags: Tag[]
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
  refetch: () => Promise<void>
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

export function useTasks(filters?: TaskFilters): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const qs = useMemo(() => buildQueryString(filters), [
    filters?.gtd_status,
    filters?.context_id,
    filters?.area_id,
    filters?.project_id,
    filters?.tag_id,
    filters?.is_completed,
    filters?.search,
    filters?.sort_by,
    filters?.sort_order,
  ])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: ApiTask[]; total: number }>(`/tasks${qs}`)
      setTasks(response.data.items.map(mapTask))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load tasks')
      }
    } finally {
      setIsLoading(false)
    }
  }, [qs])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addTask = useCallback(async (data: CreateTask) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.post<ApiTask>('/tasks', data)
      setTasks((prev) => [...prev, mapTask(response.data)])
      notifyTasksChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to add task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateTask = useCallback(async (id: string, data: UpdateTask) => {
    setIsLoading(true)
    setError(null)
    try {
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

      const response = await httpClient.put<ApiTask>(`/tasks/${id}`, updateData)
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? mapTask(response.data) : task))
      )
      notifyTasksChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to update task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const toggleTask = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.patch<ApiTask>(`/tasks/${id}/toggle`)
      const updated = mapTask(response.data)
      setTasks((prev) => {
        if (filters?.gtd_status && updated.gtd_status !== filters.gtd_status) {
          return prev.filter((t) => t.id !== id)
        }
        return prev.map((t) => (t.id === id ? updated : t))
      })
      notifyTasksChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to toggle task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [filters?.gtd_status])

  const moveTask = useCallback(async (id: string, gtd_status: GtdStatus) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.patch<ApiTask>(`/tasks/${id}/move`, { gtd_status })
      const updated = mapTask(response.data)
      setTasks((prev) => {
        if (filters?.gtd_status && updated.gtd_status !== filters.gtd_status) {
          return prev.filter((t) => t.id !== id)
        }
        return prev.map((t) => (t.id === id ? updated : t))
      })
      notifyTasksChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to move task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [filters?.gtd_status])

  const deleteTask = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/tasks/${id}`)
      setTasks((prev) => prev.filter((task) => task.id !== id))
      notifyTasksChanged()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to delete task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchTask = useCallback(async (id: string): Promise<Task> => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<ApiTask>(`/tasks/${id}`)
      return mapTask(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to fetch task')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    moveTask,
    deleteTask,
    fetchTask,
    refetch,
  }
}
