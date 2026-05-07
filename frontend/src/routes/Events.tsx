import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendarEvents, type CalendarEvent } from '../hooks/useCalendarEvents'
import { EventDetailModal } from '../components/EventDetailModal'
import { EventEditModal } from '../components/EventEditModal'

export function Events() {
  const { t } = useTranslation('calendar')
  const { events, isLoading } = useCalendarEvents()
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)

  const handleView = (event: CalendarEvent) => {
    setDetailEvent(event)
  }

  const handleEdit = (event: CalendarEvent) => {
    setDetailEvent(null)
    setEditEvent(event)
    setIsCreateMode(false)
  }

  const handleCloseDetail = () => {
    setDetailEvent(null)
  }

  const handleCloseEdit = () => {
    setEditEvent(null)
    setIsCreateMode(false)
  }

  const openCreateModal = () => {
    setEditEvent(null)
    setDetailEvent(null)
    setIsCreateMode(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('events')}
        </h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + {t('createEvent')}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {t('noEvents')}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <div
              key={event.id}
              onClick={() => handleView(event)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {event.color && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {event.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.start_time).toLocaleDateString()}
                      {event.location && ` • ${event.location}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventDetailModal
        event={detailEvent}
        isOpen={!!detailEvent}
        onClose={handleCloseDetail}
        onEdit={handleEdit}
      />

      <EventEditModal
        event={editEvent}
        onClose={handleCloseEdit}
        isOpen={editEvent !== null || isCreateMode}
      />
    </div>
  )
}