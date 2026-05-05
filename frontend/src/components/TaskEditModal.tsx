import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeTimeInput } from '../utils/time'
import { TatarKeyboardBar } from './TatarKeyboardBar'

function toLocalDateStr(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toLocalTimeStr(isoString: string | null | undefined): string | null {
  if (!isoString) return null
  const d = new Date(isoString)
  const hours = d.getHours()
  const minutes = d.getMinutes()
  const seconds = d.getSeconds()
  const ms = d.getMilliseconds()
  if (hours === 23 && minutes === 59 && seconds === 59 && ms >= 999) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function todayLocalDateStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function tomorrowLocalDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
import { createPortal } from 'react-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task, UpdateTask, GtdStatus, RecurrenceConfig } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useTags, type Tag } from '../hooks/useTags'
import { useProjects } from '../hooks/useProjects'
import { useCalendarEvents } from '../hooks/useCalendarEvents'
import { useOnlineStatus } from '../db/hooks'
import { useChecklist } from '../hooks/useChecklist'
import { RecurrenceEditor } from './RecurrenceEditor'
import { ReminderEditor } from './ReminderEditor'

function Accordion({ title, isOpen, onToggle, children }: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className={`${isOpen ? 'block' : 'hidden'} p-4 space-y-4 bg-white dark:bg-gray-800`}>
        {children}
      </div>
    </div>
  )
}

const GTD_STATUS_OPTIONS: { value: GtdStatus; labelKey: string }[] = [
  { value: 'inbox', labelKey: 'gtdInbox' },
  { value: 'active', labelKey: 'gtdActive' },
  { value: 'next', labelKey: 'gtdNext' },
  { value: 'waiting', labelKey: 'gtdWaiting' },
  { value: 'someday', labelKey: 'gtdSomeday' },
  { value: 'completed', labelKey: 'gtdCompleted' },
  { value: 'trash', labelKey: 'gtdTrash' },
]

const GTD_CHIP_COLORS: Record<GtdStatus, { base: string; ring: string }> = {
  inbox: { base: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', ring: 'ring-gray-400 dark:ring-gray-500' },
  active: { base: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', ring: 'ring-blue-400 dark:ring-blue-500' },
  next: { base: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', ring: 'ring-emerald-400 dark:ring-emerald-500' },
  waiting: { base: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ring: 'ring-amber-400 dark:ring-amber-500' },
  someday: { base: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', ring: 'ring-purple-400 dark:ring-purple-500' },
  completed: { base: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400', ring: 'ring-gray-400 dark:ring-gray-500' },
  trash: { base: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400', ring: 'ring-red-400 dark:ring-red-500' },
}

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  context_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  area_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  project_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  event_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  gtd_status: z.string().optional(),
  due_date: z.string().nullable().optional().transform(v => v === '' ? null : v),
  due_time: z.string().nullable().optional().transform(v => v === '' ? null : v),
  notes: z.string().nullable().optional(),
})

type EditTaskFormData = z.infer<typeof editTaskSchema>

interface TaskEditModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: UpdateTask) => Promise<void>
}

function TagChips({ tags, selectedTagIds, onToggle }: {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}) {
  const { t } = useTranslation('tasks')
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => {
        const isSelected = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isSelected
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            style={isSelected ? { backgroundColor: tag.color || '#6366f1' } : undefined}
          >
            {tag.name}
          </button>
        )
      })}
      {tags.length === 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t('noTags')}
        </span>
      )}
    </div>
  )
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const { t } = useTranslation('tasks')
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { tags } = useTags()
  const { projects } = useProjects()
  const { events } = useCalendarEvents()
  const isOnline = useOnlineStatus()
  const [isMobile, setIsMobile] = useState(false)
  const [accordionStates, setAccordionStates] = useState({
    tags: true,
    datesAndNotes: false,
    recurrence: false,
    subtasks: false,
    checklist: false,
  })

  const [recurrenceData, setRecurrenceData] = useState<{
    recurrence_type: string | null
    recurrence_config: RecurrenceConfig | null
    recurrence_end_date: string | null
  }>({
    recurrence_type: null,
    recurrence_config: null,
    recurrence_end_date: null,
  })
  const [reminderData, setReminderData] = useState<{
    reminder_time: string | null
    reminder_offsets: number[] | null
  }>({
    reminder_time: null,
    reminder_offsets: null,
  })
  const [isTodayDue, setIsTodayDue] = useState(false)
  const [isTomorrowDue, setIsTomorrowDue] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [isAddingChecklist, setIsAddingChecklist] = useState(false)
  const { items: checklistItems, isLoading: isLoadingChecklist, addItem, toggleItem, deleteItem, refetch: refetchChecklist } = useChecklist(task?.id ?? null)

  const defaultValues = useMemo(() => task ? {
    title: task.title,
    description: task.description,
    context_id: task.context_id ?? null,
    area_id: task.area_id ?? null,
    project_id: task.project_id ?? null,
    event_id: task.event_id ?? null,
    gtd_status: task.gtd_status,
    due_date: toLocalDateStr(task.due_date),
    due_time: toLocalTimeStr(task.due_date),
    notes: task.notes ?? null,
  } : undefined, [task])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control: formControl,
    formState: { errors },
  } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema) as unknown as never,
    values: defaultValues,
  })

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLTextAreaElement>(null)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (task && isOpen) {
      const dueDateStr = toLocalDateStr(task.due_date)
      const dueTimeStr = toLocalTimeStr(task.due_date)
      const today = todayLocalDateStr()
      const tomorrow = tomorrowLocalDateStr()

      reset({
        title: task.title,
        description: task.description,
        context_id: task.context_id ?? null,
        area_id: task.area_id ?? null,
        project_id: task.project_id ?? null,
        gtd_status: task.gtd_status,
        due_date: dueDateStr,
        due_time: dueTimeStr,
        notes: task.notes ?? null,
      })
      setSelectedTagIds(task.tags.map((t: Tag) => t.id))
      setRecurrenceData({
        recurrence_type: task.recurrence_type,
        recurrence_config: task.recurrence_config,
        recurrence_end_date: task.recurrence_end_date,
      })
      setReminderData({
        reminder_time: task.reminder_time ? task.reminder_time.slice(0, 5) : null,
        reminder_offsets: task.reminder_offsets,
      })
      setIsTodayDue(dueDateStr === today)
      setIsTomorrowDue(dueDateStr === tomorrow)
    }
  }, [task, isOpen])

  useEffect(() => {
    if (task && isOpen) {
      const dueDateStr = toLocalDateStr(task.due_date)
      const dueTimeStr = toLocalTimeStr(task.due_date)
      const today = todayLocalDateStr()
      const tomorrow = tomorrowLocalDateStr()

      reset({
        title: task.title,
        description: task.description,
        context_id: task.context_id ?? null,
        area_id: task.area_id ?? null,
        project_id: task.project_id ?? null,
        gtd_status: task.gtd_status,
        due_date: dueDateStr,
        due_time: dueTimeStr,
        notes: task.notes ?? null,
      })
      setSelectedTagIds(task.tags.map((t: Tag) => t.id))
      setRecurrenceData({
        recurrence_type: task.recurrence_type,
        recurrence_config: task.recurrence_config,
        recurrence_end_date: task.recurrence_end_date,
      })
      setReminderData({
        reminder_time: task.reminder_time ? task.reminder_time.slice(0, 5) : null,
        reminder_offsets: task.reminder_offsets,
      })
      setIsTodayDue(dueDateStr === today)
      setIsTomorrowDue(dueDateStr === tomorrow)
      setNewChecklistTitle('')
    }
  }, [task])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerHeight < 600)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleAccordion = (key: keyof typeof accordionStates) => {
    setAccordionStates(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleTodayToggle = (checked: boolean) => {
    setIsTodayDue(checked)
    if (checked) {
      setIsTomorrowDue(false)
      const today = todayLocalDateStr()
      reset(prev => ({ ...prev, due_date: today }))
    }
  }

  const handleTomorrowToggle = (checked: boolean) => {
    setIsTomorrowDue(checked)
    if (checked) {
      setIsTodayDue(false)
      const tomorrow = tomorrowLocalDateStr()
      reset(prev => ({ ...prev, due_date: tomorrow }))
    }
  }

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    const today = todayLocalDateStr()
    const tomorrow = tomorrowLocalDateStr()
    setIsTodayDue(newDate === today)
    setIsTomorrowDue(newDate === tomorrow)
    if (!newDate && recurrenceData.recurrence_type) {
      setRecurrenceData({
        recurrence_type: null,
        recurrence_config: null,
        recurrence_end_date: null,
      })
    }
  }

  const handleReminderChange = (data: {
    reminder_time: string | null
    reminder_offsets: number[] | null
  }) => {
    setReminderData(data)
    const currentDueDate = watch('due_date')
    const hasReminder = !!data.reminder_time || !!data.reminder_offsets?.length
    if (hasReminder && !currentDueDate) {
      const today = todayLocalDateStr()
      reset(prev => ({ ...prev, due_date: today }))
      setIsTodayDue(true)
    }
  }

  const handleAddChecklist = async () => {
    const trimmed = newChecklistTitle.trim()
    if (!trimmed || !task) return
    setIsAddingChecklist(true)
    try {
      await addItem(trimmed)
      setNewChecklistTitle('')
    } catch {}
    setIsAddingChecklist(false)
  }

  const handleChecklistKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddChecklist()
    }
  }

  const onSubmit = async (data: EditTaskFormData) => {
    if (!task) return
    let gtdStatus = data.gtd_status as GtdStatus | undefined
    let dueDateValue = data.due_date

    if (dueDateValue && data.due_time) {
      const [year = 0, month = 1, day = 1] = dueDateValue.split('-').map(Number)
      const [hours = 0, minutes = 0] = data.due_time.split(':').map(Number)
      const dt = new Date(year, month - 1, day, hours, minutes, 0, 0)
      dueDateValue = dt.toISOString()
    } else if (dueDateValue) {
      const [year = 0, month = 1, day = 1] = dueDateValue.split('-').map(Number)
      const dt = new Date(year, month - 1, day, 23, 59, 59, 999)
      dueDateValue = dt.toISOString()
    }

    if (dueDateValue && task.gtd_status === 'inbox' && (!gtdStatus || gtdStatus === 'inbox')) {
      gtdStatus = 'active'
    }
    const updateData: Record<string, unknown> = {
      title: data.title,
      description: data.description,
      gtd_status: gtdStatus,
      context_id: data.context_id,
      area_id: data.area_id,
      project_id: data.project_id,
      event_id: data.event_id,
      due_date: dueDateValue,
      notes: data.notes,
      tag_ids: selectedTagIds,
      recurrence_type: recurrenceData.recurrence_type,
      recurrence_config: recurrenceData.recurrence_config,
      recurrence_end_date: recurrenceData.recurrence_end_date,
      reminder_time: reminderData.reminder_time,
      reminder_offsets: reminderData.reminder_offsets,
    }
    if (gtdStatus === 'completed') {
      updateData.completed = true
    } else if ((task.gtd_status as string) === 'completed') {
      updateData.completed = false
    }
    await onSave(task.id, updateData as Parameters<typeof onSave>[1])
    onClose()
  }

  if (!isOpen || !task) return null

  const checklistAccordionTitle = checklistItems.length > 0
    ? t('checklistCount', { completed: checklistItems.filter(i => i.is_completed).length, total: checklistItems.length })
    : t('checklist')

  const deadlineRecurrenceTitle = t('deadlineRecurrenceReminders')
    + (recurrenceData.recurrence_type ? ' \u{1F504}' : '')
    + ((reminderData.reminder_time || reminderData.reminder_offsets?.length) && !task?.reminder_fired ? ' \u{1F514}' : '')

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] animate-fade-in ${isMobile ? 'flex items-end' : 'flex items-center justify-center'} bg-black/75 dark:bg-black/90`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`animate-scale-in bg-white dark:bg-gray-800 shadow-2xl mx-4 border-4 border-indigo-500 dark:border-indigo-400 ${
          isMobile
            ? 'w-full max-w-none rounded-t-lg border-b-0 max-h-[95vh] flex flex-col'
            : 'max-w-lg w-full rounded-lg p-4 max-h-[90vh] flex flex-col'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {t('editTask')}
            {task.is_recurring && <span title={t('recurringTask')}>&#x1F504;</span>}
            {(task.reminder_time || task.reminder_offsets?.length) && !task.reminder_fired && <span title={t('hasReminder')}>&#x1F514;</span>}
            {!isOnline && <span className="text-amber-500 text-sm" title={t('offlineMode')}>&#128268; Offline</span>}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit as never)} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taskTitle')}
              </label>
              <Controller
                name="title"
                control={formControl}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    id="title"
                    ref={(e) => {
                      field.ref(e)
                      titleInputRef.current = e
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder={t('taskTitle')}
                    value={field.value ?? ''}
                  />
                )}
              />
              <TatarKeyboardBar
                inputRef={titleInputRef}
                value={watch('title') ?? ''}
                onChange={(v) => setValue('title', v, { shouldDirty: true })}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('taskDescription')}
              </label>
              <Controller
                name="description"
                control={formControl}
                defaultValue={task?.description ?? ''}
                render={({ field }) => (
                  <textarea
                    {...field}
                    value={field.value ?? ''}
                    id="description"
                    rows={3}
                    ref={(e) => {
                      field.ref(e)
                      descInputRef.current = e
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder={t('taskDescription')}
                  />
                )}
              />
              <TatarKeyboardBar
                inputRef={descInputRef}
                value={watch('description') || ''}
                onChange={(v) => setValue('description', v, { shouldDirty: true })}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
              )}
            </div>

            <Accordion
              title={checklistAccordionTitle}
              isOpen={accordionStates.checklist}
              onToggle={() => toggleAccordion('checklist')}
            >
              {isLoadingChecklist && checklistItems.length === 0 && (
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
              )}
              {checklistItems.length > 0 && (
                <div className="space-y-1 mb-3">
                  {checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => {
                          toggleItem(item.id)
                          setTimeout(refetchChecklist, 300)
                        }}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span
                        className={`text-sm flex-1 ${item.is_completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        {item.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteItem(item.id)
                          setTimeout(refetchChecklist, 300)
                        }}
                        className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  onKeyDown={handleChecklistKeyDown}
                  placeholder={t('newChecklistItem')}
                  disabled={isAddingChecklist}
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddChecklist}
                  disabled={isAddingChecklist || !newChecklistTitle.trim()}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </Accordion>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('gtdStatus')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GTD_STATUS_OPTIONS.map((opt) => {
                  const isSelected = watch('gtd_status') === opt.value
                  const colorClasses = GTD_CHIP_COLORS[opt.value]
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('gtd_status', opt.value, { shouldDirty: true })}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all ${colorClasses.base} ${isSelected ? `ring-2 ring-offset-1 ${colorClasses.ring}` : 'opacity-70 hover:opacity-100'}`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label htmlFor="area_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('area')}
              </label>
              <select
                {...register('area_id')}
                id="area_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">{t('noArea')}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('project')}
              </label>
              <select
                {...register('project_id')}
                id="project_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">{t('noProject')}</option>
                {projects.filter((p) => p.is_active).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('event')}
              </label>
              <select
                {...register('event_id')}
                id="event_id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              >
                <option value="">{t('noEvent')}</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Accordion
            title={deadlineRecurrenceTitle}
            isOpen={accordionStates.recurrence}
            onToggle={() => toggleAccordion('recurrence')}
          >
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('deadline')}
              </label>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={isTodayDue}
                  onChange={(e) => handleTodayToggle(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('today')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={isTomorrowDue}
                  onChange={(e) => handleTomorrowToggle(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{t('tomorrow')}</span>
              </label>
              <input
                {...register('due_date', {
                  onChange: handleDueDateChange
                })}
                type="date"
                id="due_date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
              />
              {watch('due_date') && (
                <div className="mt-2">
                  <label htmlFor="due_time" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {t('deadlineTime')}
                  </label>
                  <input
                    {...register('due_time', {
                      onBlur: (e) => {
                        const normalized = normalizeTimeInput(e.target.value)
                        setValue('due_time', normalized || null)
                      }
                    })}
                    type="text"
                    id="due_time"
                    placeholder="HH:MM"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <ReminderEditor
                reminderTime={reminderData.reminder_time}
                reminderOffsets={reminderData.reminder_offsets}
                reminderFired={task?.reminder_fired ?? false}
                dueDate={watch('due_date') ?? null}
                onChange={handleReminderChange}
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <RecurrenceEditor
                recurrenceType={recurrenceData.recurrence_type}
                recurrenceConfig={recurrenceData.recurrence_config}
                recurrenceEndDate={recurrenceData.recurrence_end_date}
                dueDate={watch('due_date') ?? null}
                onChange={setRecurrenceData}
              />
            </div>
          </Accordion>

          <Accordion
            title={t('tags')}
            isOpen={accordionStates.tags}
            onToggle={() => toggleAccordion('tags')}
          >
            <TagChips
              tags={tags}
              selectedTagIds={selectedTagIds}
              onToggle={handleTagToggle}
            />
          </Accordion>

          <div>
            <label htmlFor="context_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('context')}
            </label>
            <select
              {...register('context_id')}
              id="context_id"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
            >
              <option value="">{t('noContext')}</option>
              {contexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>
                  {ctx.name}
                </option>
              ))}
            </select>
          </div>

          <Accordion
            title={t('notes')}
            isOpen={accordionStates.datesAndNotes}
            onToggle={() => toggleAccordion('datesAndNotes')}
          >
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('notes')}
              </label>
              <Controller
                name="notes"
                control={formControl}
                defaultValue={task?.notes ?? ''}
                render={({ field }) => (
                  <textarea
                    {...field}
                    value={field.value ?? ''}
                    id="notes"
                    rows={3}
                    ref={(e) => {
                      field.ref(e)
                      notesInputRef.current = e
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder={t('notesOptional')}
                  />
                )}
              />
              <TatarKeyboardBar
                inputRef={notesInputRef}
                value={watch('notes') || ''}
                onChange={(v) => setValue('notes', v, { shouldDirty: true })}
              />
            </div>
          </Accordion>
        </form>

        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            {t('cancel', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(onSubmit as never)()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            {t('save', { ns: 'common' })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
