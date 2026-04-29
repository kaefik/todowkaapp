import { useLiveQuery } from 'dexie-react-hooks'
import { activeTasks } from '../db/database'
import { dbTaskToUi } from '../db/mappers'
import { useAuthStore } from '../stores/authStore'
import { getDayBounds } from './useDueDateTasks'
import type { Task } from './useTasks'

export function useOverdueTasks(): {
  tasks: Task[]
  isLoading: boolean
  count: number
} {
  const user = useAuthStore(s => s.user)

  const result = useLiveQuery(async () => {
    if (!user) return { tasks: [], count: 0 }

    const { start } = getDayBounds(user.timezone, 0)

    const dbRecords = await activeTasks(user.id)
      .filter(t =>
        !t.isCompleted &&
        t.dueDate !== null &&
        t.dueDate < start
      )
      .toArray()

    const uiTasks = await Promise.all(dbRecords.map(dbTaskToUi))
    uiTasks.sort((a, b) => a.position - b.position)

    return { tasks: uiTasks as Task[], count: uiTasks.length }
  }, [user?.id])

  return {
    tasks: result?.tasks ?? [],
    isLoading: result === undefined,
    count: result?.count ?? 0,
  }
}
