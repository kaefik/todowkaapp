import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Task, UpdateTask, GtdStatus, RecurrenceConfig } from '../hooks/useTasks'
import { useTasks } from '../hooks/useTasks'
import { useContexts } from '../hooks/useContexts'
import { useAreas } from '../hooks/useAreas'
import { useTags, type Tag } from '../hooks/useTags'
import { useProjects } from '../hooks/useProjects'
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

const GTD_STATUS_OPTIONS: { value: GtdStatus; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'next', label: 'Next Action' },
  { value: 'waiting', label: 'Waiting For' },
  { value: 'someday', label: 'Someday / Maybe' },
  { value: 'completed', label: 'Completed' },
  { value: 'trash', label: 'Trash' },
]

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().nullable().optional(),
  context_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  area_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  project_id: z.string().nullable().optional().transform(v => v === '' ? null : v),
  gtd_status: z.string().optional(),
  due_date: z.string().nullable().optional().transform(v => v === '' ? null : v),
  notes: z.string().nullable().optional(),
})

type EditTaskFormData = z.infer<typeof editTaskSchema>

interface TaskEditModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: UpdateTask) => void
}

function TagChips({ tags, selectedTagIds, onToggle }: {
  tags: Tag[]
  selectedTagIds: string[]
  onToggle: (tagId: string) => void
}) {
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
          Нет тегов. Создайте их на странице «Теги».
        </span>
      )}
    </div>
  )
}

export function TaskEditModal({ task, isOpen, onClose, onSave }: TaskEditModalProps) {
  const { fetchTask } = useTasks()
  const { contexts } = useContexts()
  const { areas } = useAreas()
  const { tags } = useTags()
  const { projects } = useProjects()
  const [currentTask, setCurrentTask] = useState<Task | null>(task)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
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
  const [accordionStates, setAccordionStates] = useState({
    tags: true,
    categorization: false,
    datesAndNotes: false,
    recurrence: false,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskSchema),
  })

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

  useEffect(() => {
    if (isOpen && task) {
      setLoading(true)
      setFetchError(null)
      fetchTask(task.id)
        .then((data) => {
          setCurrentTask(data)
          setSelectedTagIds(data.tags.map((t: Tag) => t.id))
          setLoading(false)
        })
        .catch((err) => {
          setFetchError(err.message || 'Failed to load task')
          setCurrentTask(task)
          setLoading(false)
        })
    }
  }, [isOpen, task, fetchTask])

  useEffect(() => {
    if (currentTask) {
      const dueDateStr = currentTask.due_date ? currentTask.due_date.slice(0, 10) : null
      const today = new Date().toISOString().slice(0, 10)
      const isToday = dueDateStr === today

      reset({
        title: currentTask.title,
        description: currentTask.description,
        context_id: currentTask.context_id ?? null,
        area_id: (currentTask as Record<string, unknown>).area_id as string | null ?? null,
        project_id: (currentTask as Record<string, unknown>).project_id as string | null ?? null,
        gtd_status: currentTask.gtd_status,
        due_date: dueDateStr,
        notes: currentTask.notes ?? null,
      })
      setRecurrenceData({
        recurrence_type: currentTask.recurrence_type,
        recurrence_config: currentTask.recurrence_config,
        recurrence_end_date: currentTask.recurrence_end_date,
      })
      setReminderData({
        reminder_time: currentTask.reminder_time ? currentTask.reminder_time.slice(0, 5) : null,
        reminder_offsets: currentTask.reminder_offsets,
      })
      setIsTodayDue(isToday)
    }
  }, [currentTask, reset])

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    )
  }

  const handleTodayToggle = (checked: boolean) => {
    setIsTodayDue(checked)
    if (checked) {
      const today = new Date().toISOString().slice(0, 10)
      reset(prev => ({ ...prev, due_date: today }))
    }
  }

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    const today = new Date().toISOString().slice(0, 10)
    setIsTodayDue(newDate === today)
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
      const today = new Date().toISOString().slice(0, 10)
      reset(prev => ({ ...prev, due_date: today }))
      setIsTodayDue(true)
    }
  }

  const onSubmit = (data: EditTaskFormData) => {
    if (!currentTask) return
    onSave(currentTask.id, {
      ...data,
      tag_ids: selectedTagIds,
      recurrence_type: recurrenceData.recurrence_type,
      recurrence_config: recurrenceData.recurrence_config,
      recurrence_end_date: recurrenceData.recurrence_end_date,
      reminder_time: reminderData.reminder_time,
      reminder_offsets: reminderData.reminder_offsets,
    })
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] ${isMobile ? 'flex items-end' : 'flex items-center justify-center'} bg-black/75 dark:bg-black/90`}
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 shadow-2xl mx-4 border-4 border-indigo-500 dark:border-indigo-400 ${
          isMobile
            ? 'w-full max-w-none rounded-t-lg border-b-0 max-h-[95vh] flex flex-col'
            : 'max-w-lg w-full rounded-lg p-4 max-h-[90vh] flex flex-col'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Edit Task
            {currentTask?.is_recurring && <span title="Повторяющаяся задача">&#x1F504;</span>}
            {(currentTask?.reminder_time || currentTask?.reminder_offsets?.length) && <span title="Есть напоминание">&#x1F514;</span>}
          </h2>
        </div>

        {fetchError && (
          <div className="flex-shrink-0 mx-4 mt-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{fetchError}</p>
          </div>
        )}

        {loading ? (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    id="title"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder="Task title"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder="Task description (optional)"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                  )}
                </div>
              </div>

              <Accordion
                title="Теги"
                isOpen={accordionStates.tags}
                onToggle={() => toggleAccordion('tags')}
              >
                <TagChips
                  tags={tags}
                  selectedTagIds={selectedTagIds}
                  onToggle={handleTagToggle}
                />
              </Accordion>

              <Accordion
                title="Категоризация"
                isOpen={accordionStates.categorization}
                onToggle={() => toggleAccordion('categorization')}
              >
                <div>
                  <label htmlFor="context_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Контекст
                  </label>
                  <select
                    {...register('context_id')}
                    id="context_id"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  >
                    <option value="">Без контекста</option>
                    {contexts.map((ctx) => (
                      <option key={ctx.id} value={ctx.id}>
                        {ctx.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="area_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Область
                  </label>
                  <select
                    {...register('area_id')}
                    id="area_id"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  >
                    <option value="">Без области</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Проект
                  </label>
                  <select
                    {...register('project_id')}
                    id="project_id"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  >
                    <option value="">Без проекта</option>
                    {projects.filter((p) => p.is_active).map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="gtd_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GTD-статус
                  </label>
                  <select
                    {...register('gtd_status')}
                    id="gtd_status"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  >
                    {GTD_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Accordion>

              <Accordion
                title={`Дедлайн, повторение и напоминания${recurrenceData.recurrence_type ? ' \u{1F504}' : ''}${reminderData.reminder_time || reminderData.reminder_offsets?.length ? ' \u{1F514}' : ''}`}
                isOpen={accordionStates.recurrence}
                onToggle={() => toggleAccordion('recurrence')}
              >
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дедлайн
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={isTodayDue}
                      onChange={(e) => handleTodayToggle(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 dark:text-indigo-400 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:focus:ring-indigo-400 bg-white dark:bg-gray-700"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Сегодня</span>
                  </label>
                  <input
                    {...register('due_date', {
                      onChange: handleDueDateChange
                    })}
                    type="date"
                    id="due_date"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <ReminderEditor
                    reminderTime={reminderData.reminder_time}
                    reminderOffsets={reminderData.reminder_offsets}
                    onChange={handleReminderChange}
                  />
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <RecurrenceEditor
                    recurrenceType={recurrenceData.recurrence_type}
                    recurrenceConfig={recurrenceData.recurrence_config}
                    recurrenceEndDate={recurrenceData.recurrence_end_date}
                    dueDate={watch('due_date')}
                    onChange={setRecurrenceData}
                  />
                </div>
              </Accordion>

              <Accordion
                title="Заметки"
                isOpen={accordionStates.datesAndNotes}
                onToggle={() => toggleAccordion('datesAndNotes')}
              >
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Заметки
                  </label>
                  <textarea
                    {...register('notes')}
                    id="notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400"
                    placeholder="Заметки к задаче (optional)"
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
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit(onSubmit)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
