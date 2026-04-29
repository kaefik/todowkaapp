import { useLiveQuery } from 'dexie-react-hooks'
import { activeTasks } from '../db/database'
import { dbTaskToUi } from '../db/mappers'
import { useAuthStore } from '../stores/authStore'
import { getDayBounds } from './useDueDateTasks'
import type { Task } from './useTasks'

export function useCompletedTodayTasks(): {
  tasks: Task[]
  isLoading: boolean
} {
  const user = useAuthStore(s => s.user)

  const result = useLiveQuery(async () => {
    if (!user) return []

    const { start, end } = getDayBounds(user.timezone, 0)

    const dbRecords = await activeTasks(user.id)
      .filter(t =>
        t.isCompleted &&
        t.completedAt !== null &&
        t.completedAt >= start &&
        t.completedAt <= end
      )
      .toArray()

    dbRecords.sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))

    const uiTasks = await Promise.all(dbRecords.map(dbTaskToUi))
    return uiTasks as Task[]
  }, [user?.id])

  return {
    tasks: result ?? [],
    isLoading: result === undefined,
  }
}
