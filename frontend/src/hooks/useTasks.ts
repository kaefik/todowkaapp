import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'
import type { Tag } from './useTags'

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  context_id: string | null
  area_id: string | null
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
  context_id: string | null
  area_id: string | null
  tags: Tag[]
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTask {
  title: string
  description?: string
  completed?: boolean
  tag_ids?: string[]
}

export interface UpdateTask {
  title?: string
  description?: string | null
  completed?: boolean
  context_id?: string | null
  area_id?: string | null
  tag_ids?: string[]
}

interface UseTasksReturn {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  addTask: (data: CreateTask) => Promise<void>
  updateTask: (id: string, data: UpdateTask) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  fetchTask: (id: string) => Promise<Task>
  refetch: () => Promise<void>
}

function mapTask(t: ApiTask): Task {
  return { ...t, completed: t.is_completed }
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: ApiTask[]; total: number }>('/tasks')
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
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addTask = useCallback(async (data: CreateTask) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.post<ApiTask>('/tasks', data)
      setTasks((prev) => [...prev, mapTask(response.data)])
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
      if (data.context_id !== undefined) updateData.context_id = data.context_id
      if (data.area_id !== undefined) updateData.area_id = data.area_id
      if (data.tag_ids !== undefined) updateData.tag_ids = data.tag_ids

      const response = await httpClient.put<ApiTask>(`/tasks/${id}`, updateData)
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? mapTask(response.data) : task))
      )
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
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? mapTask(response.data) : t))
      )
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
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await httpClient.delete(`/tasks/${id}`)
      setTasks((prev) => prev.filter((task) => task.id !== id))
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
    deleteTask,
    fetchTask,
    refetch,
  }
}
