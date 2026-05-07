import { createPortal } from 'react-dom'
import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'

const COLORS = [
  '#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280',
]

const getTodayDate = () => new Date().toISOString().split('T')[0]

const createSchema = (t: (key: string) => string) => z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  start_time: z.string().min(1).refine((val) => val >= getTodayDate(), {
    message: t('dateCannotBeInPast'),
  }),
  end_time: z.string().nullable().refine((val) => {
    if (!val) return true
    return val >= getTodayDate()
  }, {
    message: t('endDateCannotBeInPast'),
  }),
  all_day: z.boolean(),
  color: z.string().nullable(),
})

interface EventEditorModalProps {
  event?: CalendarEvent | null
  defaultStart?: string
  onClose?: () => void
  isOpen?: boolean
}

export function EventEditorModal({ event, defaultStart, onClose, isOpen = true }: EventEditorModalProps) {
  const { t } = useTranslation('calendar')
  const { addEvent, updateEvent, deleteEvent } = useCalendarEvents()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditing = !!event

  const schema = useMemo(() => createSchema((key) => t(key)), [t])

  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? null,
      start_time: event ? toInputDateFormat(event.start_time) : (defaultStart ?? ''),
      end_time: event?.end_time ? toInputDateFormat(event.end_time) : null,
      all_day: event?.all_day ?? false,
      color: event?.color ?? null,
    },
  })

  useEffect(() => {
    reset({
      title: event?.title ?? '',
      description: event?.description ?? null,
      start_time: event ? toInputDateFormat(event.start_time) : (defaultStart ?? ''),
      end_time: event?.end_time ? toInputDateFormat(event.end_time) : null,
      all_day: event?.all_day ?? false,
      color: event?.color ?? null,
    })
  }, [event, defaultStart, reset])

  const allDay = watch('all_day')
  const selectedColor = watch('color')

  function toInputDateFormat(value: string | null): string {
    if (!value) return ''
    if (value.includes('T')) {
      return value.split('T')[0]
    }
    return value
  }

  function toIsoDateTime(value: string | null, isAllDay: boolean): string | null {
    if (!value) return null
    if (isAllDay) {
      return value + 'T00:00:00'
    }
    if (value.includes('T')) {
      return value
    }
    return value + ':00'
  }

  const onSubmit = async (data: FormData) => {
    const startTime = toIsoDateTime(data.start_time, data.all_day)
    const endTime = toIsoDateTime(data.end_time, data.all_day)

    if (isEditing && event) {
      await updateEvent(event.id, {
        title: data.title,
        description: data.description,
        start_time: startTime,
        end_time: endTime,
        all_day: data.all_day,
        color: data.color,
      })
    } else {
      await addEvent({
        title: data.title,
        description: data.description,
        start_time: startTime,
        end_time: endTime,
        all_day: data.all_day,
        color: data.color,
      })
    }
    onClose?.()
  }

  const handleDelete = async () => {
    if (!event) return
    await deleteEvent(event.id)
    onClose?.()
  }

  if (!isOpen || !onClose) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('editEvent') : t('createEvent')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventTitle')}
            </label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('eventDescription')}
            </label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="all_day"
              {...register('all_day')}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="all_day" className="text-sm text-gray-700 dark:text-gray-300">
              {t('allDay')}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('eventStart')}
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                {...register('start_time')}
                min={allDay ? getTodayDate() : undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('eventEnd')}
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                {...register('end_time')}
                min={allDay ? getTodayDate() : undefined}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('eventColor')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {isEditing ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 dark:text-red-400">{t('confirmDelete')}</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
                  >
                    {t('delete')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    {t('cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                >
                  {t('deleteEvent')}
                </button>
              )
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {t('save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
