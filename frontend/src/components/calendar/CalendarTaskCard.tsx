import type { CalendarTaskItem } from '../../hooks/useCalendarTasks'

interface CalendarTaskCardProps {
  task: CalendarTaskItem
  onClick?: () => void
  compact?: boolean
  timedStyle?: React.CSSProperties
  showTimeRange?: boolean
}

export function CalendarTaskCard({ task, onClick, compact, timedStyle, showTimeRange }: CalendarTaskCardProps) {
  const now = new Date()
  const isOverdue = !task.is_completed && new Date(task.start_time) < now
  const isCompleted = task.is_completed

  let cardClass: string
  let cardStyle: React.CSSProperties = {}

  if (isOverdue) {
    cardClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-l-2 border-red-400'
  } else if (isCompleted) {
    cardClass = 'opacity-60 line-through bg-gray-50 dark:bg-gray-800/50 border-l-2 border-gray-300 dark:border-gray-600'
  } else {
    cardClass = 'border-l-2'
    cardStyle = {
      backgroundColor: task.color + '20',
      borderLeftColor: task.color,
      color: task.color,
    }
  }

  const isTimed = !!timedStyle

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1 rounded text-xs truncate ${isTimed ? 'absolute' : ''} ${cardClass}`}
      style={{ ...cardStyle, ...timedStyle }}
    >
      <span className="truncate block">
        {isCompleted && <span className="mr-1">&#10003;</span>}
        {task.title}
      </span>
      {showTimeRange && !task.all_day && task.start_time && (
        <span className="text-[10px] opacity-70 block truncate">
          {new Date(task.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {!compact && !showTimeRange && !task.all_day && task.start_time && (
        <span className="text-[10px] opacity-70 block">
          {new Date(task.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </button>
  )
}
