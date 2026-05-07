import { EventEditorModal } from './calendar/EventEditorModal'
import type { CalendarEvent } from '../hooks/useCalendarEvents'

interface EventEditModalProps {
  event: CalendarEvent | null
  onClose: () => void
  isOpen: boolean
}

export function EventEditModal({ event, onClose, isOpen }: EventEditModalProps) {
  if (!isOpen) return null
  return <EventEditorModal event={event} onClose={onClose} isOpen={isOpen} />
}