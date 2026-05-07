const DEFAULT_COLOR = '#10b981'

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
}

export function CalendarEventCard({ event, onClick, compact }: CalendarEventCardProps) {
  const color = event.color || DEFAULT_COLOR

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2 py-1 rounded text-xs truncate border-l-2"
      style={{
        backgroundColor: color + '20',
        borderLeftColor: color,
        color,
      }}
    >
      <span className="truncate block">
        📅 {event.title}
        {event.recurrence_type && <span className="ml-1">🔄</span>}
      </span>
      {!compact && !event.all_day && event.start_time && (
        <span className="text-[10px] opacity-70 block">
          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </button>
  )
}
