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
  getOverlappingGroups,
  pad,
  toTimedItems,
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
  const [editorDefaultEnd, setEditorDefaultEnd] = useState<string | undefined>(undefined)
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

  const positionedItems = useMemo(() => {
    const items = toTimedItems(timedEvents, timedTasks)
    const grouped = getOverlappingGroups(items)

    return grouped.map(({ item, column, totalColumns }) => {
      const top = (item.startMinute / 60) * HOUR_HEIGHT
      const height = Math.max(((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT, 20)
      const widthPercent = 100 / totalColumns
      const leftPercent = column * widthPercent

      return {
        type: item.type as 'event' | 'task',
        data: item.data,
        style: {
          top,
          height,
          width: `${widthPercent - 1}%`,
          left: `${leftPercent}%`,
          zIndex: 2,
        } as React.CSSProperties,
      }
    })
  }, [timedEvents, timedTasks])

  const pad2 = (n: number) => String(n).padStart(2, '0')

  const handleSlotClick = (hour: number) => {
    const d = new Date(currentDate)
    d.setHours(hour, 0, 0, 0)
    setEditorDefaultStart(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`)
    const end = new Date(d)
    end.setHours(end.getHours() + 1)
    setEditorDefaultEnd(`${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}T${pad2(end.getHours())}:${pad2(end.getMinutes())}`)
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
            return (
              <div
                key={hour}
                className={`absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 ${
                  isCurrentHour ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                }`}
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => handleSlotClick(hour)}
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

          {positionedItems.map(({ type, data, style }) =>
            type === 'event' ? (
              <CalendarEventCard
                key={`event-${(data as unknown as CalendarEvent).id}`}
                event={data as unknown as CalendarEvent}
                showTimeRange
                timedStyle={style}
                onClick={() => setDetailEvent(data as unknown as CalendarEvent)}
              />
            ) : (
              <CalendarTaskCard
                key={`task-${(data as unknown as CalendarTaskItem).id}`}
                task={data as unknown as CalendarTaskItem}
                compact
                showTimeRange
                timedStyle={style}
                showMarker
                onClick={() => openTaskDetail((data as unknown as CalendarTaskItem).id)}
              />
            ),
          )}
        </div>
      </div>

      {editorEvent !== null || editorDefaultStart !== undefined ? (
        <EventEditorModal
          event={editorEvent}
          defaultStart={editorDefaultStart}
          defaultEnd={editorDefaultEnd}
          onClose={() => {
            setEditorEvent(null)
            setEditorDefaultStart(undefined)
            setEditorDefaultEnd(undefined)
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
