import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface CalendarTaskItem {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  all_day: boolean
  gtd_status: string
  is_completed: boolean
  project_id: string | null
  color: string
}

const GTD_STATUS_COLORS: Record<string, string> = {
  inbox: '#6b7280',
  active: '#3b82f6',
  next: '#6366f1',
  waiting: '#f59e0b',
  someday: '#8b5cf6',
  completed: '#10b981',
}

function isAllDayDueDate(dueDate: string): boolean {
  const d = new Date(dueDate)
  return d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() === 59
}

export function useCalendarTasks() {
  const user = useAuthStore(s => s.user)

  const { data: tasks = [] } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.tasks, user.id)
        .filter(t => !!t.dueDate)
        .toArray()
      return records.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        start_time: t.dueDate!,
        end_time: null,
        all_day: t.dueDate ? isAllDayDueDate(t.dueDate) : true,
        gtd_status: t.gtdStatus,
        is_completed: t.isCompleted,
        project_id: t.projectId,
        color: GTD_STATUS_COLORS[t.gtdStatus] || '#6b7280',
      })) as CalendarTaskItem[]
    },
    [user?.id]
  )

  return { tasks }
}
