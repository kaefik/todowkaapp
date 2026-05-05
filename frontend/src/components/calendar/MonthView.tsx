import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks, type CalendarTaskItem } from '../../hooks/useCalendarTasks'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { DayDetailDrawer } from './DayDetailDrawer'
import { EventEditorModal } from './EventEditorModal'

const MAX_VISIBLE = 3

const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

type SlotItem =
  | { type: 'task'; data: CalendarTaskItem }
  | { type: 'event'; data: CalendarEvent }

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthGrid(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  let startDow = firstDay.getDay()
  if (startDow === 0) startDow = 7
  const startOffset = startDow - 1
  const days: Date[] = []
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    days.push(new Date(year, month, 1 + i))
  }
  return days
}

function toLocalDayStart(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function toLocalDayEnd(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

export function MonthView() {
  const { t } = useTranslation('calendar')
  const { currentDate, openDetailDrawer } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const [editorEvent, setEditorEvent] = useState<CalendarEvent | null>(null)
  const [editorDefaultStart, setEditorDefaultStart] = useState<string | undefined>(undefined)

  const days = useMemo(() => getMonthGrid(currentDate), [currentDate])

  const getItemsForDay = useMemo(() => {
    return (day: Date) => {
      const dayStart = toLocalDayStart(day)
      const dayEnd = toLocalDayEnd(day)
      return {
        events: events.filter((e) => {
          const s = new Date(e.start_time)
          return s >= dayStart && s <= dayEnd
        }),
        tasks: tasks.filter((t) => {
          const s = new Date(t.start_time)
          return s >= dayStart && s <= dayEnd
        }),
      }
    }
  }, [events, tasks])

  const today = new Date()

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAY_KEYS.map((key) => (
          <div
            key={key}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
          >
            {t(`weekDays.${key}`)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
        {days.map((day, i) => {
          const items = getItemsForDay(day)
          const allItems: SlotItem[] = [
            ...items.tasks.map((t) => ({ type: 'task' as const, data: t })),
            ...items.events.map((e) => ({ type: 'event' as const, data: e })),
          ]
          const currentMonth = day.getMonth() === currentDate.getMonth()
          const isCurrentDay = isSameDay(day, today)

          return (
            <div
              key={i}
              className={`min-h-[80px] border-b border-r border-gray-200 dark:border-gray-700 p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                !currentMonth ? 'opacity-40' : ''
              }`}
              onClick={() => openDetailDrawer(day)}
            >
              <div className="flex justify-center mb-1">
                {isCurrentDay ? (
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-medium">
                    {day.getDate()}
                  </span>
                ) : (
                  <span className="text-xs text-gray-700 dark:text-gray-300">{day.getDate()}</span>
                )}
              </div>

              <div className="space-y-0.5">
                {allItems.slice(0, MAX_VISIBLE).map((item, idx) =>
                  item.type === 'task' ? (
                    <CalendarTaskCard key={`t-${idx}`} task={item.data} compact />
                  ) : (
                    <CalendarEventCard key={`e-${idx}`} event={item.data} compact />
                  ),
                )}
                {allItems.length > MAX_VISIBLE && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                    {t('moreEvents', { count: allItems.length - MAX_VISIBLE })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <DayDetailDrawer getItemsForDay={getItemsForDay} />

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
