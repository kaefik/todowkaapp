import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { httpClient } from '../../api/httpClient'

export function ReviewSomedayStep() {
  const { t } = useTranslation('review')
  const data = useReviewStore(s => s.data)
  const incrementSomedayProcessed = useReviewStore(s => s.incrementSomedayProcessed)
  const incrementSomedayActivated = useReviewStore(s => s.incrementSomedayActivated)
  const setStep = useReviewStore(s => s.setStep)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const somedayTasks = data?.someday_tasks ?? []
  const total = somedayTasks.length

  useEffect(() => {
    if (total === 0) {
      setStep('completion')
    }
  }, [total, setStep])

  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setStep('completion')
    }
  }, [currentIndex, total, setStep])

  const advance = useCallback(() => {
    setCurrentIndex(prev => prev + 1)
    setError(null)
  }, [])

  const handleActivate = useCallback(async () => {
    if (processing || currentIndex >= total) return
    const task = somedayTasks[currentIndex]
    if (!task) return

    setProcessing(true)
    setError(null)

    try {
      await httpClient.patch(`/tasks/${task.id}`, { gtd_status: 'active' })
      incrementSomedayActivated()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somedayActionFailed'))
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, somedayTasks, incrementSomedayActivated, advance, t])

  const handleKeep = useCallback(() => {
    if (processing || currentIndex >= total) return
    incrementSomedayProcessed()
    advance()
  }, [processing, currentIndex, total, incrementSomedayProcessed, advance])

  const handleTrash = useCallback(async () => {
    if (processing || currentIndex >= total) return
    const task = somedayTasks[currentIndex]
    if (!task) return

    setProcessing(true)
    setError(null)

    try {
      await httpClient.patch(`/tasks/${task.id}`, { gtd_status: 'trash' })
      incrementSomedayProcessed()
      advance()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somedayActionFailed'))
    } finally {
      setProcessing(false)
    }
  }, [processing, currentIndex, total, somedayTasks, incrementSomedayProcessed, advance, t])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (processing) return
      if (currentIndex >= total) return

      if (e.key === '1') {
        handleActivate()
      } else if (e.key === '2' || e.key === 'Enter') {
        handleKeep()
      } else if (e.key === '3') {
        handleTrash()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processing, currentIndex, total, handleActivate, handleKeep, handleTrash])

  if (total === 0) return null

  const currentTask = somedayTasks[currentIndex]
  if (!currentTask) return null

  const nextTasks = somedayTasks.slice(currentIndex + 1, currentIndex + 3)

  return (
    <div>
      <div className="px-5 py-4 border-b bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            💭 {t('somedayTitle')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('somedayDescription', { count: total })}
          </p>
        </div>
        <button
          onClick={() => setStep('completion')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          {t('complete')}
        </button>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">
          {t('taskNumberOf', { current: currentIndex + 1, total })}
        </p>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
        )}

        <div className="border-2 border-purple-500 dark:border-purple-400 bg-white dark:bg-gray-800 rounded-xl p-5 mb-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {currentTask.title}
          </h3>
          {currentTask.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
              {currentTask.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={handleActivate}
            disabled={processing}
            className="flex flex-col items-center rounded-lg bg-purple-600 px-4 py-3 text-white hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayActivate')}</span>
            <span className="text-[10px] opacity-70 mt-0.5">1</span>
          </button>

          <button
            onClick={handleKeep}
            disabled={processing}
            className="flex flex-col items-center rounded-lg bg-green-600 px-4 py-3 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayKeep')}</span>
            <span className="text-[10px] opacity-70 mt-0.5">2 / Enter</span>
          </button>

          <button
            onClick={handleTrash}
            disabled={processing}
            className="flex flex-col items-center rounded-lg bg-red-600 px-4 py-3 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <span className="text-sm font-medium">{t('somedayTrash')}</span>
            <span className="text-[10px] opacity-70 mt-0.5">3</span>
          </button>
        </div>

        {nextTasks.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
              {t('nextInQueue')}
            </p>
            <div className="space-y-2">
              {nextTasks.map(task => (
                <div
                  key={task.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 px-4 py-2.5"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {task.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}