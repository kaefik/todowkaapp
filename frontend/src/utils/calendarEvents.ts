export type EventCategory = 'all-day-single' | 'all-day-multi' | 'timed-single' | 'timed-multi'

export interface CalendarTimedItem {
  id: string
  type: 'event' | 'task'
  startMinute: number
  endMinute: number
  data: Record<string, unknown>
}

const TASK_DEFAULT_DURATION = 30

export function toTimedItems(
  events: { id: string; start_time: string; end_time: string | null; all_day: boolean }[],
  tasks: { id: string; start_time: string; all_day: boolean }[],
): CalendarTimedItem[] {
  const items: CalendarTimedItem[] = []

  for (const e of events) {
    if (e.all_day) continue
    const start = new Date(e.start_time)
    const startMinute = start.getHours() * 60 + start.getMinutes()
    const end = e.end_time ? new Date(e.end_time) : null
    const durationMin = end ? Math.max(15, (end.getTime() - start.getTime()) / (1000 * 60)) : 60
    items.push({
      id: `event-${e.id}`,
      type: 'event',
      startMinute,
      endMinute: startMinute + durationMin,
      data: e as unknown as Record<string, unknown>,
    })
  }

  for (const t of tasks) {
    if (t.all_day) continue
    const start = new Date(t.start_time)
    const startMinute = start.getHours() * 60 + start.getMinutes()
    items.push({
      id: `task-${t.id}`,
      type: 'task',
      startMinute,
      endMinute: startMinute + TASK_DEFAULT_DURATION,
      data: t as unknown as Record<string, unknown>,
    })
  }

  return items
}

export interface CalendarEventLike {
  start_time: string
  end_time: string | null
  all_day: boolean
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isMultiDay(event: CalendarEventLike): boolean {
  if (event.all_day) {
    if (!event.end_time) return false
    const start = new Date(event.start_time)
    start.setHours(0, 0, 0, 0)
    const end = new Date(event.end_time)
    end.setHours(0, 0, 0, 0)
    return end.getTime() > start.getTime()
  }
  if (!event.end_time) return false
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  return endDay.getTime() > startDay.getTime()
}

export function getEventCategory(event: CalendarEventLike): EventCategory {
  if (event.all_day) {
    return isMultiDay(event) ? 'all-day-multi' : 'all-day-single'
  }
  if (isMultiDay(event)) return 'timed-multi'
  return 'timed-single'
}

export function getDurationMinutes(event: CalendarEventLike): number {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : null
  if (!end) return 60
  const diff = end.getTime() - start.getTime()
  return Math.max(15, diff / (1000 * 60))
}

export function getEventDays(event: CalendarEventLike): Date[] {
  const start = new Date(event.start_time)
  const end = event.end_time ? new Date(event.end_time) : start

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  if (event.all_day && event.end_time) {
    endDay.setDate(endDay.getDate() - 1)
  }

  const days: Date[] = []
  const current = new Date(startDay)
  while (current.getTime() <= endDay.getTime()) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function eventOverlapsDay(event: CalendarEventLike, day: Date): boolean {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)

  const eventStart = new Date(event.start_time)
  const eventEnd = event.end_time ? new Date(event.end_time) : new Date(event.start_time)

  return eventStart.getTime() <= dayEnd.getTime() && eventEnd.getTime() >= dayStart.getTime()
}

export function formatTimeRange(start: string, end: string | null): string {
  const s = new Date(start)
  const startStr = s.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (!end) return startStr
  const e = new Date(end)
  const endStr = e.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${startStr} — ${endStr}`
}

export function getOverlappingGroups<T extends { startMinute: number; endMinute: number }>(
  items: T[],
): { item: T; column: number; totalColumns: number }[] {
  const sorted = [...items].sort((a, b) => a.startMinute - b.startMinute)
  const result: { item: T; column: number; totalColumns: number }[] = []

  const activeGroups: { items: { item: T; column: number }[]; maxEnd: number }[] = []

  for (const item of sorted) {
    for (const group of activeGroups) {
      if (item.startMinute >= group.maxEnd) {
        for (const entry of group.items) {
          result.push({ ...entry, totalColumns: group.items.length })
        }
        activeGroups.splice(activeGroups.indexOf(group), 1)
      }
    }

    let placed = false
    for (const group of activeGroups) {
      const usedColumns = new Set(group.items.map((i) => i.column))
      let col = 0
      while (usedColumns.has(col)) col++
      const overlaps = group.items.some(
        (i) => item.startMinute < i.item.endMinute && item.endMinute > i.item.startMinute,
      )
      if (overlaps) {
        group.items.push({ item, column: col })
        group.maxEnd = Math.max(group.maxEnd, item.endMinute)
        placed = true
        break
      }
    }

    if (!placed) {
      activeGroups.push({
        items: [{ item, column: 0 }],
        maxEnd: item.endMinute,
      })
    }
  }

  for (const group of activeGroups) {
    for (const entry of group.items) {
      result.push({ ...entry, totalColumns: group.items.length })
    }
  }

  return result
}

const pad = (n: number) => String(n).padStart(2, '0')
export { pad }
