import { useOfflineQueue } from '../hooks/useOfflineQueue'

export function SyncIndicator() {
  const { isOnline, queueSize, isSyncing } = useOfflineQueue()

  if (isOnline && queueSize === 0 && !isSyncing) {
    return null
  }

  const getStatusText = () => {
    if (!isOnline) return 'Офлайн режим'
    if (isSyncing) return 'Синхронизация...'
    if (queueSize > 0) return `Ожидает синхронизации: ${queueSize}`
    return ''
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-yellow-500'
    if (isSyncing) return 'bg-blue-500'
    if (queueSize > 0) return 'bg-orange-500'
    return 'bg-green-500'
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 shadow-lg rounded-lg px-4 py-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${isSyncing ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
      </div>
    </div>
  )
}
