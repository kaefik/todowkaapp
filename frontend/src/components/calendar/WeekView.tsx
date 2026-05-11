import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks } from '../../hooks/useCalendarTasks'
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
  isMultiDay,
  pad,
} from '../../utils/calendarEvents'

const HOUR_HEIGHT = 40
const WEEK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

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

function dayIndexInWeek(event: CalendarEvent, weekDays: Date[]): number {
  const start = new Date(event.start_time)
  return weekDays.findIndex((d) => isSameDay(d, start))
}

function multiDaySpanInWeek(event: CalendarEvent, weekDays: Date[]): { startIdx: number; span: number } {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : start

  let startIdx = weekDays.findIndex((d) => isSameDay(d, start))
  if (startIdx === -1) {
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const weekStart = new Date(weekDays[0].getFullYear(), weekDays[0].getMonth(), weekDays[0].getDate())
    if (startDay < weekStart) {
      startIdx = 0
    } else {
      return { startIdx: -1, span: 0 }
    }
  }

  const startBound = new Date(weekDays[startIdx].getFullYear(), weekDays[startIdx].getMonth(), weekDays[startIdx].getDate())
  const endBound = new Date(weekDays[6].getFullYear(), weekDays[6].getMonth(), weekDays[6].getDate(), 23, 59, 59)

  const eventEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  if (event.all_day && event.end_time) {
    eventEnd.setDate(eventEnd.getDate() - 1)
  }

  const clampedEnd = eventEnd > endBound ? endBound : eventEnd
  const span = Math.round((clampedEnd.getTime() - startBound.getTime()) / (86400000)) + 1

  return { startIdx, span: Math.min(span, 7 - startIdx) }
}

export function WeekView() {
  const navigate = useNavigate()
  const { t } = useTranslation('calendar')
  const { currentDate, openTaskDetail, selectedTaskId, closeTaskDetail } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const [editorEvent, setEditorEvent] = useState<CalendarEvent | null>(null)
  const [editorDefaultStart, setEditorDefaultStart] = useState<string | undefined>(undefined)
  const [editorDefaultEnd, setEditorDefaultEnd] = useState<string | undefined>(undefined)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const allDayRef = useRef<HTMLDivElement>(null)

  const handleTaskEdit = (task: Task) => {
    closeTaskDetail()
    navigate(`/tasks?editTaskId=${task.id}`)
  }

  const handleEventEdit = (event: CalendarEvent) => {
    setDetailEvent(null)
    setEditorEvent(event)
  }

  const pad2 = (n: number) => String(n).padStart(2, '0')

  const handleSlotClick = (day: Date, hour: number) => {
    const d = new Date(day)
    d.setHours(hour, 0, 0, 0)
    setEditorDefaultStart(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`)
    const end = new Date(d)
    end.setHours(end.getHours() + 1)
    setEditorDefaultEnd(`${end.getFullYear()}-${pad2(end.getMonth() + 1)}-${pad2(end.getDate())}T${pad2(end.getHours())}:${pad2(end.getMinutes())}`)
    setEditorEvent(null)
  }

  const today = new Date()
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const categorized = useMemo(() => {
    const topEvents: CalendarEvent[] = []
    const timedByDay: Map<number, CalendarEvent[]> = new Map()

    for (const e of events) {
      const cat = getEventCategory(e)
      if (cat === 'all-day-single' || cat === 'all-day-multi' || cat === 'timed-multi') {
        topEvents.push(e)
      } else {
        const idx = dayIndexInWeek(e, weekDays)
        if (idx !== -1) {
          const arr = timedByDay.get(idx) || []
          arr.push(e)
          timedByDay.set(idx, arr)
        }
      }
    }

    return { topEvents, timedByDay }
  }, [events, weekDays])

  const allDayTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.all_day && weekDays.some((d) => isSameDay(new Date(t.start_time), d)),
        )
        .sort((a, b) => Number(b.is_completed) - Number(a.is_completed)),
    [tasks, weekDays],
  )

  const timedTasks = useMemo(
    () => tasks.filter((t) => !t.all_day && weekDays.some((d) => isSameDay(new Date(t.start_time), d))),
    [tasks, weekDays],
  )

  const multiDayBars = useMemo(() => {
    const bars: { event: CalendarEvent; startIdx: number; span: number }[] = []
    for (const e of categorized.topEvents) {
      if (isMultiDay(e) || getEventCategory(e) === 'timed-multi') {
        const { startIdx, span } = multiDaySpanInWeek(e, weekDays)
        if (startIdx >= 0 && span > 0) {
          bars.push({ event: e, startIdx, span })
        }
      }
    }
    return bars
  }, [categorized.topEvents, weekDays])

  const singleAllDayByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const e of categorized.topEvents) {
      if (!isMultiDay(e) && getEventCategory(e) !== 'timed-multi') {
        const idx = dayIndexInWeek(e, weekDays)
        if (idx !== -1) {
          const arr = map.get(idx) || []
          arr.push(e)
          map.set(idx, arr)
        }
      }
    }
    return map
  }, [categorized.topEvents, weekDays])

  const allDayTasksByDay = useMemo(() => {
    const map = new Map<number, typeof allDayTasks>()
    for (const t of allDayTasks) {
      const idx = weekDays.findIndex((d) => isSameDay(d, new Date(t.start_time)))
      if (idx !== -1) {
        const arr = map.get(idx) || []
        arr.push(t)
        map.set(idx, arr)
      }
    }
    return map
  }, [allDayTasks, weekDays])

  const allDayRowCount = useMemo(() => {
    let maxRows = 1
    for (let i = 0; i < 7; i++) {
      const count = (singleAllDayByDay.get(i)?.length || 0) + (allDayTasksByDay.get(i)?.length || 0)
      maxRows = Math.max(maxRows, count)
    }
    const barRows = multiDayBars.length
    return maxRows + barRows
  }, [singleAllDayByDay, allDayTasksByDay, multiDayBars])

  const positionedDayEvents = useMemo(() => {
    const result = new Map<number, { event: CalendarEvent; style: React.CSSProperties }[]>()
    for (const [dayIdx, dayEvents] of categorized.timedByDay) {
      const items = dayEvents.map((e) => {
        const start = new Date(e.start_time)
        const startMinute = start.getHours() * 60 + start.getMinutes()
        const durationMin = getDurationMinutes(e)
        return { event: e, startMinute, endMinute: startMinute + durationMin }
      })

      const grouped = getOverlappingGroups(items)
      const positioned = grouped.map(({ item, column, totalColumns }) => {
        const top = (item.startMinute / 60) * HOUR_HEIGHT
        const height = Math.max(((item.endMinute - item.startMinute) / 60) * HOUR_HEIGHT, 18)
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
      result.set(dayIdx, positioned)
    }
    return result
  }, [categorized.timedByDay])

  const timedTasksByDay = useMemo(() => {
    const map = new Map<number, Map<number, typeof timedTasks>>()
    for (const t of timedTasks) {
      const dayIdx = weekDays.findIndex((d) => isSameDay(d, new Date(t.start_time)))
      if (dayIdx !== -1) {
        const hourMap = map.get(dayIdx) || new Map()
        const h = new Date(t.start_time).getHours()
        const arr = hourMap.get(h) || []
        arr.push(t)
        hourMap.set(h, arr)
        map.set(dayIdx, hourMap)
      }
    }
    return map
  }, [timedTasks, weekDays])

  const totalGridHeight = 24 * HOUR_HEIGHT

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

      {(categorized.topEvents.length > 0 || allDayTasks.length > 0) && (
        <div
          ref={allDayRef}
          className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 relative"
          style={{ minHeight: allDayRowCount * 26 + 8 }}
        >
          <div className="text-xs text-gray-400 dark:text-gray-500 py-1 pr-2 text-right">
            {t('allDay', { defaultValue: 'Весь день' })}
          </div>
          {weekDays.map((_, i) => {
            const dayEvents = singleAllDayByDay.get(i) || []
            const dayTasks = allDayTasksByDay.get(i) || []
            return (
              <div key={i} className="p-0.5 space-y-0.5">
                {dayEvents.map((e) => (
                  <CalendarEventCard key={e.id} event={e} compact onClick={() => setDetailEvent(e)} />
                ))}
                {dayTasks.map((t) => (
                  <CalendarTaskCard key={t.id} task={t} compact onClick={() => openTaskDetail(t.id)} />
                ))}
              </div>
            )
          })}
          {multiDayBars.map(({ event, startIdx, span }, barIdx) => {
            const colStart = startIdx + 2
            const colEnd = colStart + span
            return (
              <div
                key={`bar-${event.id}-${barIdx}`}
                className="px-0.5"
                style={{
                  gridColumn: `${colStart} / ${colEnd}`,
                  gridRow: '1',
                  position: 'relative',
                  top: barIdx * 26,
                  height: 22,
                  zIndex: 3,
                }}
              >
                <CalendarEventCard event={event} compact onClick={() => setDetailEvent(event)} />
              </div>
            )
          })}
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto">
        <div className="flex">
          <div className="w-14 flex-shrink-0">
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

          <div className="flex-1 grid grid-cols-7 relative" style={{ height: totalGridHeight }}>
            {weekDays.map((day, dayIdx) => {
              const isCurrentDay = isSameDay(day, today)
              const dayPositioned = positionedDayEvents.get(dayIdx) || []
              const dayTaskMap = timedTasksByDay.get(dayIdx) || new Map()

              return (
                <div
                  key={dayIdx}
                  className={`relative border-r border-gray-100 dark:border-gray-800 ${
                    isCurrentDay ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''
                  }`}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                      style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      onClick={() => handleSlotClick(day, hour)}
                    />
                  ))}

                  {dayPositioned.map(({ event, style }) => (
                    <CalendarEventCard
                      key={event.id}
                      event={event}
                      showTimeRange
                      timedStyle={style}
                      onClick={() => setDetailEvent(event)}
                    />
                  ))}

                  {Array.from(dayTaskMap.entries()).map(([hour, hourTasks]) =>
                    hourTasks.map((task) => {
                      const top = hour * HOUR_HEIGHT
                      return (
                        <div
                          key={task.id}
                          className="absolute left-0 right-0 z-1 px-0.5"
                          style={{ top }}
                        >
                          <CalendarTaskCard task={task} compact onClick={() => openTaskDetail(task.id)} />
                        </div>
                      )
                    }),
                  )}
                </div>
              )
            })}
          </div>
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
