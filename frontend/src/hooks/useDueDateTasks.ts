import Dexie from 'dexie'
import { db, activeTasks } from '../db/database'
import { dbTaskToUi } from '../db/mappers'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'
import type { Task } from './useTasks'

function getDayBounds(timezone: string | null, dayOffset: number): { start: string; end: string } {
  const now = new Date()
  const tz = timezone || 'UTC'

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + dayOffset)

  const parts = formatter.formatToParts(targetDate)
  const year = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const day = parts.find(p => p.type === 'day')!.value

  const dateStr = `${year}-${month}-${day}`

  const start = new Date(`${dateStr}T00:00:00`)
  const tzOffset = getOffsetMinutes(tz, start)
  start.setMinutes(start.getMinutes() - tzOffset)

  const end = new Date(`${dateStr}T23:59:59.999`)
  end.setMinutes(end.getMinutes() - tzOffset)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
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

  const { data: result, isLoading } = useDexieQuery(async () => {
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

    const uiTasks = await Promise.all(dbRecords.map(dbTaskToUi))
    uiTasks.sort((a, b) => a.position - b.position)

    return { tasks: uiTasks as Task[], count: uiTasks.length }
  }, [user?.id, dayOffset])

  return {
    tasks: result?.tasks ?? [],
    isLoading,
    count: result?.count ?? 0,
  }
}

export function useDueDateCount(dayOffset: number): number {
  const user = useAuthStore(s => s.user)

  const { data: count } = useDexieQuery(async () => {
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
        !t.parentTaskId &&
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate >= start &&
        t.dueDate <= end
      )
      .count()
  }, [user?.id, dayOffset])

  return count ?? 0
}
