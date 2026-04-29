import { useCallback } from 'react'
import { db } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'
import { getDayBounds } from './useDueDateTasks'
import type { GtdStatus } from './useTasks'

export const TASKS_CHANGED_EVENT = 'todowka:tasks-changed'

export function notifyTasksChanged() {}

export interface GtdCounts {
  inbox: number
  active: number
  next: number
  waiting: number
  someday: number
  completed: number
  trash: number
  today: number
  tomorrow: number
}

interface UseGtdCountsReturn {
  counts: GtdCounts
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const defaultCounts: GtdCounts = {
  inbox: 0, active: 0, next: 0, waiting: 0, someday: 0,
  completed: 0, trash: 0, today: 0, tomorrow: 0,
}

export function useGtdCounts(): UseGtdCountsReturn {
  const user = useAuthStore(s => s.user)

  const { data: counts, isLoading } = useDexieQuery(async () => {
    if (!user) return defaultCounts

    const allTasks = await db.tasks
      .where('userId')
      .equals(user.id)
      .filter(t => t._syncStatus !== 'deleted')
      .toArray()

    const result: GtdCounts = { ...defaultCounts }
    const statusMap: Record<string, number> = {}
    for (const t of allTasks) {
      statusMap[t.gtdStatus] = (statusMap[t.gtdStatus] ?? 0) + 1
    }
    result.inbox = statusMap['inbox'] ?? 0
    result.active = statusMap['active'] ?? 0
    result.next = statusMap['next'] ?? 0
    result.waiting = statusMap['waiting'] ?? 0
    result.someday = statusMap['someday'] ?? 0
    result.completed = statusMap['completed'] ?? 0
    result.trash = statusMap['trash'] ?? 0

    const todayBounds = getDayBounds(user.timezone, 0)
    const tomorrowBounds = getDayBounds(user.timezone, 1)

    let todayCount = 0
    let tomorrowCount = 0
    for (const t of allTasks) {
      if (t.isCompleted || !t.dueDate) continue
      if (t.dueDate >= todayBounds.start && t.dueDate <= todayBounds.end) todayCount++
      if (t.dueDate >= tomorrowBounds.start && t.dueDate <= tomorrowBounds.end) tomorrowCount++
    }
    result.today = todayCount
    result.tomorrow = tomorrowCount

    return result
  }, [user?.id])

  const refetch = useCallback(async () => {}, [])

  return { counts: counts ?? defaultCounts, isLoading, error: null, refetch }
}

export const GTD_STATUS_LABELS: Record<GtdStatus, string> = {
  inbox: 'Inbox',
  active: 'Active',
  next: 'Next Actions',
  waiting: 'Waiting For',
  someday: 'Someday / Maybe',
  completed: 'Completed',
  trash: 'Trash',
}
