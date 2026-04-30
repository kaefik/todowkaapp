import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TaskReviewItem } from '../../api/review'
import { httpClient } from '../../api/httpClient'

type TaskAction = 'activating' | 'trashing' | 'keeping' | null

interface TaskState {
  action: TaskAction
  removed: boolean
}

interface ReviewSomedayProps {
  somedayTasks: TaskReviewItem[]
  onComplete: () => void
}

export function ReviewSomeday({ somedayTasks, onComplete }: ReviewSomedayProps) {
  const { t } = useTranslation('review')
  const [taskStates, setTaskStates] = useState<Record<string, TaskState>>({})
  const [error, setError] = useState<string | null>(null)

  const visibleTasks = somedayTasks.filter((task) => !taskStates[task.id]?.removed)
  const reviewedCount = somedayTasks.length - visibleTasks.length

  const handleAction = useCallback(
    async (taskId: string, action: 'active' | 'trash' | 'keep') => {
      if (action === 'keep') {
        setTaskStates((prev) => ({
          ...prev,
          [taskId]: { action: 'keeping', removed: false },
        }))
        return
      }

      const actionKey: TaskAction = action === 'active' ? 'activating' : 'trashing'
      setTaskStates((prev) => ({
        ...prev,
        [taskId]: { action: actionKey, removed: false },
      }))
      setError(null)

      try {
        await httpClient.patch(`/tasks/${taskId}`, { gtd_status: action })

        setTaskStates((prev) => ({
          ...prev,
          [taskId]: { action: actionKey, removed: true },
        }))
      } catch (err) {
        setError(err instanceof Error ? err.message : t('somedayActionFailed'))
        setTaskStates((prev) => ({
          ...prev,
          [taskId]: { action: null, removed: false },
        }))
      }
    },
    [t],
  )

  const allReviewed =
    somedayTasks.length === 0 ||
    somedayTasks.every(
      (task) => taskStates[task.id]?.action === 'keeping' || taskStates[task.id]?.removed,
    )

  if (visibleTasks.length === 0 && somedayTasks.length > 0) {
    return (
      <div>
        <div className="text-center py-8">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('somedayAllReviewed')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('somedayReviewedCount', { count: reviewedCount })}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
              bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
              transition-colors"
          >
            {t('complete')}
          </button>
        </div>
      </div>
    )
  }

  if (somedayTasks.length === 0) {
    return (
      <div>
        <div className="text-center py-8">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            {t('somedayEmpty')}
          </p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
              bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
              transition-colors"
          >
            {t('next')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('somedayRemaining', { count: visibleTasks.length })}
      </p>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
      )}

      <ul className="space-y-3">
        {visibleTasks.map((task) => {
          const state = taskStates[task.id]
          const isKeeping = state?.action === 'keeping'
          const isLoading = state?.action === 'activating' || state?.action === 'trashing'

          return (
            <li
              key={task.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                isKeeping
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>

              {isKeeping ? (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {t('somedayKept')}
                  </span>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleAction(task.id, 'active')}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-indigo-100 text-indigo-700 hover:bg-indigo-200
                      dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('somedayActivate')}
                  </button>
                  <button
                    onClick={() => handleAction(task.id, 'trash')}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-red-100 text-red-700 hover:bg-red-200
                      dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('somedayTrash')}
                  </button>
                  <button
                    onClick={() => handleAction(task.id, 'keep')}
                    disabled={isLoading}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium
                      bg-gray-100 text-gray-700 hover:bg-gray-200
                      dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500
                      transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('somedayKeep')}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {allReviewed && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
              bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
              transition-colors"
          >
            {t('complete')}
          </button>
        </div>
      )}
    </div>
  )
}
