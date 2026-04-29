import Dexie from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, activeTasks } from '../db/database'
import { dbTasksToUiBatch } from '../db/mappers'
import { useAuthStore } from '../stores/authStore'
import type { Task } from './useTasks'

export function getDayBounds(timezone: string | null, dayOffset: number): { start: string; end: string } {
  const now = new Date()
  const tz = timezone || 'UTC'

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value)
  const day = parseInt(parts.find(p => p.type === 'day')!.value)

  const startUtc = new Date(Date.UTC(year, month - 1, day + dayOffset, 0, 0, 0, 0))
  const tzOffset = getOffsetMinutes(tz, startUtc)
  startUtc.setUTCMinutes(startUtc.getUTCMinutes() - tzOffset)

  const endUtc = new Date(Date.UTC(year, month - 1, day + dayOffset, 23, 59, 59, 999))
  endUtc.setUTCMinutes(endUtc.getUTCMinutes() - tzOffset)

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
  }
}

function getOffsetMinutes(timezone: string, date: Date): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

export function useDueDateTasks(dayOffset: number): {
  tasks: Task[]
  isLoading: boolean
  count: number
} {
  const user = useAuthStore(s => s.user)

  const result = useLiveQuery(async () => {
    if (!user) return { tasks: [], count: 0 }

    const { start, end } = getDayBounds(user.timezone, dayOffset)

    const dbRecords = await activeTasks(user.id)
      .filter(t =>
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate >= start &&
        t.dueDate <= end
      )
      .toArray()

    const uiTasks = await dbTasksToUiBatch(dbRecords)
    uiTasks.sort((a, b) => a.position - b.position)

    return { tasks: uiTasks as Task[], count: uiTasks.length }
  }, [user?.id, dayOffset])

  return {
    tasks: result?.tasks ?? [],
    isLoading: result === undefined,
    count: result?.count ?? 0,
  }
}

export function useDueDateCount(dayOffset: number): number {
  const user = useAuthStore(s => s.user)

  const count = useLiveQuery(async () => {
    if (!user) return 0

    const { start, end } = getDayBounds(user.timezone, dayOffset)

    return db.tasks
      .where('[userId+gtdStatus]')
      .between(
        [user.id, Dexie.minKey],
        [user.id, Dexie.maxKey]
      )
      .filter(t =>
        t._syncStatus !== 'deleted' &&
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate >= start &&
        t.dueDate <= end
      )
      .count()
  }, [user?.id, dayOffset])

  return count ?? 0
}
