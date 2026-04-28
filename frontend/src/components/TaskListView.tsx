import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Task, UpdateTask, GtdStatus } from '../hooks/useTasks'
import { useRecurrences } from '../hooks/useRecurrences'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useVerbTemplates, type VerbTemplate } from '../hooks/useVerbTemplates'
import { useToastStore } from '../stores/toastStore'
import { useAuthStore } from '../stores/authStore'
import { TaskEditModal } from './TaskEditModal'
import { TaskDetailModal } from './TaskDetailModal'
import { HighlightText } from './TaskFilterPanel'
import { VerbChips } from './VerbChips'
import { VerbFab } from './VerbFab'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { groupTasks } from '../utils/groupTasks'
import { TaskGroupSection } from './TaskGroupSection'

const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be at most 255 characters'),
  description: z.string().nullable().optional(),
})

type TaskCreateFormData = z.infer<typeof taskCreateSchema>

const DEFAULT_MOVE_TARGETS: { status: GtdStatus; label: string }[] = []

const GTD_STATUS_CONFIG: Record<GtdStatus, { labelKey: string; bg: string; text: string }> = {
  inbox: { labelKey: 'gtdInbox', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
  active: { labelKey: 'gtdActive', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
  next: { labelKey: 'gtdNext', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  waiting: { labelKey: 'gtdWaiting', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300' },
  someday: { labelKey: 'gtdSomeday', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  completed: { labelKey: 'gtdCompleted', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500 dark:text-gray-400' },
  trash: { labelKey: 'gtdTrash', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400' },
}

export interface TaskListViewProps {
  tasks: Task[]
  isLoading: boolean
  error: string | null
  searchQuery?: string
  onAddTask: (data: { title: string; description?: string }) => Promise<void>
  showAddForm?: boolean
  defaultGtdStatus?: GtdStatus
  defaultProjectId?: string
  defaultAreaId?: string
  onToggleTask: (id: string) => void
  onDeleteTask: (id: string) => Promise<void>
  onMoveTask: (id: string, status: GtdStatus) => Promise<void>
  onSaveTask: (id: string, data: UpdateTask) => Promise<void>
  onRefetch: () => void
  hideMoveButtons?: boolean
  moveTargets?: { status: GtdStatus; label: string }[]
  onRestoreTask?: (id: string) => void
  emptyMessage?: string
  autoFocus?: boolean
  showGtdStatus?: boolean
  groupBy?: import('../hooks/useTasks').GroupBy
}

function formatShortDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

interface DueDateResult {
  text: string
  overdue: boolean
  date?: string
  count?: number
  isPlain?: boolean
  time?: string
}

function formatDueDate(dueDate: string | null, locale: string): DueDateResult {
  if (!dueDate) return { text: 'noDueDate', overdue: false }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDate)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const diffMs = dueDay.getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const shortDate = formatShortDate(due, locale)

  const hours = due.getHours()
  const minutes = due.getMinutes()
  const seconds = due.getSeconds()
  const ms = due.getMilliseconds()
  const hasTime = !(hours === 23 && minutes === 59 && seconds === 59 && ms >= 999)
  const timeStr = hasTime ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}` : undefined

  if (diffDays === 0) return { text: 'todayDate', overdue: false, date: shortDate, time: timeStr }
  if (diffDays === 1) return { text: 'tomorrowDate', overdue: false, date: shortDate, time: timeStr }
  if (diffDays === -1) return { text: 'yesterdayDate', overdue: true, date: shortDate, time: timeStr }
  if (diffDays < -1) return { text: 'overdueDays', overdue: true, date: shortDate, count: Math.abs(diffDays), time: timeStr }
  if (diffDays <= 7) return { text: 'inDays', overdue: false, date: shortDate, count: diffDays, time: timeStr }
  return { text: shortDate, overdue: false, isPlain: true, time: timeStr }
}

function TaskIcons({ task, onHistoryClick }: { task: Task; onHistoryClick: () => void }) {
  const { t } = useTranslation('tasks')
  return (
    <span className="inline-flex items-center gap-1 ml-2 flex-shrink-0">
      {task.is_recurring && (
        <button
          type="button"
          onClick={onHistoryClick}
          className="text-sm hover:opacity-70 focus:outline-none"
          title={t('recurringTask')}
        >
          &#x1F504;
        </button>
      )}
      {(task.reminder_time || (task.reminder_offsets && task.reminder_offsets.length > 0)) && !task.reminder_fired && (
        <span className="text-sm" title={t('hasReminder')}>&#x1F514;</span>
      )}
    </span>
  )
}

function RecurrenceHistoryPopup({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t } = useTranslation('tasks')
  const { recurrences, isLoading, error, fetchRecurrences, stopRecurrence } = useRecurrences()
  const { i18n } = useTranslation()
  const [stopping, setStopping] = useState(false)

  useEffect(() => {
    fetchRecurrences(taskId)
  }, [taskId, fetchRecurrences])

  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'

  const handleStop = async () => {
    setStopping(true)
    try {
      await stopRecurrence(taskId)
      onClose()
    } catch {
    }
    setStopping(false)
  }

  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('recurrenceHistory')}</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs focus:outline-none">
          &#x2715;
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-400">{t('loading', { ns: 'common' })}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!isLoading && !error && recurrences.length === 0 && (
        <p className="text-xs text-gray-400">{t('noRecurrences')}</p>
      )}
      {!isLoading && recurrences.length > 0 && (
        <ul className="space-y-1 max-h-40 overflow-y-auto">
          {recurrences.map((r) => (
            <li key={r.id} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between">
              <span>{r.due_date_of_generated_task ? new Date(r.due_date_of_generated_task).toLocaleDateString(locale) : '—'}</span>
              <span className="text-gray-400">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleStop}
        disabled={stopping}
        className="mt-2 w-full text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium focus:outline-none disabled:opacity-50"
      >
        {stopping ? t('loading', { ns: 'common' }) : t('stopRecurrence')}
      </button>
    </div>
  )
}

export function TaskListView({
  tasks,
  isLoading,
  error,
  searchQuery,
  onAddTask,
  showAddForm = true,
  onToggleTask,
  onDeleteTask,
  onMoveTask,
  onSaveTask,
  onRefetch,
  hideMoveButtons = false,
  moveTargets,
  onRestoreTask,
  emptyMessage,
  autoFocus = false,
  showGtdStatus = false,
  groupBy,
}: TaskListViewProps) {
  const { t, i18n } = useTranslation('tasks')
  const locale = i18n.language === 'ru' ? 'ru-RU' : 'en-US'
  const inputRef = useRef<HTMLInputElement>(null)
  const initialFocusDone = useRef(false)
  const [showDescription, setShowDescription] = useLocalStorage(
    'ui-tasklist-show-description',
    false
  )
  const [isAdding, setIsAdding] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null)
  const [historyTaskId, setHistoryTaskId] = useState<string | null>(null)
  const { templates, ensureDefaults, addVerb } = useVerbTemplates()
  const [activeVerb, setActiveVerb] = useState<VerbTemplate | null>(null)
  const [inputFocused, setInputFocused] = useState(false)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [mobileInputVisible, setMobileInputVisible] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskCreateFormData>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: { title: '', description: '' },
  })

  const titleField = register('title')

  useEffect(() => {
    ensureDefaults()
  }, [ensureDefaults])

  useEffect(() => {
    if (autoFocus && !isLoading && !initialFocusDone.current) {
      initialFocusDone.current = true
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
    return undefined
  }, [isLoading, autoFocus])

  const handleVerbSelect = (verb: VerbTemplate | null) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setInputFocused(true)
    setActiveVerb(verb)
    if (window.innerWidth < 768) {
      setMobileInputVisible(true)
      setFabOpen(false)
    }
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleAddCustomVerb = async (text: string) => {
    const icons = ['🎯', '📖', '🔧', '💡', '📊', '🗂️', '🚀', '⭐', '📝', '🎪']
    const icon = icons[Math.floor(Math.random() * icons.length)]!
    const result = await addVerb(text, icon)
    if (result.duplicate) {
      useToastStore.getState().addToast({ title: t('verbDuplicate'), body: t('verbAlreadyExists', { text }), type: 'warning' })
    }
  }

  const handleFabToggle = () => {
    setFabOpen(prev => !prev)
  }

  const capitalizeFirst = useAuthStore((s) => s.user?.capitalize_first !== false)

  const handleAddTask = async (data: TaskCreateFormData) => {
    setIsAdding(true)
    try {
      const verbPrefix = activeVerb ? `${activeVerb.text} ` : ''
      const userText = data.title || ''
      const normalizedText = verbPrefix
        ? userText.charAt(0).toLowerCase() + userText.slice(1)
        : userText
      let titleWithVerb = verbPrefix + normalizedText
      if (capitalizeFirst && titleWithVerb.length > 0) {
        titleWithVerb = titleWithVerb.charAt(0).toUpperCase() + titleWithVerb.slice(1)
      }
      await onAddTask({ title: titleWithVerb, description: data.description || undefined })
      reset()
      setShowDescription(false)
      setActiveVerb(null)
      setMobileInputVisible(false)
      setFabOpen(false)
      if (autoFocus) {
        requestAnimationFrame(() => {
          inputRef.current?.focus()
        })
      }
    } catch {}
    setIsAdding(false)
  }

  const handleSaveTask = async (id: string, data: UpdateTask) => {
    await onSaveTask(id, data)
    setEditingTask(null)
  }

  const effectiveMoveTargets = moveTargets ?? DEFAULT_MOVE_TARGETS

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const activeGroups = groupBy ? groupTasks(activeTasks, groupBy) : null
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true)

  const effectiveEmptyMessage = emptyMessage ?? t('noTasks')

  const mobileFab = (
    <div className="md:hidden">
      <VerbFab
        templates={templates}
        activeVerb={activeVerb?.id ?? null}
        onSelect={handleVerbSelect}
        onAddCustom={handleAddCustomVerb}
        isOpen={fabOpen}
        onToggle={handleFabToggle}
      />
    </div>
  )

  if (isLoading && tasks.length === 0) {
    return (
      <>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
        {mobileFab}
      </>
    )
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            <button
              onClick={() => onRefetch()}
              className="ml-auto text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
            >
              {t('retry', { ns: 'common' })}
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="hidden md:block">
          <form onSubmit={handleSubmit(handleAddTask)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4">
            {inputFocused && (
              <VerbChips
                templates={templates}
                activeVerb={activeVerb?.id ?? null}
                onSelect={handleVerbSelect}
                onAddCustom={handleAddCustomVerb}
              />
            )}
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={activeVerb ? `${activeVerb.text} ...` : t('addTask')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAdding || isSubmitting}
                  {...titleField}
                  ref={(e) => {
                    titleField.ref(e)
                    inputRef.current = e
                  }}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => setInputFocused(false), 200)
                  }}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAdding || isSubmitting}
              >
                {showDescription ? '−' : '+'}
              </button>
              <button
                type="submit"
                disabled={isAdding || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding || isSubmitting ? t('adding') : t('addBtn')}
              </button>
            </div>

            {showDescription && (
              <div className="mt-3">
                <textarea
                  placeholder={t('addDescription')}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isAdding || isSubmitting}
                  {...register('description')}
                />
              </div>
            )}
          </form>
        </div>
      )}

      {mobileInputVisible && showAddForm && (
        <div className="md:hidden">
          <form onSubmit={handleSubmit(handleAddTask)} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 border-2 border-indigo-500 dark:border-indigo-400">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  autoFocus
                  placeholder={activeVerb ? `${activeVerb.text} ...` : t('addTask')}
                  className="w-full px-3 py-2 border border-indigo-300 dark:border-indigo-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  {...titleField}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 border border-transparent rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                {t('addBtnMobile')}
              </button>
            </div>
          </form>
        </div>
      )}

      {mobileFab}

      {activeTasks.length === 0 && completedTasks.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">{effectiveEmptyMessage}</p>
        </div>
      )}

      {activeTasks.length > 0 && !activeGroups && (
        <div className="space-y-2">
          {activeTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setViewingTaskId(task.id)}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium relative text-gray-900 dark:text-gray-100">
                    <span className="inline-flex items-center">
                      <HighlightText text={task.title} query={searchQuery} />
                      <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                    </span>
                    {historyTaskId === task.id && (
                      <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                    )}
                  </h3>
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <HighlightText text={task.description} query={searchQuery} />
                    </p>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: tag.color || '#6366f1' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.project && (
                    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                      <Link
                        to={`/projects/${task.project.id}`}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                      >
                        {task.project.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                        )}
                        <span>{task.project.name}</span>
                      </Link>
                    </div>
                  )}
                  {task.context && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                        {task.context.color && (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                        )}
                        <span>{task.context.name}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {showGtdStatus && task.gtd_status && (() => {
                      const cfg = GTD_STATUS_CONFIG[task.gtd_status]
                      return cfg ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
                          {t(cfg.labelKey)}
                        </span>
                      ) : null
                    })()}
                    {(() => {
                      const result = formatDueDate(task.due_date, locale)
                      const isOverdue = result.overdue
                      const dueText = !task.due_date
                        ? t('noDueDate')
                        : result.isPlain
                          ? result.text + (result.time ? `, ${result.time}` : '')
                          : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
                      return (
                        <p className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                          {dueText}
                        </p>
                      )
                    })()}
                    {task.checklist_total > 0 && (
                      <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                        {task.checklist_completed}/{task.checklist_total}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                  {!hideMoveButtons &&
                    effectiveMoveTargets
                      .filter((mt) => mt.status !== task.gtd_status)
                      .map((mt) => (
                        <button
                          key={mt.status}
                          onClick={() => onMoveTask(task.id, mt.status)}
                          className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                          title={t('moveTo', { label: mt.label })}
                        >
                          {mt.label}
                        </button>
                      ))}
                  {onRestoreTask && (
                    <button
                      onClick={() => onRestoreTask(task.id)}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                    >
                      {t('restore')}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingTask(task)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                  >
                    {t('editBtn')}
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                  >
                    {t('deleteBtn')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeGroups && activeGroups.length > 0 && (
        <div className="space-y-4">
          {activeGroups.map((group) => (
            <TaskGroupSection
              key={group.key}
              group={group}
              storageKey={`group-collapsed:${group.key}:${groupBy}`}
            >
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setViewingTaskId(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium relative text-gray-900 dark:text-gray-100">
                        <span className="inline-flex items-center">
                          <HighlightText text={task.title} query={searchQuery} />
                          <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                        </span>
                        {historyTaskId === task.id && (
                          <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                        )}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <HighlightText text={task.description} query={searchQuery} />
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white"
                              style={{ backgroundColor: tag.color || '#6366f1' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const result = formatDueDate(task.due_date, locale)
                          const isOverdue = result.overdue
                          const dueText = !task.due_date
                            ? t('noDueDate')
                            : result.isPlain
                              ? result.text + (result.time ? `, ${result.time}` : '')
                              : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
                          return (
                            <p className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                              {dueText}
                            </p>
                          )
                        })()}
                        {task.checklist_total > 0 && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {task.checklist_completed}/{task.checklist_total}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      {!hideMoveButtons &&
                        effectiveMoveTargets
                          .filter((mt) => mt.status !== task.gtd_status)
                          .map((mt) => (
                            <button
                              key={mt.status}
                              onClick={() => onMoveTask(task.id, mt.status)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                              title={t('moveTo', { label: mt.label })}
                            >
                              {mt.label}
                            </button>
                          ))}
                      {onRestoreTask && (
                        <button
                          onClick={() => onRestoreTask(task.id)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                        >
                          {t('restore')}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                      >
                        {t('editBtn')}
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 focus:outline-none"
                      >
                        {t('deleteBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </TaskGroupSection>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
          >
            <span>{t('completedCount', { count: completedTasks.length })}</span>
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isCompletedCollapsed ? '' : 'rotate-180'}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {!isCompletedCollapsed && (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-4 opacity-75 cursor-pointer"
                  onClick={() => setViewingTaskId(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleTask(task.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium relative text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500">
                        <span className="inline-flex items-center">
                          <HighlightText text={task.title} query={searchQuery} />
                          <TaskIcons task={task} onHistoryClick={() => setHistoryTaskId(task.id)} />
                        </span>
                        {historyTaskId === task.id && (
                          <RecurrenceHistoryPopup taskId={task.id} onClose={() => setHistoryTaskId(null)} />
                        )}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-sm text-gray-400 dark:text-gray-500 line-through decoration-2 decoration-gray-400 dark:decoration-gray-500">
                          <HighlightText text={task.description} query={searchQuery} />
                        </p>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white opacity-60"
                              style={{ backgroundColor: tag.color || '#6366f1' }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {task.project && (
                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/projects/${task.project.id}`}
                            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                          >
                            {task.project.color && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                            )}
                            <span className="opacity-60">{task.project.name}</span>
                          </Link>
                        </div>
                      )}
                      {task.context && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                            {task.context.color && (
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.context.color }} />
                            )}
                            <span className="opacity-60">{task.context.name}</span>
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {showGtdStatus && task.gtd_status && (() => {
                          const cfg = GTD_STATUS_CONFIG[task.gtd_status]
                          return cfg ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text} opacity-60`}>
                              {t(cfg.labelKey)}
                            </span>
                          ) : null
                        })()}
                        {(() => {
                          const result = formatDueDate(task.due_date, locale)
                          const isOverdue = result.overdue
                          const dueText = !task.due_date
                            ? t('noDueDate')
                            : result.isPlain
                              ? result.text + (result.time ? `, ${result.time}` : '')
                              : t(result.text, { date: result.date, count: result.count }) + (result.time ? `, ${result.time}` : '')
                          return (
                            <p className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                              {dueText}
                            </p>
                          )
                        })()}
                        {task.checklist_total > 0 && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                            {task.checklist_completed}/{task.checklist_total}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                      {!hideMoveButtons &&
                        effectiveMoveTargets
                          .filter((t) => t.status !== task.gtd_status)
                          .map((mt) => (
                            <button
                              key={mt.status}
                              onClick={() => onMoveTask(task.id, mt.status)}
                              className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                              title={t('moveTo', { label: mt.label })}
                            >
                              {mt.label}
                            </button>
                          ))}
                      {onRestoreTask && (
                        <button
                          onClick={() => onRestoreTask(task.id)}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 focus:outline-none font-medium"
                        >
                          {t('restore')}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                      >
                        {t('editBtn')}
                      </button>
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="text-sm text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 focus:outline-none"
                      >
                        {t('deleteBtn')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TaskEditModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveTask}
      />

      <TaskDetailModal
        taskId={viewingTaskId}
        isOpen={!!viewingTaskId}
        onClose={() => setViewingTaskId(null)}
        onEdit={(task) => {
          setViewingTaskId(null)
          setEditingTask(task)
        }}
      />
    </>
  )
}
