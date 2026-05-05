import { v4 as uuidv4 } from 'uuid'
import { db, activeTable } from '../db/database'
import { useDexieQuery } from '../db/hooks'
import { useAuthStore } from '../stores/authStore'

export interface CalendarEvent {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  all_day: boolean
  color: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface CreateCalendarEvent {
  title: string
  description?: string | null
  start_time: string
  end_time?: string | null
  all_day?: boolean
  color?: string | null
}

export interface UpdateCalendarEvent {
  title?: string
  description?: string | null
  start_time?: string
  end_time?: string | null
  all_day?: boolean
  color?: string | null
}

export function useCalendarEvents() {
  const user = useAuthStore(s => s.user)

  const { data: events = [], isLoading } = useDexieQuery(
    async () => {
      if (!user) return []
      const records = await activeTable(db.calendarEvents, user.id).toArray()
      return records.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.startTime,
        end_time: e.endTime,
        all_day: e.allDay,
        color: e.color,
        user_id: e.userId,
        created_at: e.createdAt,
        updated_at: e.updatedAt,
      })) as CalendarEvent[]
    },
    [user?.id]
  )

  const addEvent = async (data: CreateCalendarEvent) => {
    if (!user) return
    const id = uuidv4()
    const now = new Date().toISOString()
    await db.calendarEvents.add({
      id,
      userId: user.id,
      title: data.title,
      description: data.description ?? null,
      startTime: data.start_time,
      endTime: data.end_time ?? null,
      allDay: data.all_day ?? false,
      color: data.color ?? null,
      createdAt: now,
      updatedAt: now,
      _syncStatus: 'local',
      _lastSyncedAt: null,
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'calendarEvent',
      entityId: id,
      action: 'create',
      payload: JSON.stringify({ ...data, id }),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const updateEvent = async (id: string, data: UpdateCalendarEvent) => {
    if (!user) return
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'modified' as const }
    if (data.title !== undefined) updates.title = data.title
    if (data.description !== undefined) updates.description = data.description
    if (data.start_time !== undefined) updates.startTime = data.start_time
    if (data.end_time !== undefined) updates.endTime = data.end_time
    if (data.all_day !== undefined) updates.allDay = data.all_day
    if (data.color !== undefined) updates.color = data.color
    await db.calendarEvents.update(id, updates)
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'calendarEvent',
      entityId: id,
      action: 'update',
      payload: JSON.stringify(data),
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  const deleteEvent = async (id: string) => {
    if (!user) return
    await db.calendarEvents.update(id, {
      _syncStatus: 'deleted',
      updatedAt: new Date().toISOString(),
    })
    await db.mutations.add({
      id: uuidv4(),
      entityType: 'calendarEvent',
      entityId: id,
      action: 'delete',
      payload: null,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
    })
  }

  return { events, isLoading, addEvent, updateEvent, deleteEvent }
}
