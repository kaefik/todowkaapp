import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/database'
import { httpClient, ApiError } from '../api/httpClient'
import type { Task } from './useTasks'

export interface TaskRecurrence {
  id: string
  task_id: string
  generated_task_id: string | null
  due_date_of_generated_task: string | null
  generated_at: string
  status: string
}

interface UseRecurrencesReturn {
  recurrences: TaskRecurrence[]
  total: number
  isLoading: boolean
  error: string | null
  fetchRecurrences: (taskId: string, limit?: number, offset?: number) => Promise<void>
  stopRecurrence: (taskId: string) => Promise<Task>
}

export function useRecurrences(): UseRecurrencesReturn {
  const [recurrences, setRecurrences] = useState<TaskRecurrence[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecurrences = useCallback(async (taskId: string, limit = 50, offset = 0) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<{ items: TaskRecurrence[]; total: number }>(
        `/tasks/${taskId}/recurrences?limit=${limit}&offset=${offset}`
      )
      setRecurrences(response.data.items)
      setTotal(response.data.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to fetch recurrences')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopRecurrence = useCallback(async (taskId: string): Promise<Task> => {
    setIsLoading(true)
    setError(null)
    try {
      const now = new Date().toISOString()
      await db.tasks.update(taskId, {
        recurrenceType: null,
        recurrenceConfig: null,
        recurrenceEndDate: null,
        isRecurring: false,
        updatedAt: now,
        _syncStatus: 'modified',
      })
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        action: 'update',
        payload: JSON.stringify({
          recurrence_type: null,
          recurrence_config: null,
          recurrence_end_date: null,
          is_recurring: false,
        }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })
      const updated = await db.tasks.get(taskId)
      return updated as unknown as Task
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        throw err
      }
      setError('Failed to stop recurrence')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    recurrences,
    total,
    isLoading,
    error,
    fetchRecurrences,
    stopRecurrence,
  }
}
