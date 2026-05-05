import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks } from '../../hooks/useCalendarTasks'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { EventEditorModal } from './EventEditorModal'
import { TaskDetailModal } from '../TaskDetailModal'
import type { Task } from '../../hooks/useTasks'

const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const r = new Date(d)
    r.setDate(r.getDate() + i)
    return r
  })
}

export function WeekView() {
  const navigate = useNavigate()
  const { t } = useTranslation('calendar')
  const { currentDate, openTaskDetail, selectedTaskId, closeTaskDetail } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const [editorEvent, setEditorEvent] = useState<CalendarEvent | null>(null)
  const [editorDefaultStart, setEditorDefaultStart] = useState<string | undefined>(undefined)

  const handleTaskEdit = (task: Task) => {
    closeTaskDetail()
    navigate(`/tasks?editTaskId=${task.id}`)
  }

  const today = new Date()
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const allDayEvents = useMemo(
    () => events.filter((e) => e.all_day && weekDays.some((d) => isSameDay(new Date(e.start_time), d))),
    [events, weekDays],
  )

  const allDayTasks = useMemo(
    () => tasks.filter((t) => t.all_day && weekDays.some((d) => isSameDay(new Date(t.start_time), d))),
    [tasks, weekDays],
  )

  const timedEvents = useMemo(
    () => events.filter((e) => !e.all_day && weekDays.some((d) => isSameDay(new Date(e.start_time), d))),
    [events, weekDays],
  )

  const timedTasks = useMemo(
    () => tasks.filter((t) => !t.all_day && weekDays.some((d) => isSameDay(new Date(t.start_time), d))),
    [tasks, weekDays],
  )

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div>
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700">
        <div />
        {weekDays.map((day, i) => {
          const isCurrent = isSameDay(day, today)
          return (
            <div
              key={i}
              className={`text-center py-2 text-sm ${
                isCurrent
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <div>{t(`weekDays.${WEEK_DAY_KEYS[i]}`)}</div>
              <div className="text-lg">{day.getDate()}</div>
            </div>
          )
        })}
      </div>

      {(allDayEvents.length > 0 || allDayTasks.length > 0) && (
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div />
          {weekDays.map((day, i) => {
            const dayAllDayEvents = allDayEvents.filter((e) => isSameDay(new Date(e.start_time), day))
            const dayAllDayTasks = allDayTasks.filter((t) => isSameDay(new Date(t.start_time), day))
            return (
              <div key={i} className="p-1 space-y-0.5 min-h-[28px]">
                {dayAllDayEvents.map((e) => (
                  <CalendarEventCard key={e.id} event={e} compact />
                ))}
                {dayAllDayTasks.map((t) => (
                  <CalendarTaskCard key={t.id} task={t} compact onClick={() => openTaskDetail(t.id)} />
                ))}
              </div>
            )
          })}
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto">
        {Array.from({ length: 24 }, (_, hour) => (
          <div key={hour} className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-100 dark:border-gray-800">
            <div className="text-xs text-gray-400 dark:text-gray-500 py-1 pr-2 text-right">
              {pad(hour)}:00
            </div>
            {weekDays.map((day, i) => {
              const hourEvents = timedEvents.filter(
                (e) => isSameDay(new Date(e.start_time), day) && new Date(e.start_time).getHours() === hour,
              )
              const hourTasks = timedTasks.filter(
                (t) => isSameDay(new Date(t.start_time), day) && new Date(t.start_time).getHours() === hour,
              )
              return (
                <div key={i} className="p-0.5 min-h-[40px] space-y-0.5">
                  {hourEvents.map((e) => (
                    <CalendarEventCard key={e.id} event={e} compact />
                  ))}
                  {hourTasks.map((t) => (
                    <CalendarTaskCard key={t.id} task={t} compact onClick={() => openTaskDetail(t.id)} />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {editorEvent !== null || editorDefaultStart !== undefined ? (
        <EventEditorModal
          event={editorEvent}
          defaultStart={editorDefaultStart}
          onClose={() => { setEditorEvent(null); setEditorDefaultStart(undefined) }}
        />
      ) : null}

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={closeTaskDetail}
        onEdit={handleTaskEdit}
      />
    </div>
  )
}
