import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCalendarEvents, type CalendarEvent } from '../hooks/useCalendarEvents'
import { EventDetailModal } from '../components/EventDetailModal'
import { EventEditModal } from '../components/EventEditModal'

export function Events() {
  const { t } = useTranslation('calendar')
  const { events, isLoading, deleteEvent } = useCalendarEvents()
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

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

  const handleDeleteClick = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    setDeleteConfirmId(eventId)
  }

  const handleConfirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteEvent(deleteConfirmId)
      setDeleteConfirmId(null)
      setDetailEvent(null)
    }
  }

  const handleCancelDelete = () => {
    setDeleteConfirmId(null)
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
                <button
                  onClick={(e) => handleDeleteClick(e, event.id)}
                  className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title={t('deleteEvent')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('confirmDelete')}
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}