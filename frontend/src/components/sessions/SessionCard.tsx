import { useTranslation } from 'react-i18next'
import type { SessionData } from '../../api/sessions'

function formatRelativeDate(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return t('sessions:justNow')
  if (diffMin < 60) return t('sessions:minutesAgo', { count: diffMin })
  if (diffHour < 24) return t('sessions:hoursAgo', { count: diffHour })
  if (diffDay < 30) return t('sessions:daysAgo', { count: diffDay })
  return date.toLocaleDateString()
}

function getDeviceIcon(deviceType: string): string {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return '📱'
    case 'tablet':
      return '📱'
    default:
      return '💻'
  }
}

interface SessionCardProps {
  session: SessionData
  onRevoke: (id: string) => void
}

export function SessionCard({ session, onRevoke }: SessionCardProps) {
  const { t } = useTranslation('sessions')

  return (
    <div className="flex items-start gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <span className="text-2xl flex-shrink-0 mt-0.5">{getDeviceIcon(session.device_type)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {session.browser}
          </span>
          {session.is_current && (
            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              {t('current')}
            </span>
          )}
        </div>

        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
          <p>{session.os}</p>
          <p className="flex items-center gap-3 flex-wrap">
            <span>{session.ip_address}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{t('created')} {formatRelativeDate(session.created_at, t)}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{t('lastActivity')} {formatRelativeDate(session.last_activity, t)}</span>
          </p>
        </div>
      </div>

      {!session.is_current && (
        <button
          onClick={() => onRevoke(session.id)}
          className="flex-shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          {t('revoke')}
        </button>
      )}
    </div>
  )
}
