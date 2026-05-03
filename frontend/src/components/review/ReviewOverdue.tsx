import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { db } from '../../db/database'
import { useAuthStore } from '../../stores/authStore'
import { v4 as uuidv4 } from 'uuid'

function ProgressDots({ current, total }: { current: number; total: number }) {
  const dots = Math.min(total, 12)
  const filled = Math.min(current, dots)
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full transition-all ${
            i < filled
              ? 'bg-red-500 dark:bg-red-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
      {total > 12 && <span className="text-xs text-gray-400 ml-1">+{total - 12}</span>}
    </div>
  )
}

function OverdueBadge({ dueDate }: { dueDate: string | null }) {
  const [daysOverdue, setDaysOverdue] = useState(0)
  useEffect(() => {
    if (dueDate) {
      const diff = Date.now() - new Date(dueDate).getTime()
      setDaysOverdue(Math.floor(diff / (1000 * 60 * 60 * 24)))
    }
  }, [dueDate])

  if (!dueDate || daysOverdue <= 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {daysOverdue}d overdue
    </span>
  )
}

export function ReviewOverdueStep() {
  const { t } = useTranslation('review')
  const data = useReviewStore((s) => s.data)
  const incrementOverdueProcessed = useReviewStore((s) => s.incrementOverdueProcessed)
  const setStep = useReviewStore((s) => s.setStep)
  const user = useAuthStore((s) => s.user)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)
  const [newDate, setNewDate] = useState('')

  const overdueTasks = useMemo(() => data?.overdue_tasks ?? [], [data?.overdue_tasks])
  const total = overdueTasks.length

  useEffect(() => {
    if (total === 0) {
      setStep('dashboard')
    }
  }, [total, setStep])

  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setStep('dashboard')
    }
  }, [currentIndex, total, setStep])

  const advance = useCallback(() => {
    setCurrentIndex((prev) => prev + 1)
    setError(null)
    setShowReschedule(false)
  }, [])

  const updateTask = useCallback(
    async (taskId: string, updates: Record<string, unknown>) => {
      if (!user) return
      const now = new Date().toISOString()
      await db.tasks.update(taskId, { ...updates, updatedAt: now, _syncStatus: 'modified' } as never)
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: taskId,
        action: 'move',
        payload: JSON.stringify(updates),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })
    },
    [user],
  )

  const handleDoIt = useCallback(async () => {
    if (processing || currentIndex >= total) return
    const task = overdueTasks[currentIndex]
    if (!task) return
    setProcessing(true)
    try {
      await updateTask(task.id, { gtd_status: 'active', due_date: null })
      incrementOverdueProcessed()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, overdueTasks, updateTask, incrementOverdueProcessed, advance])

  const handleSomeday = useCallback(async () => {
    if (processing || currentIndex >= total) return
    const task = overdueTasks[currentIndex]
    if (!task) return
    setProcessing(true)
    try {
      await updateTask(task.id, { gtd_status: 'someday', due_date: null })
      incrementOverdueProcessed()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, overdueTasks, updateTask, incrementOverdueProcessed, advance])

  const handleTrash = useCallback(async () => {
    if (processing || currentIndex >= total) return
    const task = overdueTasks[currentIndex]
    if (!task) return
    setProcessing(true)
    try {
      await updateTask(task.id, { gtd_status: 'trash' })
      incrementOverdueProcessed()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, overdueTasks, updateTask, incrementOverdueProcessed, advance])

  const handleReschedule = useCallback(async () => {
    if (processing || currentIndex >= total || !newDate) return
    const task = overdueTasks[currentIndex]
    if (!task) return
    setProcessing(true)
    try {
      await updateTask(task.id, { due_date: new Date(newDate).toISOString() })
      incrementOverdueProcessed()
      advance()
      setNewDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, overdueTasks, newDate, updateTask, incrementOverdueProcessed, advance])

  const handleSkip = useCallback(() => {
    if (processing) return
    incrementOverdueProcessed()
    advance()
  }, [processing, incrementOverdueProcessed, advance])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (processing || showReschedule) return
      if (currentIndex >= total) return
      if (e.key === '1') setShowReschedule(true)
      else if (e.key === '2') handleDoIt()
      else if (e.key === '3') handleSomeday()
      else if (e.key === '4') handleTrash()
      else if (e.key === 's' || e.key === 'S') handleSkip()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processing, showReschedule, currentIndex, total, handleDoIt, handleSomeday, handleTrash, handleSkip])

  if (total === 0) return null

  const currentTask = overdueTasks[currentIndex]
  if (!currentTask) return null

  const nextTasks = overdueTasks.slice(currentIndex + 1, currentIndex + 3)

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={() => setStep('dashboard')}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {t('backToDashboard')}
        </button>
        <ProgressDots current={currentIndex} total={total} />
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {currentIndex + 1}/{total}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-lg mx-auto w-full">
        <div className="rounded-2xl border-2 border-red-500 dark:border-red-400 bg-white dark:bg-gray-800 p-8 mb-6 shadow-sm w-full text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-3">
              {currentTask.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
            <OverdueBadge dueDate={currentTask.due_date} />
            {currentTask.project_name && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {currentTask.project_name}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {currentTask.gtd_status}
            </span>
          </div>
        </div>

        {nextTasks.length > 0 && (
          <div className="mb-6 w-full">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wider">
              {t('nextInQueue')}
            </p>
            <div className="space-y-1">
              {nextTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg bg-gray-50 dark:bg-gray-700/30 px-3 py-2 flex items-center justify-between"
                >
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{task.title}</p>
                  <OverdueBadge dueDate={task.due_date} />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        {showReschedule && (
          <div className="mb-4 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 p-3">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('overdueReschedule')}
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                onClick={handleReschedule}
                disabled={!newDate || processing}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {t('overdueSetDate')}
              </button>
              <button
                onClick={() => setShowReschedule(false)}
                className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={() => setShowReschedule(true)}
            disabled={processing}
            className="flex-1 flex flex-col items-center rounded-lg bg-amber-100 px-3 py-3 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('overdueReschedule')}</span>
            <span className="text-[10px] opacity-70">1</span>
          </button>
          <button
            onClick={handleDoIt}
            disabled={processing || showReschedule}
            className="flex-1 flex flex-col items-center rounded-lg bg-indigo-600 px-3 py-3 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionDoIt')}</span>
            <span className="text-[10px] opacity-70">2</span>
          </button>
          <button
            onClick={handleSomeday}
            disabled={processing || showReschedule}
            className="flex-1 flex flex-col items-center rounded-lg bg-purple-100 px-3 py-3 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionSomeday')}</span>
            <span className="text-[10px] opacity-70">3</span>
          </button>
          <button
            onClick={handleTrash}
            disabled={processing || showReschedule}
            className="flex-1 flex flex-col items-center rounded-lg bg-red-100 px-3 py-3 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('actionDelete')}</span>
            <span className="text-[10px] opacity-70">4</span>
          </button>
        </div>

        <button
          onClick={handleSkip}
          disabled={processing}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          {t('actionSkip')} (S)
        </button>
      </div>
    </div>
  )
}
