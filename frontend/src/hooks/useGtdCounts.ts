import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuthStore } from '../stores/authStore'
import type { GtdStatus } from './useTasks'

export const TASKS_CHANGED_EVENT = 'todowka:tasks-changed'

export function notifyTasksChanged() {}

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

const GTD_STATUSES: GtdStatus[] = ['inbox', 'next', 'waiting', 'someday', 'completed', 'trash']

export function useGtdCounts(): UseGtdCountsReturn {
  const user = useAuthStore(s => s.user)

  const counts = useLiveQuery(async () => {
    if (!user) return defaultCounts

    const result: GtdCounts = { ...defaultCounts }
    for (const status of GTD_STATUSES) {
      result[status] = await db.tasks
        .where('[userId+gtdStatus]')
        .equals([user.id, status])
        .filter(t => t._syncStatus !== 'deleted')
        .count()
    }
    return result
  }, [user?.id], defaultCounts)

  const refetch = useCallback(async () => {}, [])

  return { counts: counts ?? defaultCounts, isLoading: counts === undefined, error: null, refetch }
}

export const GTD_STATUS_LABELS: Record<GtdStatus, string> = {
  inbox: 'Inbox',
  next: 'Next Actions',
  waiting: 'Waiting For',
  someday: 'Someday / Maybe',
  completed: 'Completed',
  trash: 'Trash',
}
