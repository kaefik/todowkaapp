import type { Task, GroupBy, GtdStatus } from '../hooks/useTasks'

export interface TaskGroup {
  key: string
  label: string
  color?: string | null
  icon?: string | null
  order: number
  tasks: Task[]
}

const NO_GROUP_KEY = '__none__'

const GTD_STATUS_ORDER: Record<GtdStatus, number> = {
  inbox: 0,
  active: 1,
  next: 2,
  waiting: 3,
  someday: 4,
  completed: 5,
  trash: 6,
}

function getDueDateBucket(dueDate: string | null): { key: string; order: number } {
  if (!dueDate) return { key: 'no_due_date', order: 100 }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { key: 'overdue', order: 0 }
  if (diffDays === 0) return { key: 'today', order: 1 }
  if (diffDays === 1) return { key: 'tomorrow', order: 2 }
  if (diffDays <= 7) return { key: 'next7days', order: 3 }
  return { key: 'later', order: 4 }
}

export function groupTasks(tasks: Task[], groupBy: GroupBy): TaskGroup[] {
  const groupMap = new Map<string, TaskGroup>()

  for (const task of tasks) {
    let key: string
    let label: string
    let color: string | null | undefined
    let icon: string | null | undefined
    let order: number

    switch (groupBy) {
      case 'project': {
        if (task.project) {
          key = task.project.id
          label = task.project.name
          color = task.project.color
        } else {
          key = NO_GROUP_KEY
          label = 'noProject'
        }
        order = task.project ? 0 : 999
        break
      }
      case 'area': {
        if (task.area) {
          key = task.area.id
          label = task.area.name
          color = task.area.color
          order = 0
        } else {
          key = NO_GROUP_KEY
          label = 'noArea'
          order = 999
        }
        break
      }
      case 'context': {
        if (task.context) {
          key = task.context.id
          label = task.context.name
          color = task.context.color
          icon = task.context.icon
        } else {
          key = NO_GROUP_KEY
          label = 'noContext'
        }
        order = task.context ? 0 : 999
        break
      }
      case 'due_date': {
        const bucket = getDueDateBucket(task.due_date)
        key = bucket.key
        label = bucket.key
        order = bucket.order
        break
      }
      case 'gtd_status': {
        key = task.gtd_status
        label = task.gtd_status
        order = GTD_STATUS_ORDER[task.gtd_status] ?? 99
        break
      }
    }

    const existing = groupMap.get(key)
    if (existing) {
      existing.tasks.push(task)
    } else {
      groupMap.set(key, { key, label, color, icon, order, tasks: [task] })
    }
  }

  const groups = Array.from(groupMap.values())

  groups.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.label.localeCompare(b.label)
  })

  return groups
}
