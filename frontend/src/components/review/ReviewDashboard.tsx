import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { computeDeltas } from '../../utils/reviewDelta'

function DeltaIndicator({ delta, improved }: { delta: number; improved: boolean }) {
  if (delta === 0) {
    return <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
  }
  const isUp = delta > 0
  const color = improved
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  return (
    <span className={`text-[10px] font-medium ${color}`}>
      {isUp ? '↑' : '↓'}{Math.abs(delta)}
    </span>
  )
}

function MetricCard({
  value,
  label,
  color,
  delta,
  improved,
}: {
  value: number
  label: string
  color: string
  delta?: number
  improved?: boolean
}) {
  return (
    <div className={`rounded-lg p-4 text-center ${color}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-2xl font-bold">{value}</span>
        {delta !== undefined && <DeltaIndicator delta={delta} improved={improved ?? false} />}
      </div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  )
}

function HealthBadge({ status }: { status: 'ok' | 'attention' | 'problems' }) {
  const { t } = useTranslation('review')
  const config = {
    ok: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
    attention: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
    problems: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  }
  const c = config[status]
  const labelKey = status === 'ok' ? 'dashboardHealthOk' : status === 'attention' ? 'dashboardHealthAttention' : 'dashboardHealthProblems'

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${c.bg} ${c.text}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot}`} />
      <span className="text-sm font-medium">{t(labelKey)}</span>
    </div>
  )
}

function WeekActivity({ activity, total }: { activity: Record<string, number>; total: number }) {
  const { t } = useTranslation('review')
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxVal = Math.max(...Object.values(activity), 1)

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('dashboardWeekActivity')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {total} {t('dashboardWeekDone')}
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-12">
        {days.map((day) => {
          const count = activity[day] || 0
          const height = count > 0 ? Math.max((count / maxVal) * 100, 15) : 4
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex justify-center">
                <div
                  className={`w-full max-w-[24px] rounded-sm transition-all ${
                    count > 0 ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-500">{day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ReviewDashboard() {
  const { t } = useTranslation('review')
  const summary = useReviewStore((s) => s.summary)
  const setStep = useReviewStore((s) => s.setStep)
  const fetchData = useReviewStore((s) => s.fetchData)

  const handleGoToInbox = useCallback(async () => {
    await fetchData()
    setStep('inbox')
  }, [fetchData, setStep])

  const handleGoToProjects = useCallback(async () => {
    await fetchData()
    setStep('projects')
  }, [fetchData, setStep])

  const handleGoToSomeday = useCallback(async () => {
    await fetchData()
    setStep('someday')
  }, [fetchData, setStep])

  const handleGoToOverdue = useCallback(async () => {
    await fetchData()
    setStep('overdue')
  }, [fetchData, setStep])

  if (!summary) return null

  const deltas = summary.previous_snapshot ? computeDeltas(summary, summary.previous_snapshot) : null

  const weekTotal = Object.values(summary.week_activity).reduce((a, b) => a + b, 0)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t('dashboardTitle', { count: summary.review_count + 1 })}
      </h1>

      <div className="grid grid-cols-4 gap-3 w-full mb-4">
        <MetricCard
          value={summary.inbox_count}
          label={t('dashboardInbox')}
          color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
          delta={deltas?.inbox?.delta}
          improved={deltas?.inbox?.improved}
        />
        <MetricCard
          value={summary.overdue_count}
          label={t('dashboardOverdue')}
          color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
          delta={deltas?.overdue?.delta}
          improved={deltas?.overdue?.improved}
        />
        <MetricCard
          value={summary.done_this_week}
          label={t('dashboardDone')}
          color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
          delta={deltas?.done?.delta}
          improved={deltas?.done?.improved}
        />
        <MetricCard
          value={summary.stale_count}
          label={t('dashboardStale')}
          color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
          delta={deltas?.stale?.delta}
          improved={deltas?.stale?.improved}
        />
      </div>

      <div className="w-full mb-4">
        <WeekActivity activity={summary.week_activity} total={weekTotal} />
      </div>

      {summary.alerts.length > 0 && (
        <div className="w-full mb-4">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            {t('dashboardAttention')}
          </h3>
          <div className="space-y-1.5">
            {summary.alerts.map((alert, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  alert.severity === 'red'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                }`}
              >
                {alert.severity === 'red' ? '🔴' : '🟡'} {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <HealthBadge status={summary.health_status} />
      </div>

      <div className="grid grid-cols-4 gap-3 w-full">
        <button
          onClick={handleGoToInbox}
          className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-4 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
        >
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {summary.inbox_count > 0 ? `▶ ${summary.inbox_count}` : '✓ 0'}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">{t('dashboardTriageInbox')}</div>
          {summary.inbox_count > 0 && (
            <div className="text-[10px] text-blue-400 dark:text-blue-500">{t('dashboardTriage')}</div>
          )}
        </button>

        <button
          onClick={handleGoToOverdue}
          className="rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-4 text-center hover:border-red-400 dark:hover:border-red-600 transition-colors"
        >
          <div className="text-lg font-bold text-red-700 dark:text-red-300">
            {summary.overdue_count > 0 ? `▶ ${summary.overdue_count}` : '✓ 0'}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{t('dashboardTriageOverdue')}</div>
          {summary.overdue_count > 0 && (
            <div className="text-[10px] text-red-400 dark:text-red-500">{t('dashboardTriage')}</div>
          )}
        </button>

        <button
          onClick={handleGoToProjects}
          className="rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-4 text-center hover:border-green-400 dark:hover:border-green-600 transition-colors"
        >
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {summary.projects_without_next > 0 ? `▶ ${summary.projects_without_next}` : '✓ 0'}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">{t('dashboardTriageProjects')}</div>
          {summary.projects_without_next > 0 && (
            <div className="text-[10px] text-green-400 dark:text-green-500">{t('dashboardFixAlerts')}</div>
          )}
        </button>

        <button
          onClick={handleGoToSomeday}
          className="rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-4 py-4 text-center hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
        >
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {summary.someday_count > 0 ? `▶ ${summary.someday_count}` : '✓ 0'}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">{t('dashboardTriageSomeday')}</div>
          {summary.someday_count > 0 && (
            <div className="text-[10px] text-purple-400 dark:text-purple-500">{t('dashboardTriage')}</div>
          )}
        </button>
      </div>
    </div>
  )
}
