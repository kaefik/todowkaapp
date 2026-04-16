import { useState } from 'react'
import { httpClient, ApiError } from '../api/httpClient'
import { notifyTasksChanged, useGtdCounts } from '../hooks/useGtdCounts'
import { GtdTaskList } from './GtdTaskList'

export function Trash() {
  const [isClearing, setIsClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const { counts } = useGtdCounts()
  const isEmpty = counts.trash === 0

  const handleClearTrash = async () => {
    if (!confirm('Удалить все задачи из корзины навсегда? Это действие нельзя отменить.')) return

    setIsClearing(true)
    setClearError(null)
    try {
      await httpClient.delete<{ deleted: number }>('/tasks/trash/clear')
      notifyTasksChanged()
      setRefreshKey((k) => k + 1)
    } catch (err) {
      if (err instanceof ApiError) {
        setClearError(err.message)
      } else {
        setClearError('Не удалось очистить корзину')
      }
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Корзина</h1>
        <button
          onClick={handleClearTrash}
          disabled={isClearing || isEmpty}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
        >
          {isClearing ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Очистка...
            </>
          ) : (
            'Очистить корзину'
          )}
        </button>
      </div>

      {clearError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {clearError}
        </div>
      )}

      <GtdTaskList gtdStatus="trash" title="" key={refreshKey} />
    </div>
  )
}
