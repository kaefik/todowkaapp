import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../stores/notificationStore'
import { formatTime, typeIcon } from '../utils/notificationUtils.tsx'

type Filter = 'all' | 'unread'

function NotificationsContent() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [offset, setOffset] = useState(0)
  const limit = 20
  const notifications = useNotificationStore((state) => state.notifications)
  const total = useNotificationStore((state) => state.total)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const isLoading = useNotificationStore((state) => state.isLoading)
  const error = useNotificationStore((state) => state.error)
  const refetch = useNotificationStore((state) => state.refetch)
  const markAsRead = useNotificationStore((state) => state.markAsRead)
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead)
  const deleteNotification = useNotificationStore((state) => state.deleteNotification)

  useEffect(() => {
    setOffset(0)
    refetch({ unread_only: filter === 'unread', limit, offset: 0 })
  }, [filter, refetch])

  const loadMore = () => {
    const newOffset = offset + limit
    setOffset(newOffset)
    refetch({ unread_only: filter === 'unread', limit, offset: newOffset })
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    refetch({ unread_only: filter === 'unread', limit, offset })
  }

  const handleNotificationClick = async (notificationId: string, taskId: string | null) => {
    await markAsRead(notificationId)
    if (taskId) {
      navigate(`/tasks?editTaskId=${taskId}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    await deleteNotification(notificationId)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Уведомления</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {unreadCount > 0 ? `${unreadCount} непрочитанных` : 'Все прочитано'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
            Прочитать все
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            filter === 'unread'
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Непрочитанные
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {filter === 'unread' ? 'Нет непрочитанных уведомлений' : 'Нет уведомлений'}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.task_id)}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.is_read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {typeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notification.is_read && (
                      <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                    )}
                    <button
                      onClick={(e) => handleDelete(e, notification.id)}
                      className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {offset + limit < total && (
              <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50"
                >
                  {isLoading ? 'Загрузка...' : 'Загрузить ещё'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function Notifications() {
  return <NotificationsContent />
}
