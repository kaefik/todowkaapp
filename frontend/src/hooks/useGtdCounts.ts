import { useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Dexie from 'dexie'
import { db } from '../db/database'
import { useAuthStore } from '../stores/authStore'
import type { GtdStatus } from './useTasks'

function getDayBoundsForCounts(timezone: string | null, dayOffset: number): { start: string; end: string } {
  const tz = timezone || 'UTC'
  const now = new Date()
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + dayOffset)

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(targetDate)

  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day = parts.find(p => p.type === 'day')!.value
  const dateStr = `${year}-${month}-${day}`

  const getOffset = (d: Date) => {
    const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
    const local = new Date(d.toLocaleString('en-US', { timeZone: tz }))
    return (local.getTime() - utc.getTime()) / 60000
  }

  const start = new Date(`${dateStr}T00:00:00`)
  start.setMinutes(start.getMinutes() - getOffset(start))
  const end = new Date(`${dateStr}T23:59:59.999`)
  end.setMinutes(end.getMinutes() - getOffset(end))

  return { start: start.toISOString(), end: end.toISOString() }
}

export const TASKS_CHANGED_EVENT = 'todowka:tasks-changed'

export function notifyTasksChanged() {}

export interface GtdCounts {
  inbox: number
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
  inbox: 0,
  next: 0,
  waiting: 0,
  someday: 0,
  completed: 0,
  trash: 0,
  today: 0,
  tomorrow: 0,
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

    const todayBounds = getDayBoundsForCounts(user.timezone, 0)
    result.today = await db.tasks
      .where('[userId+gtdStatus]')
      .between([user.id, Dexie.minKey], [user.id, Dexie.maxKey])
      .filter(t =>
        t._syncStatus !== 'deleted' &&
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate >= todayBounds.start &&
        t.dueDate <= todayBounds.end
      )
      .count()

    const tomorrowBounds = getDayBoundsForCounts(user.timezone, 1)
    result.tomorrow = await db.tasks
      .where('[userId+gtdStatus]')
      .between([user.id, Dexie.minKey], [user.id, Dexie.maxKey])
      .filter(t =>
        t._syncStatus !== 'deleted' &&
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate >= tomorrowBounds.start &&
        t.dueDate <= tomorrowBounds.end
      )
      .count()

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
