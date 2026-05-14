import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useCalendarStore } from '../../stores/calendarStore'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import { useCalendarTasks, type CalendarTaskItem } from '../../hooks/useCalendarTasks'
import { CalendarTaskCard } from './CalendarTaskCard'
import { CalendarEventCard } from './CalendarEventCard'
import { EventEditorModal } from './EventEditorModal'
import { EventDetailModal } from '../EventDetailModal'
import { TaskDetailModal } from '../TaskDetailModal'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useSwipe } from '../../hooks/useSwipe'
import type { Task } from '../../hooks/useTasks'
import {
  isSameDay,
  getEventCategory,
  getOverlappingGroups,
  isMultiDay,
  pad,
  toTimedItems,
  type CalendarTimedItem,
} from '../../utils/calendarEvents'

const HOUR_HEIGHT = 40
const MOBILE_HOUR_HEIGHT = 44
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
    const firstDay = weekDays[0]!
    const weekStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate())
    if (startDay < weekStart) {
      startIdx = 0
    } else {
      return { startIdx: -1, span: 0 }
    }
  }

  const startDay = weekDays[startIdx]!
  const lastDay = weekDays[6]!
  const startBound = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate())
  const endBound = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate(), 23, 59, 59)

  const eventEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  if (event.all_day && event.end_time) {
    eventEnd.setDate(eventEnd.getDate() - 1)
  }

  const clampedEnd = eventEnd > endBound ? endBound : eventEnd
  const span = Math.round((clampedEnd.getTime() - startBound.getTime()) / (86400000)) + 1

  return { startIdx, span: Math.min(span, 7 - startIdx) }
}

function getInitialMobilePair(weekDays: Date[], referenceDate: Date): number {
  const todayIdx = weekDays.findIndex((d) => isSameDay(d, referenceDate))
  if (todayIdx === -1) return 0
  return Math.min(todayIdx, 5)
}

export function WeekView() {
  const navigate = useNavigate()
  const { t } = useTranslation('calendar')
  const { currentDate, openTaskDetail, selectedTaskId, closeTaskDetail } = useCalendarStore()
  const { events } = useCalendarEvents()
  const { tasks } = useCalendarTasks()
  const isMobile = useIsMobile()
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

  const flatAllDayItems = useMemo(() => {
    const items: {
      type: 'event' | 'task'
      data: CalendarEvent | CalendarTaskItem
      dayIndex: number
      positionInDay: number
    }[] = []

    for (let i = 0; i < 7; i++) {
      const events = singleAllDayByDay.get(i) || []
      const tasks = allDayTasksByDay.get(i) || []
      let pos = 0
      for (const e of events) {
        items.push({ type: 'event', data: e, dayIndex: i, positionInDay: pos++ })
      }
      for (const t of tasks) {
        items.push({ type: 'task', data: t, dayIndex: i, positionInDay: pos++ })
      }
    }

    return items
  }, [singleAllDayByDay, allDayTasksByDay])

  const allDayRowCount = useMemo(() => {
    let maxSingleRows = 0
    for (let i = 0; i < 7; i++) {
      const count = (singleAllDayByDay.get(i)?.length || 0) + (allDayTasksByDay.get(i)?.length || 0)
      maxSingleRows = Math.max(maxSingleRows, count)
    }
    return multiDayBars.length + maxSingleRows
  }, [singleAllDayByDay, allDayTasksByDay, multiDayBars])

  const timedTasksByDayRaw = useMemo(() => {
    const map = new Map<number, CalendarTaskItem[]>()
    for (const t of timedTasks) {
      const dayIdx = weekDays.findIndex((d) => isSameDay(d, new Date(t.start_time)))
      if (dayIdx !== -1) {
        const arr = map.get(dayIdx) || []
        arr.push(t)
        map.set(dayIdx, arr)
      }
    }
    return map
  }, [timedTasks, weekDays])

  const positionedItems = useMemo(() => {
    const result = new Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>()
    const hourHeight = isMobile ? MOBILE_HOUR_HEIGHT : HOUR_HEIGHT

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayEvents = categorized.timedByDay.get(dayIdx) || []
      const dayTasks = timedTasksByDayRaw.get(dayIdx) || []
      const items = toTimedItems(dayEvents, dayTasks)

      if (items.length === 0) continue

      const grouped = getOverlappingGroups(items)
      const positioned = grouped.map(({ item, column, totalColumns }) => {
        const top = (item.startMinute / 60) * hourHeight
        const height = Math.max(((item.endMinute - item.startMinute) / 60) * hourHeight, 18)
        const widthPercent = 100 / totalColumns
        const leftPercent = column * widthPercent
        return {
          item,
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
  }, [categorized.timedByDay, timedTasksByDayRaw, isMobile])

  const modals = (
    <>
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
    </>
  )

  if (isMobile) {
    return <WeekViewMobile weekDays={weekDays} today={today} multiDayBars={multiDayBars} flatAllDayItems={flatAllDayItems} positionedItems={positionedItems} allDayRef={allDayRef} handleSlotClick={handleSlotClick} openTaskDetail={openTaskDetail} setDetailEvent={setDetailEvent} modals={modals} t={t} />
  }

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
          className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
          style={{ minHeight: allDayRowCount * 26 + 8 }}
        >
          <div
            className="text-xs text-gray-400 dark:text-gray-500 py-1 pr-2 text-right"
            style={{ gridColumn: 1, gridRow: `1 / span ${allDayRowCount}` }}
          >
            {t('allDay', { defaultValue: 'Весь день' })}
          </div>

          {multiDayBars.map(({ event, startIdx, span }, barIdx) => (
            <div
              key={`bar-${event.id}-${barIdx}`}
              className="px-0.5"
              style={{
                gridColumn: `${startIdx + 2} / ${startIdx + 2 + span}`,
                gridRow: barIdx + 1,
                height: 22,
              }}
            >
              <CalendarEventCard event={event} compact onClick={() => setDetailEvent(event)} />
            </div>
          ))}

          {flatAllDayItems.map((item) => {
            const row = multiDayBars.length + 1 + item.positionInDay
            if (item.type === 'event') {
              const e = item.data as CalendarEvent
              return (
                <div
                  key={`evt-${e.id}`}
                  className="px-0.5"
                  style={{ gridColumn: item.dayIndex + 2, gridRow: row }}
                >
                  <CalendarEventCard event={e} compact onClick={() => setDetailEvent(e)} />
                </div>
              )
            }
            const tk = item.data as CalendarTaskItem
            return (
              <div
                key={`task-${tk.id}`}
                className="px-0.5"
                style={{ gridColumn: item.dayIndex + 2, gridRow: row }}
              >
                <CalendarTaskCard task={tk} compact onClick={() => openTaskDetail(tk.id)} />
              </div>
            )
          })}
        </div>
      )}

      <div className="max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)]">
          <div>
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

          {weekDays.map((day, dayIdx) => {
            const isCurrentDay = isSameDay(day, today)
            const dayPositioned = positionedItems.get(dayIdx) || []

            return (
              <div
                key={dayIdx}
                className={`relative overflow-hidden border-r border-gray-100 dark:border-gray-800 ${
                  isCurrentDay ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''
                }`}
                style={{ height: totalGridHeight }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
                    style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => handleSlotClick(day, hour)}
                  />
                ))}

                {dayPositioned.map(({ item, style }) =>
                  item.type === 'event' ? (
                    <CalendarEventCard
                      key={item.id}
                      event={item.data as CalendarEvent}
                      showTimeRange
                      timedStyle={style}
                      showMarker
                      onClick={() => setDetailEvent(item.data as CalendarEvent)}
                    />
                  ) : (
                    <CalendarTaskCard
                      key={item.id}
                      task={item.data as CalendarTaskItem}
                      compact
                      showTimeRange
                      timedStyle={style}
                      showMarker
                      onClick={() => openTaskDetail((item.data as CalendarTaskItem).id)}
                    />
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modals}
    </div>
  )
}

interface MobileDayColProps {
  day: Date
  dayIdx: number
  isCurrentDay: boolean
  today: Date
  hourHeight: number
  handleSlotClick: (day: Date, hour: number) => void
  positionedItems: Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>
  openTaskDetail: (id: string) => void
  setDetailEvent: (e: CalendarEvent | null) => void
}

function MobileDayCol({
  day,
  dayIdx,
  isCurrentDay,
  hourHeight,
  handleSlotClick,
  positionedItems,
  openTaskDetail,
  setDetailEvent,
}: MobileDayColProps) {
  const dayPositioned = positionedItems.get(dayIdx) || []
  const totalHeight = 24 * hourHeight

  return (
    <div
      className={`relative overflow-hidden border-r border-gray-100 dark:border-gray-800 last:border-r-0 ${
        isCurrentDay ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : ''
      }`}
      style={{ height: totalHeight }}
    >
      {Array.from({ length: 24 }, (_, hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10"
          style={{ top: hour * hourHeight, height: hourHeight }}
          onClick={() => handleSlotClick(day, hour)}
        />
      ))}

      {dayPositioned.map(({ item, style }) =>
        item.type === 'event' ? (
          <CalendarEventCard
            key={item.id}
            event={item.data as CalendarEvent}
            showTimeRange
            timedStyle={style}
            showMarker
            onClick={() => setDetailEvent(item.data as CalendarEvent)}
          />
        ) : (
          <CalendarTaskCard
            key={item.id}
            task={item.data as CalendarTaskItem}
            compact
            showTimeRange
            timedStyle={style}
            showMarker
            onClick={() => openTaskDetail((item.data as CalendarTaskItem).id)}
          />
        )
      )}
    </div>
  )
}

interface WeekViewMobileProps {
  weekDays: Date[]
  today: Date
  multiDayBars: { event: CalendarEvent; startIdx: number; span: number }[]
  flatAllDayItems: {
    type: 'event' | 'task'
    data: CalendarEvent | CalendarTaskItem
    dayIndex: number
    positionInDay: number
  }[]
  positionedItems: Map<number, { item: CalendarTimedItem; style: React.CSSProperties }[]>
  allDayRef: React.RefObject<HTMLDivElement | null>
  handleSlotClick: (day: Date, hour: number) => void
  openTaskDetail: (id: string) => void
  setDetailEvent: (e: CalendarEvent | null) => void
  modals: React.ReactNode
  t: (key: string, opts?: { defaultValue?: string }) => string
}

function WeekViewMobile({
  weekDays,
  today,
  multiDayBars,
  flatAllDayItems,
  positionedItems,
  allDayRef,
  handleSlotClick,
  openTaskDetail,
  setDetailEvent,
  modals,
  t,
}: WeekViewMobileProps) {
  const [pairIndex, setPairIndex] = useState(() => getInitialMobilePair(weekDays, today))
  const hourHeight = MOBILE_HOUR_HEIGHT

  const prevWeekDays = weekDays
  if (prevWeekDays !== weekDays) {
    setPairIndex(getInitialMobilePair(weekDays, today))
  }

  const swipeLeft = () => setPairIndex((p) => Math.min(5, p + 1))
  const swipeRight = () => setPairIndex((p) => Math.max(0, p - 1))

  const swipeHandlers = useSwipe({ onSwipeLeft: swipeLeft, onSwipeRight: swipeRight })

  const visibleDayIndices = [pairIndex, pairIndex + 1]
  const visibleDays = visibleDayIndices.map((i) => weekDays[i]!)

  const visibleAllDayItems = flatAllDayItems.filter((item) =>
    visibleDayIndices.includes(item.dayIndex),
  )
  const visibleAllDayCount = visibleAllDayItems.length

  const visibleMultiDayBars = multiDayBars.filter(({ startIdx, span }) => {
    const endIdx = startIdx + span - 1
    return startIdx <= pairIndex + 1 && endIdx >= pairIndex
  })

  const mobileAllDayRowCount = visibleAllDayCount + visibleMultiDayBars.length

  const handleDayBadgeTap = (dayIdx: number) => {
    setPairIndex(Math.min(dayIdx, 5))
  }

  return (
    <div {...swipeHandlers}>
      <div className="flex gap-1 px-1 py-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {weekDays.map((day, i) => {
          const isCurrent = isSameDay(day, today)
          const isActive = visibleDayIndices.includes(i)
          return (
            <button
              key={i}
              onClick={() => handleDayBadgeTap(i)}
              className={`flex-1 min-w-0 flex flex-col items-center py-1.5 px-1 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : isCurrent
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-[10px] leading-tight">{t(`weekDays.${WEEK_DAY_KEYS[i]}`)}</span>
              <span className={`text-sm leading-tight mt-0.5 ${isActive ? 'font-bold' : ''}`}>{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      {(mobileAllDayRowCount > 0) && (
        <div
          ref={allDayRef}
          className="grid grid-cols-[2.5rem_repeat(2,1fr)] border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
          style={{ minHeight: mobileAllDayRowCount * 28 + 8 }}
        >
          <div
            className="text-[10px] text-gray-400 dark:text-gray-500 py-1 pr-1 text-right"
            style={{ gridColumn: 1, gridRow: `1 / span ${mobileAllDayRowCount}` }}
          >
            {t('allDay', { defaultValue: 'Весь день' })}
          </div>

          {visibleMultiDayBars.map(({ event, startIdx, span }, barIdx) => {
            const relStart = startIdx - pairIndex
            const clampedStart = Math.max(0, relStart)
            const clampedEnd = Math.min(relStart + span, 2)
            if (clampedEnd <= clampedStart) return null
            return (
              <div
                key={`mbar-${event.id}-${barIdx}`}
                className="px-0.5"
                style={{
                  gridColumn: `${clampedStart + 2} / ${clampedEnd + 2}`,
                  gridRow: barIdx + 1,
                  height: 24,
                }}
              >
                <CalendarEventCard event={event} compact onClick={() => setDetailEvent(event)} />
              </div>
            )
          })}

          {visibleAllDayItems.map((item) => {
            const relDayIdx = item.dayIndex - pairIndex
            const row = visibleMultiDayBars.length + 1 + item.positionInDay
            if (item.type === 'event') {
              const e = item.data as CalendarEvent
              return (
                <div
                  key={`mevt-${e.id}`}
                  className="px-0.5"
                  style={{ gridColumn: relDayIdx + 2, gridRow: row }}
                >
                  <CalendarEventCard event={e} compact onClick={() => setDetailEvent(e)} />
                </div>
              )
            }
            const tk = item.data as CalendarTaskItem
            return (
              <div
                key={`mtask-${tk.id}`}
                className="px-0.5"
                style={{ gridColumn: relDayIdx + 2, gridRow: row }}
              >
                <CalendarTaskCard task={tk} compact onClick={() => openTaskDetail(tk.id)} />
              </div>
            )
          })}
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-[2.5rem_repeat(2,1fr)]">
          <div>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                className="text-[10px] text-gray-400 dark:text-gray-500 pr-1 text-right"
                style={{ height: hourHeight }}
              >
                <span className="relative -top-2 inline-block">{pad(hour)}:00</span>
              </div>
            ))}
          </div>

          {visibleDays.map((day, colIdx) => {
            const dayIdx = pairIndex + colIdx
            const isCurrentDay = isSameDay(day, today)
            return (
              <MobileDayCol
                key={dayIdx}
                day={day}
                dayIdx={dayIdx}
                isCurrentDay={isCurrentDay}
                today={today}
                hourHeight={hourHeight}
                handleSlotClick={handleSlotClick}
                positionedItems={positionedItems}
                openTaskDetail={openTaskDetail}
                setDetailEvent={setDetailEvent}
              />
            )
          })}
        </div>
      </div>

      {modals}
    </div>
  )
}
