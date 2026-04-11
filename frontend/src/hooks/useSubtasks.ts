import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'
import type { Task } from './useTasks'

interface UseSubtasksReturn {
  subtasks: Task[]
  isLoading: boolean
  error: string | null
  addSubtask: (title: string, description?: string) => Promise<void>
  toggleSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  refetch: () => Promise<void>
}

function mapApiTask(t: Record<string, unknown>): Task {
  return {
    id: t.id as string,
    title: t.title as string,
    description: (t.description as string | null) ?? null,
    completed: (t.is_completed as boolean) ?? false,
    gtd_status: t.gtd_status as Task['gtd_status'],
    context_id: (t.context_id as string | null) ?? null,
    area_id: (t.area_id as string | null) ?? null,
    project_id: (t.project_id as string | null) ?? null,
    parent_task_id: (t.parent_task_id as string | null) ?? null,
    position: (t.position as number) ?? 0,
    due_date: (t.due_date as string | null) ?? null,
    notes: (t.notes as string | null) ?? null,
    tags: (t.tags as Task['tags']) ?? [],
    subtasks_count: (t.subtasks_count as number) ?? 0,
    subtasks_completed: (t.subtasks_completed as number) ?? 0,
    user_id: t.user_id as string,
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
  }
}

export function useSubtasks(parentTaskId: string | null): UseSubtasksReturn {
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!parentTaskId) {
      setSubtasks([])
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<Record<string, unknown>[]>(
        `/tasks/${parentTaskId}/subtasks`
      )
      setSubtasks(response.data.map(mapApiTask))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load subtasks')
      }
    } finally {
      setIsLoading(false)
    }
  }, [parentTaskId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const addSubtask = useCallback(
    async (title: string, description?: string) => {
      if (!parentTaskId) return
      setError(null)
      try {
        const response = await httpClient.post<Record<string, unknown>>(
          `/tasks/${parentTaskId}/subtasks`,
          { title, description }
        )
        setSubtasks((prev) => [...prev, mapApiTask(response.data)])
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          throw err
        }
        setError('Failed to add subtask')
        throw err
      }
    },
    [parentTaskId]
  )

  const toggleSubtask = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const response = await httpClient.patch<Record<string, unknown>>(
          `/tasks/${id}/toggle`
        )
        const updated = mapApiTask(response.data)
        setSubtasks((prev) => prev.map((s) => (s.id === id ? updated : s)))
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          throw err
        }
        setError('Failed to toggle subtask')
        throw err
      }
    },
    []
  )

  const deleteSubtask = useCallback(async (id: string) => {
    setError(null)
    try {
      await httpClient.delete(`/tasks/${id}`)
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to delete subtask')
      throw err
    }
  }, [])

  return {
    subtasks,
    isLoading,
    error,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    refetch,
  }
}
