import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reviewApi } from '../../api/review'

export interface ReviewStats {
  inboxProcessed: number
  projectsWithoutNext: number
  somedayActivated: number
}

interface ReviewCompletionProps {
  stats: ReviewStats
  onGoHome: () => void
}

export function ReviewCompletion({ stats, onGoHome }: ReviewCompletionProps) {
  const { t } = useTranslation('review')
  const [isCompleting, setIsCompleting] = useState(true)

  useEffect(() => {
    let cancelled = false
    reviewApi
      .complete()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCompleting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="animate-scale-in flex flex-col items-center py-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <svg
          className="h-8 w-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t('completionTitle')}
      </h2>

      <ul className="space-y-3 text-left w-full max-w-xs mb-8">
        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
            {stats.inboxProcessed}
          </span>
          {t('completionInboxProcessed', { count: stats.inboxProcessed })}
        </li>
        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
              stats.projectsWithoutNext > 0
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            }`}
          >
            {stats.projectsWithoutNext}
          </span>
          {t('completionProjectsWithoutNext', { count: stats.projectsWithoutNext })}
        </li>
        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold shrink-0">
            {stats.somedayActivated}
          </span>
          {t('completionSomedayActivated', { count: stats.somedayActivated })}
        </li>
      </ul>

      <button
        onClick={onGoHome}
        disabled={isCompleting}
        className="px-8 py-3 rounded-xl text-sm font-medium text-white
          bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
          transition-colors disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center gap-2"
      >
        {isCompleting && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {t('goHome')}
      </button>
    </div>
  )
}
