import { useTranslation } from 'react-i18next'
import { useSyncStatus } from './SyncContext'

type SyncState = 'offline' | 'syncing' | 'pending' | 'online'

function getState(isOnline: boolean, isSyncing: boolean, pendingCount: number): SyncState {
  if (!isOnline) return 'offline'
  if (isSyncing) return 'syncing'
  if (pendingCount > 0) return 'pending'
  return 'online'
}

export function SyncStatus() {
  const { t } = useTranslation('sync')
  const { isOnline, isSyncing, pendingCount } = useSyncStatus()
  const state = getState(isOnline, isSyncing, pendingCount)

  const colorMap: Record<SyncState, string> = {
    offline: 'text-yellow-500',
    syncing: 'text-blue-500',
    pending: 'text-orange-500',
    online: 'text-green-500',
  }

  const labelMap: Record<SyncState, string> = {
    offline: t('offline'),
    syncing: t('syncing'),
    pending: t('pendingChanges', { count: pendingCount }),
    online: t('synced'),
  }

  const label = state === 'pending' ? t('pendingChanges', { count: pendingCount }) : labelMap[state]
  const color = colorMap[state]
  const animate = state === 'syncing'

  const title = !isOnline
    ? t('offlineTitle')
    : isSyncing
      ? t('syncingWithServer')
      : pendingCount > 0
        ? t('pendingChangesCount', { count: pendingCount })
        : t('allDataSynced')

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" title={title}>
      {state === 'offline' && (
        <svg className={`h-3.5 w-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 0v2m0-2h.01" />
          <line x1="4" y1="4" x2="20" y2="20" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
      )}

      {state === 'syncing' && (
        <svg className={`h-3.5 w-3.5 ${color} ${animate ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}

      {state === 'pending' && (
        <svg className={`h-3.5 w-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}

      {state === 'online' && (
        <svg className={`h-3.5 w-3.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}

      <span className={color}>{label}</span>
    </div>
  )
}
