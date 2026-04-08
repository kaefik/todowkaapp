import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { httpClient } from '../api/httpClient'
import { ProtectedRoute } from '../components/ProtectedRoute'

interface Stats {
  total: number
  active: number
  completed: number
  created_week: number
  created_month: number
  completed_week: number
  completed_month: number
}

function ProfileContent() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await httpClient.get<Stats>('/stats')
        setStats(response.data)
      } catch {
        setError('Failed to load statistics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDaysSinceCreation = (created_at: string) => {
    const created = new Date(created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - created.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
          <p className="mt-2 text-gray-600">Информация о вашем аккаунте и статистика</p>
        </div>
        <Link
          to="/settings"
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
        >
          Настройки
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о пользователе</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Имя пользователя</span>
            <span className="text-sm font-medium text-gray-900">{user?.username}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Статус</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {user?.is_active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-500">Дата регистрации</span>
            <span className="text-sm font-medium text-gray-900">{user?.created_at ? formatDate(user.created_at) : 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium text-gray-500">Вы с нами</span>
            <span className="text-sm font-medium text-gray-900">
              {user?.created_at ? `${getDaysSinceCreation(user.created_at)} дней` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : stats ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика задач</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm font-medium text-indigo-600">Всего задач</p>
              <p className="text-3xl font-bold text-indigo-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">Активных</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.active}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600">Выполнено</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.completed}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-600">Создано за неделю</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.created_week}</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <p className="text-sm font-medium text-pink-600">Создано за месяц</p>
              <p className="text-3xl font-bold text-pink-900 mt-2">{stats.created_month}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-600">Выполнено за неделю</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{stats.completed_week}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function Profile() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
