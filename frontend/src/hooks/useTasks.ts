import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'

export interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
  user_id: string
  created_at: string
  updated_at: string
}

interface ApiTask {
  id: string
  title: string
  description: string | null
  is_completed: boolean
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateTask {
  title: string
  description?: string
  completed?: boolean
}

export interface UpdateTask {
  title?: string
  description?: string | null
  completed?: boolean
}

interface UseTasksReturn {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  addTask: (data: CreateTask) => Promise<void>
  updateTask: (id: string, data: UpdateTask) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  refetch: () => Promise<void>
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
      setTasks(response.data.items.map(t => ({ ...t, completed: t.is_completed })))
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
      setTasks((prev) => [...prev, { ...response.data, completed: response.data.is_completed }])
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

      const response = await httpClient.put<ApiTask>(`/tasks/${id}`, updateData)
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...response.data, completed: response.data.is_completed } : task))
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
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    try {
      await updateTask(id, { completed: !task.completed })
    } catch {
    }
  }, [tasks, updateTask])

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

  return {
    tasks,
    isLoading,
    error,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    refetch,
  }
}
