import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { EventEditorModal } from './calendar/EventEditorModal'

interface EventEditModalProps {
  eventId: string | null
  onClose: () => void
}

export function EventEditModal({ eventId, onClose }: EventEditModalProps) {
  const { events } = useCalendarEvents()
  const event = eventId ? events.find(e => e.id === eventId) ?? null : null

  return <EventEditorModal event={event} onClose={onClose} />
}