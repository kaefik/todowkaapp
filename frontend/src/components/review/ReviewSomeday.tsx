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
              ? 'bg-purple-500 dark:bg-purple-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
      {total > 12 && <span className="text-xs text-gray-400 ml-1">+{total - 12}</span>}
    </div>
  )
}

function DaysAgo({ dateStr }: { dateStr: string | null }) {
  const { t } = useTranslation('review')
  const [days, setDays] = useState(0)
  useEffect(() => {
    if (dateStr) {
      setDays(Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)))
    }
  }, [dateStr])
  if (!dateStr) return null
  return (
    <span className="text-xs text-gray-400 dark:text-gray-500">
      {t('addedDaysAgo', { count: days })}
    </span>
  )
}

export function ReviewSomedayStep() {
  const { t } = useTranslation('review')
  const data = useReviewStore((s) => s.data)
  const incrementSomedayProcessed = useReviewStore((s) => s.incrementSomedayProcessed)
  const incrementSomedayActivated = useReviewStore((s) => s.incrementSomedayActivated)
  const setStep = useReviewStore((s) => s.setStep)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const somedayTasks = useMemo(() => data?.someday_tasks ?? [], [data?.someday_tasks])
  const total = somedayTasks.length

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
  }, [])

  const user = useAuthStore((s) => s.user)

  const handleActivate = useCallback(async () => {
    if (processing || currentIndex >= total || !user) return
    const task = somedayTasks[currentIndex]
    if (!task) return

    setProcessing(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      await db.tasks.update(task.id, {
        gtdStatus: 'active',
        updatedAt: now,
        _syncStatus: 'modified',
      } as never)
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: task.id,
        action: 'move',
        payload: JSON.stringify({ gtd_status: 'active' }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })
      incrementSomedayActivated()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somedayActionFailed'))
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, somedayTasks, incrementSomedayActivated, advance, t, user])

  const handleKeep = useCallback(() => {
    if (processing || currentIndex >= total) return
    incrementSomedayProcessed()
    advance()
  }, [processing, currentIndex, total, incrementSomedayProcessed, advance])

  const handleTrash = useCallback(async () => {
    if (processing || currentIndex >= total || !user) return
    const task = somedayTasks[currentIndex]
    if (!task) return

    setProcessing(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      await db.tasks.update(task.id, {
        gtdStatus: 'trash',
        updatedAt: now,
        _syncStatus: 'modified',
      } as never)
      await db.mutations.add({
        id: uuidv4(),
        entityType: 'task',
        entityId: task.id,
        action: 'move',
        payload: JSON.stringify({ gtd_status: 'trash' }),
        timestamp: Date.now(),
        retryCount: 0,
        lastError: null,
      })
      incrementSomedayProcessed()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somedayActionFailed'))
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, somedayTasks, incrementSomedayProcessed, advance, t, user])

  const handleSkip = useCallback(() => {
    if (processing) return
    advance()
  }, [processing, advance])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (processing) return
      if (currentIndex >= total) return

      if (e.key === '1') handleActivate()
      else if (e.key === '2' || e.key === 'Enter') handleKeep()
      else if (e.key === '3') handleTrash()
      else if (e.key === 's' || e.key === 'S') handleSkip()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processing, currentIndex, total, handleActivate, handleKeep, handleTrash, handleSkip])

  if (total === 0) return null

  const currentTask = somedayTasks[currentIndex]
  if (!currentTask) return null

  const nextTasks = somedayTasks.slice(currentIndex + 1, currentIndex + 3)

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
        <div className="rounded-2xl border-2 border-purple-500 dark:border-purple-400 bg-white dark:bg-gray-800 p-8 mb-8 shadow-sm w-full text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-3">
              {currentTask.description}
            </p>
          )}
          <div className="mt-3">
            <DaysAgo dateStr={currentTask.created_at} />
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
                  <DaysAgo dateStr={task.created_at} />
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="flex items-center gap-2 w-full">
          <button
            onClick={handleActivate}
            disabled={processing}
            className="flex-1 flex flex-col items-center rounded-lg bg-purple-600 px-3 py-3 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayActivate')}</span>
            <span className="text-[10px] opacity-70">1</span>
          </button>
          <button
            onClick={handleKeep}
            disabled={processing}
            className="flex-1 flex flex-col items-center rounded-lg bg-green-600 px-3 py-3 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayKeep')}</span>
            <span className="text-[10px] opacity-70">2 / Enter</span>
          </button>
          <button
            onClick={handleTrash}
            disabled={processing}
            className="flex-1 flex flex-col items-center rounded-lg bg-red-600 px-3 py-3 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayTrash')}</span>
            <span className="text-[10px] opacity-70">3</span>
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
