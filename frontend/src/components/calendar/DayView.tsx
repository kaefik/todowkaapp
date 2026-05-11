import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks, type CalendarTaskItem } from '../../hooks/useCalendarTasks'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { EventEditorModal } from './EventEditorModal'
import { EventDetailModal } from '../EventDetailModal'
import { TaskDetailModal } from '../TaskDetailModal'
import type { Task } from '../../hooks/useTasks'
import {
  isSameDay,
  getEventCategory,
  getDurationMinutes,
  getOverlappingGroups,
  pad,
} from '../../utils/calendarEvents'

const HOUR_HEIGHT = 48

export function DayView() {
  const navigate = useNavigate()
  const { t } = useTranslation('calendar')
  const { currentDate, openTaskDetail, selectedTaskId, closeTaskDetail } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const [editorEvent, setEditorEvent] = useState<CalendarEvent | null>(null)
  const [editorDefaultStart, setEditorDefaultStart] = useState<string | undefined>(undefined)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)

  const handleTaskEdit = (task: Task) => {
    closeTaskDetail()
    navigate(`/tasks?editTaskId=${task.id}`)
  }

  const handleEventEdit = (event: CalendarEvent) => {
    setDetailEvent(null)
    setEditorEvent(event)
  }

  const today = new Date()
  const isCurrentToday = isSameDay(currentDate, today)
  const currentHour = today.getHours()
  const currentMinute = today.getMinutes()

  const topSectionEvents = useMemo(
    () =>
      events.filter((e) => {
        if (!isSameDay(new Date(e.start_time), currentDate)) return false
        const cat = getEventCategory(e)
        return cat === 'all-day-single' || cat === 'all-day-multi' || cat === 'timed-multi'
      }),
    [events, currentDate],
  )

  const allDayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.all_day && isSameDay(new Date(t.start_time), currentDate))
        .sort((a, b) => Number(b.is_completed) - Number(a.is_completed)),
    [tasks, currentDate],
  )

  const timedEvents = useMemo(
    () =>
      events.filter((e) => {
        if (!isSameDay(new Date(e.start_time), currentDate)) return false
        return getEventCategory(e) === 'timed-single'
      }),
    [events, currentDate],
  )

  const timedTasks = useMemo(
    () => tasks.filter((t) => !t.all_day && isSameDay(new Date(t.start_time), currentDate)),
    [tasks, currentDate],
  )

  const overdueTasks = useMemo(() => {
    if (!isCurrentToday) return []
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return tasks.filter((t) => !t.is_completed && new Date(t.start_time) < now)
  }, [tasks, isCurrentToday])

  const positionedEvents = useMemo(() => {
    const items = timedEvents.map((e) => {
      const start = new Date(e.start_time)
      const startMinute = start.getHours() * 60 + start.getMinutes()
      const durationMin = getDurationMinutes(e)
      return { event: e, startMinute, endMinute: startMinute + durationMin }
    })

    const grouped = getOverlappingGroups(items)

    return grouped.map(({ item, column, totalColumns }) => {
      const top = (item.startMinute / 60) * HOUR_HEIGHT
      const height = Math.max(((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT, 20)
      const widthPercent = 100 / totalColumns
      const leftPercent = column * widthPercent

      return {
        event: item.event,
        style: {
          top,
          height,
          width: `${widthPercent - 1}%`,
          left: `${leftPercent}%`,
          zIndex: 2,
        } as React.CSSProperties,
      }
    })
  }, [timedEvents])

  const positionedTasks = useMemo(() => {
    return timedTasks.map((t) => {
      const start = new Date(t.start_time)
      const startMinute = start.getHours() * 60 + start.getMinutes()
      const top = (startMinute / 60) * HOUR_HEIGHT
      return { task: t, top }
    })
  }, [timedTasks])

  const taskHours = useMemo(() => {
    const map = new Map<number, CalendarTaskItem[]>()
    for (const t of timedTasks) {
      const h = new Date(t.start_time).getHours()
      const arr = map.get(h) || []
      arr.push(t)
      map.set(h, arr)
    }
    return map
  }, [timedTasks])

  const handleSlotClick = (hour: number) => {
    const d = new Date(currentDate)
    d.setHours(hour, 0, 0, 0)
    setEditorDefaultStart(d.toISOString())
    setEditorEvent(null)
  }

  const nowIndicatorTop = isCurrentToday
    ? ((currentHour * 60 + currentMinute) / 60) * HOUR_HEIGHT
    : -1

  const totalGridHeight = 24 * HOUR_HEIGHT

  return (
    <div>
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-2 mb-2 space-y-1">
          <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
            ⚠️ {t('overdueTasks')}
          </div>
          {overdueTasks.map((t) => (
            <CalendarTaskCard key={t.id} task={t} compact onClick={() => openTaskDetail(t.id)} />
          ))}
        </div>
      )}

      {(topSectionEvents.length > 0 || allDayTasks.length > 0) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md p-2 mb-2 space-y-1">
          {topSectionEvents.map((e) => (
            <CalendarEventCard key={e.id} event={e} compact onClick={() => setDetailEvent(e)} />
          ))}
          {allDayTasks.map((t) => (
            <CalendarTaskCard key={t.id} task={t} compact onClick={() => openTaskDetail(t.id)} />
          ))}
        </div>
      )}

      <div className="flex">
        <div className="w-16 flex-shrink-0">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="text-xs text-gray-400 dark:text-gray-500 pr-2 text-right"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="relative -top-2 inline-block">{pad(hour)}:00</span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative" style={{ height: totalGridHeight }}>
          {Array.from({ length: 24 }, (_, hour) => {
            const isCurrentHour = isCurrentToday && hour === currentHour
            const hourTasks = taskHours.get(hour) || []
            return (
              <div
                key={hour}
                className={`absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 ${
                  isCurrentHour ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                }`}
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => hourTasks.length === 0 && handleSlotClick(hour)}
              />
            )
          })}

          {nowIndicatorTop >= 0 && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
              style={{ top: nowIndicatorTop }}
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
            </div>
          )}

          {positionedEvents.map(({ event, style }) => (
            <CalendarEventCard
              key={event.id}
              event={event}
              showTimeRange
              timedStyle={style}
              onClick={() => setDetailEvent(event)}
            />
          ))}

          {positionedTasks.map(({ task, top }) => (
            <div
              key={task.id}
              className="absolute left-0 right-0 z-1 px-0.5"
              style={{ top }}
            >
              <CalendarTaskCard task={task} compact onClick={() => openTaskDetail(task.id)} />
            </div>
          ))}
        </div>
      </div>

      {editorEvent !== null || editorDefaultStart !== undefined ? (
        <EventEditorModal
          event={editorEvent}
          defaultStart={editorDefaultStart}
          onClose={() => {
            setEditorEvent(null)
            setEditorDefaultStart(undefined)
          }}
        />
      ) : null}

      <TaskDetailModal
        taskId={selectedTaskId}
        isOpen={!!selectedTaskId}
        onClose={closeTaskDetail}
        onEdit={handleTaskEdit}
      />

      <EventDetailModal
        event={detailEvent}
        isOpen={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        onEdit={handleEventEdit}
      />
    </div>
  )
}
