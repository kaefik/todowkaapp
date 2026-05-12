import { formatTimeRange } from '../../utils/calendarEvents'

const DEFAULT_COLOR = '#10b981'

function isEventPast(event: { start_time: string; end_time: string | null; all_day: boolean }): boolean {
  if (event.all_day) return false
  const now = new Date()
  const end = event.end_time ? new Date(event.end_time) : new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000)
  return now > end
}

interface CalendarEventCardProps {
  event: {
    id: string
    title: string
    start_time: string
    end_time: string | null
    all_day: boolean
    color: string | null
    recurrence_type: string | null
  }
  onClick?: () => void
  compact?: boolean
  timedStyle?: React.CSSProperties
  showTimeRange?: boolean
  multiDay?: 'start' | 'middle' | 'end' | 'single'
}

export function CalendarEventCard({ event, onClick, compact, timedStyle, showTimeRange, multiDay }: CalendarEventCardProps) {
  const color = event.color || DEFAULT_COLOR
  const past = isEventPast(event)

  const isTimed = !!timedStyle
  const roundedClass = multiDay === 'start' ? 'rounded-l' : multiDay === 'end' ? 'rounded-r' : multiDay === 'middle' ? '' : 'rounded'
  const opacityClass = past ? 'opacity-60 line-through' : ''

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1 text-xs truncate border-l-2 ${isTimed ? 'absolute' : ''} ${roundedClass} ${opacityClass}`}
      style={{
        backgroundColor: color + '20',
        borderLeftColor: color,
        color,
        ...timedStyle,
      }}
    >
      <span className="truncate block">
        {past && <span className="mr-1">&#10003;</span>}
        📅 {event.title}
        {event.recurrence_type && <span className="ml-1">🔄</span>}
      </span>
      {showTimeRange && !event.all_day && (
        <span className="text-[10px] opacity-70 block truncate">
          {formatTimeRange(event.start_time, event.end_time)}
        </span>
      )}
      {!compact && !showTimeRange && !event.all_day && event.start_time && (
        <span className="text-[10px] opacity-70 block">
          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </button>
  )
}
