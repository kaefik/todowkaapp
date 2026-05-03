import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { reviewApi } from '../../api/review'
import { useReviewStore } from '../../stores/reviewStore'

interface ReviewCompletionProps {
  onGoHome: () => void
}

export function ReviewCompletion({ onGoHome }: ReviewCompletionProps) {
  const { t } = useTranslation('review')
  const { stats, data, summary } = useReviewStore()
  const [isCompleting, setIsCompleting] = useState(true)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [healthAfter, setHealthAfter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    reviewApi
      .complete({
        inbox_processed: stats.inboxProcessed,
        next_actions_added: stats.nextActionsAdded,
        someday_activated: stats.somedayActivated,
      })
      .then((response) => {
        if (!cancelled) {
          setCompletedAt(response.completed_at)
          setHealthAfter(response.snapshot_health)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCompleting(false)
      })
    return () => {
      cancelled = true
    }
  }, [stats])

  const reviewCount = data?.review_count ?? 0
  const frequencyDays = summary?.review_frequency_days ?? 7

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + frequencyDays)
    return date.toLocaleDateString()
  }

  const healthBefore = summary?.health_status ?? null

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        {t('completionTitle')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {t('completionSubtitle')}
      </p>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inboxProcessed}</div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">{t('completionInboxProcessed')}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.nextActionsAdded}</div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">{t('completionNextAdded')}</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.somedayActivated}</div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">{t('completionSomedayActivated')}</div>
        </div>
      </div>

      {healthBefore && healthAfter && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 w-full max-w-md mb-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Health: {healthBefore} → {healthAfter}
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 w-full max-w-md mb-6">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          {t('completionReviewNumber', { count: reviewCount })}
        </div>
        {completedAt && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('completionNextReview', { date: formatDate(completedAt) })}
          </div>
        )}
      </div>

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
