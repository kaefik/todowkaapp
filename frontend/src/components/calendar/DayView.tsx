import { useMemo, useState } from 'react'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks, type CalendarTaskItem } from '../../hooks/useCalendarTasks'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { EventEditorModal } from './EventEditorModal'

type SlotItem =
  | { type: 'task'; data: CalendarTaskItem }
  | { type: 'event'; data: CalendarEvent }

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toHourKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
}

export function DayView() {
  const { currentDate } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const [editorEvent, setEditorEvent] = useState<CalendarEvent | null>(null)
  const [editorDefaultStart, setEditorDefaultStart] = useState<string | undefined>(undefined)

  const today = new Date()
  const isCurrentToday = isSameDay(currentDate, today)
  const currentHour = today.getHours()

  const allDayEvents = useMemo(
    () => events.filter((e) => e.all_day && isSameDay(new Date(e.start_time), currentDate)),
    [events, currentDate],
  )

  const allDayTasks = useMemo(
    () => tasks.filter((t) => t.all_day && isSameDay(new Date(t.start_time), currentDate)),
    [tasks, currentDate],
  )

  const timedEvents = useMemo(
    () => events.filter((e) => !e.all_day && isSameDay(new Date(e.start_time), currentDate)),
    [events, currentDate],
  )

  const timedTasks = useMemo(
    () => tasks.filter((t) => !t.all_day && isSameDay(new Date(t.start_time), currentDate)),
    [tasks, currentDate],
  )

  const hours = useMemo(() => {
    const result: { hour: number; items: SlotItem[] }[] = []
    for (let h = 0; h < 24; h++) {
      const items: SlotItem[] = []
      timedEvents
        .filter((e) => new Date(e.start_time).getHours() === h)
        .forEach((e) => items.push({ type: 'event', data: e }))
      timedTasks
        .filter((t) => new Date(t.start_time).getHours() === h)
        .forEach((t) => items.push({ type: 'task', data: t }))
      result.push({ hour: h, items })
    }
    return result
  }, [timedEvents, timedTasks])

  const handleSlotClick = (hour: number) => {
    const d = new Date(currentDate)
    d.setHours(hour, 0, 0, 0)
    setEditorDefaultStart(d.toISOString())
    setEditorEvent(null)
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div>
      {(allDayEvents.length > 0 || allDayTasks.length > 0) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md p-2 mb-2 space-y-1">
          {allDayEvents.map((e) => (
            <CalendarEventCard key={e.id} event={e} compact />
          ))}
          {allDayTasks.map((t) => (
            <CalendarTaskCard key={t.id} task={t} compact />
          ))}
        </div>
      )}

      <div className="relative">
        {hours.map(({ hour, items }) => {
          const isCurrentHour = isCurrentToday && hour === currentHour
          const key = toHourKey(currentDate)

          return (
            <div
              key={`${key}-${hour}`}
              className={`flex min-h-[48px] border-b border-gray-100 dark:border-gray-800 ${
                isCurrentHour ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
              }`}
              onClick={() => items.length === 0 && handleSlotClick(hour)}
            >
              <div className="w-16 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 py-1 pr-2 text-right">
                {pad(hour)}:00
              </div>
              <div className="flex-1 py-1 space-y-1 relative">
                {isCurrentHour && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 z-10" />
                )}
                {items.map((item) =>
                  item.type === 'task' ? (
                    <CalendarTaskCard key={item.data.id} task={item.data} compact />
                  ) : (
                    <CalendarEventCard key={item.data.id} event={item.data} compact />
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editorEvent !== null || editorDefaultStart !== undefined ? (
        <EventEditorModal
          event={editorEvent}
          defaultStart={editorDefaultStart}
          onClose={() => { setEditorEvent(null); setEditorDefaultStart(undefined) }}
        />
      ) : null}
    </div>
  )
}
