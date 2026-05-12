import { createPortal } from 'react-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useCalendarEvents, type CalendarEvent } from '../../hooks/useCalendarEvents'
import type { RecurrenceConfig } from '../../hooks/useTasks'
import { RecurrenceEditor } from '../RecurrenceEditor'
import { toIsoDateTime } from '../../utils/timezone'

const COLORS = [
  '#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6b7280',
]

const getTodayDate = (): string => {
  const parts = new Date().toISOString().split('T')
  return parts[0] ?? ''
}

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  all_day: z.boolean(),
  color: z.string().nullable(),
})

interface EventEditorModalProps {
  event?: CalendarEvent | null
  defaultStart?: string
  defaultEnd?: string
  onClose?: () => void
  isOpen?: boolean
}

export function EventEditorModal({ event, defaultStart, defaultEnd, onClose, isOpen = true }: EventEditorModalProps) {
  const { t } = useTranslation('calendar')
  const { addEvent, updateEvent, deleteEvent } = useCalendarEvents()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEditing = !!event

  const [localStartTime, setLocalStartTime] = useState(() => {
    if (event) return toInputDateTimeFormat(event.start_time)
    return defaultStart ? toInputDateTimeFormat(defaultStart) : ''
  })
  const [localEndTime, setLocalEndTime] = useState(() => {
    if (event && event.end_time) return toInputDateTimeFormat(event.end_time)
    return defaultEnd ? toInputDateTimeFormat(defaultEnd) : ''
  })
  const [recurrenceData, setRecurrenceData] = useState<{
    recurrence_type: string | null
    recurrence_config: RecurrenceConfig | null
    recurrence_end_date: string | null
  }>({
    recurrence_type: event?.recurrence_type ?? null,
    recurrence_config: event?.recurrence_config ?? null,
    recurrence_end_date: event?.recurrence_end_date ?? null,
  })

  const schema = useMemo(() => createSchema, [])

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
    setRecurrenceData({
      recurrence_type: event?.recurrence_type ?? null,
      recurrence_config: event?.recurrence_config ?? null,
      recurrence_end_date: event?.recurrence_end_date ?? null,
    })
  }, [event, defaultStart, reset])

  const allDay = watch('all_day')
  const selectedColor = watch('color')
  const allDayRef = useRef(allDay)

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalStartTime(e.target.value)
  }

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalEndTime(e.target.value)
  }

  useEffect(() => {
    const prevAllDay = allDayRef.current

    if (allDay && !prevAllDay) {
      if (!localStartTime && !localEndTime) {
        const today = getTodayDate()
        setLocalStartTime(today)
        setLocalEndTime(today)
      }
    } else if (!allDay && prevAllDay) {
      if (localStartTime && !localStartTime.includes('T')) {
        setLocalStartTime(localStartTime + 'T00:00')
      }
      if (localEndTime && !localEndTime.includes('T')) {
        setLocalEndTime(localEndTime + 'T23:59')
      }
    }

    allDayRef.current = allDay
  }, [allDay])

  function toInputDateFormat(value: string | null): string {
    if (!value) return ''
    if (value.includes('T')) {
      const parts = value.split('T')
      return parts[0] ?? value
    }
    return value
  }

  function toInputDateTimeFormat(value: string | null): string {
    if (!value) return ''
    if (value.includes('T')) {
      return value.slice(0, 16)
    }
    return value
  }

  const onSubmit = async (data: FormData) => {
    if (!localStartTime) {
      alert(t('enterStartDate'))
      return
    }

    const startValue = allDay 
      ? (localStartTime.split('T')[0] ?? localStartTime) 
      : localStartTime
    const endValue = allDay 
      ? (localEndTime.split('T')[0] ?? startValue) 
      : localEndTime

    const startTime = toIsoDateTime(startValue ?? null, data.all_day)
    const endTime = toIsoDateTime(endValue ?? null, data.all_day)

    if (!startTime || !endTime) {
      alert(t('enterStartDate'))
      return
    }

    const eventData = {
      title: data.title,
      description: data.description ?? null,
      start_time: startTime,
      end_time: endTime,
      all_day: data.all_day,
      color: data.color ?? null,
      recurrence_type: recurrenceData.recurrence_type,
      recurrence_config: recurrenceData.recurrence_config,
      recurrence_end_date: recurrenceData.recurrence_end_date,
    }

    if (isEditing && event) {
      await updateEvent(event.id, eventData)
    } else {
      await addEvent(eventData)
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

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('eventStart')}
              </label>
              <input
                type={allDay ? 'date' : 'datetime-local'}
                value={allDay ? (localStartTime.split('T')[0] || '') : localStartTime}
                onChange={handleStartTimeChange}
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
                value={allDay ? (localEndTime.split('T')[0] || '') : localEndTime}
                onChange={handleEndTimeChange}
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

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <RecurrenceEditor
              recurrenceType={recurrenceData.recurrence_type}
              recurrenceConfig={recurrenceData.recurrence_config}
              recurrenceEndDate={recurrenceData.recurrence_end_date}
              dueDate={localStartTime || null}
              onChange={setRecurrenceData}
            />
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
