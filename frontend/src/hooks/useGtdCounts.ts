import { useState, useEffect, useCallback } from 'react'
import { httpClient, ApiError } from '../api/httpClient'
import type { GtdStatus } from './useTasks'

export const TASKS_CHANGED_EVENT = 'todowka:tasks-changed'

export function notifyTasksChanged() {
  window.dispatchEvent(new CustomEvent(TASKS_CHANGED_EVENT))
}

export interface GtdCounts {
  inbox: number
  next: number
  waiting: number
  someday: number
  completed: number
  trash: number
}

interface UseGtdCountsReturn {
  counts: GtdCounts
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const defaultCounts: GtdCounts = {
  inbox: 0,
  next: 0,
  waiting: 0,
  someday: 0,
  completed: 0,
  trash: 0,
}

export function useGtdCounts(): UseGtdCountsReturn {
  const [counts, setCounts] = useState<GtdCounts>(defaultCounts)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await httpClient.get<GtdCounts>('/tasks/counts')
      setCounts(response.data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load counts')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    const handler = () => refetch()
    window.addEventListener(TASKS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, handler)
  }, [refetch])

  return { counts, isLoading, error, refetch }
}

export const GTD_STATUS_LABELS: Record<GtdStatus, string> = {
  inbox: 'Inbox',
  next: 'Next Actions',
  waiting: 'Waiting For',
  someday: 'Someday / Maybe',
  completed: 'Completed',
  trash: 'Trash',
}
