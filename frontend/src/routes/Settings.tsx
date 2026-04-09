import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { useAuthStore } from '../stores/authStore'
import { usersApi } from '../api/users'
import type { User } from '../api/users'

type Theme = 'light' | 'dark'
type Tab = 'general' | 'users'

function SettingsContent() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('general')

  const savedTheme = localStorage.getItem('theme') as Theme | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const [theme, setTheme] = useState<Theme>(savedTheme || (prefersDark ? 'dark' : 'light'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
  }

  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: 'general', label: 'Общие', adminOnly: false },
    { key: 'users', label: 'Пользователи', adminOnly: true },
  ]

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || user?.is_admin)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-2 text-gray-600">Персонализируйте приложение под себя</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Внешний вид</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тема оформления
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'light'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
                      <span className="text-sm font-medium text-gray-900">Светлая</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'dark'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-900" />
                      <span className="text-sm font-medium text-gray-900">Тёмная</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">О приложении</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Версия:</strong> 1.0.0</p>
              <p><strong>Название:</strong> Todowka</p>
              <p>Приложение для управления задачами с поддержкой PWA</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && user?.is_admin && <UsersTab currentUser={user} />}
    </div>
  )
}

function UsersTab({ currentUser }: { currentUser: User }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await usersApi.getAll()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleBlock = async (userId: string) => {
    try {
      setActionLoading(userId)
      await usersApi.blockUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (userId: string) => {
    try {
      setActionLoading(userId)
      await usersApi.unblockUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unblock user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return
    }

    try {
      setActionLoading(userId)
      await usersApi.deleteUser(userId)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Управление пользователями</h2>
        <p className="text-sm text-gray-500 mb-4">Всего: {users.length}</p>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Роль
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Дата регистрации
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {u.username}
                        {currentUser.id === u.id && (
                          <span className="ml-1 text-xs text-gray-400">(Вы)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_blocked ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Заблокирован
                      </span>
                    ) : u.is_active ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Активен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        Неактивен
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                        Администратор
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Пользователь
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {currentUser.id !== u.id && !u.is_admin && (
                      <div className="flex justify-end gap-2">
                        {u.is_blocked ? (
                          <button
                            onClick={() => handleUnblock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : 'Разблокировать'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : 'Блокировать'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {actionLoading === u.id ? '...' : 'Удалить'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function Settings() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}
