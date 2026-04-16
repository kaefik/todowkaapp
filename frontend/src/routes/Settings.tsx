import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'
import { useToastStore } from '../stores/toastStore'
import { usersApi } from '../api/users'
import type { User } from '../api/users'

type Theme = 'light' | 'dark'
type Tab = 'general' | 'profile' | 'users'

const POPULAR_TIMEZONES = [
  { name: 'Москва (UTC+3)', value: 'Europe/Moscow' },
  { name: 'Лондон (UTC+0)', value: 'Europe/London' },
  { name: 'Нью-Йорк (UTC-5)', value: 'America/New_York' },
  { name: 'Токио (UTC+9)', value: 'Asia/Tokyo' },
  { name: 'Берлин (UTC+1)', value: 'Europe/Berlin' },
  { name: 'Париж (UTC+1)', value: 'Europe/Paris' },
  { name: 'Сидней (UTC+10)', value: 'Australia/Sydney' },
  { name: 'Дубай (UTC+4)', value: 'Asia/Dubai' },
  { name: 'Киев (UTC+2)', value: 'Europe/Kiev' },
  { name: 'Санкт-Петербург (UTC+3)', value: 'Europe/Moscow' },
  { name: 'Екатеринбург (UTC+5)', value: 'Asia/Yekaterinburg' },
  { name: 'Новосибирск (UTC+7)', value: 'Asia/Novosibirsk' },
  { name: 'Владивосток (UTC+10)', value: 'Asia/Vladivostok' },
  { name: 'Калининград (UTC+2)', value: 'Europe/Kaliningrad' },
]

function SettingsContent() {
  const { user } = useAuthStore()
  const browserNotifications = useBrowserNotifications()
  const addToast = useToastStore((s) => s.addToast)
  const [activeTab, setActiveTab] = useLocalStorage<Tab>(
    'ui-settings-active-tab',
    'general'
  )

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

  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [timezone, setTimezone] = useState(user?.timezone || 'Europe/Moscow')
  const [customTimezone, setCustomTimezone] = useState('')

  useEffect(() => {
    if (user) {
      setUsername(user.username)
      setEmail(user.email)
      setTimezone(user.timezone || 'Europe/Moscow')
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileLoading(true)
    setProfileError(null)
    setProfileSuccess(false)

    try {
      const updatedUser = await usersApi.updateCurrentUser({
        username,
        email,
        timezone,
      })
      
      const { setCurrentUser } = useAuthStore.getState()
      setCurrentUser(updatedUser)
      
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: 'general', label: 'Общие', adminOnly: false },
    { key: 'profile', label: 'Профиль', adminOnly: false },
    { key: 'users', label: 'Пользователи', adminOnly: true },
  ]

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || user?.is_admin)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Настройки</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Персонализируйте приложение под себя</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Внешний вид</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Тема оформления
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'light'
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300 dark:border-gray-600" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Светлая</span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                      theme === 'dark'
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-900 dark:bg-gray-100" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Тёмная</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Уведомления браузера</h2>

            {!browserNotifications.supported ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Ваш браузер не поддерживает уведомления. Попробуйте использовать Chrome, Firefox, Edge или Safari.
                </p>
              </div>
            ) : browserNotifications.permission === 'denied' && browserNotifications.enabled ? (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Уведомления заблокированы браузером. Разрешите уведомления в настройках сайта и обновите страницу.
                  </p>
                </div>
                <button
                  onClick={browserNotifications.disable}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Отключить уведомления
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Получайте системные уведомления браузера при наступлении напоминаний о задачах.
                  Уведомления отображаются даже когда приложение свёрнуто.
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Браузерные уведомления
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {browserNotifications.enabled
                        ? 'Уведомления включены'
                        : 'Уведомления отключены'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (browserNotifications.enabled) {
                        browserNotifications.disable()
                      } else {
                        browserNotifications.enable()
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                      browserNotifications.enabled
                        ? 'bg-indigo-600 dark:bg-indigo-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    role="switch"
                    aria-checked={browserNotifications.enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        browserNotifications.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {browserNotifications.enabled && (
                    <button
                      onClick={async () => {
                        const ok = await browserNotifications.showNotification(
                          'Напоминание о задаче',
                          'Тестовое уведомление от Todowka',
                          'test-notification'
                        )
                        if (!ok) {
                          addToast({
                            title: 'Напоминание о задаче',
                            body: 'Тестовое уведомление от Todowka',
                            type: 'info',
                          })
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    >
                      Отправить тестовое уведомление
                    </button>
                  )}
                </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">О приложении</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Версия:</strong> 1.0.0</p>
              <p><strong>Название:</strong> Todowka</p>
              <p>Приложение для управления задачами с поддержкой PWA</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Управление данными</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Сбросить все настройки интерфейса (фильтры, сворачивание разделов, открытые вкладки и т.д.)
                </p>
                <button
                  onClick={() => {
                    if (confirm('Сбросить все настройки интерфейса?')) {
                      Object.keys(localStorage)
                        .filter(key => key.startsWith('ui-'))
                        .forEach(key => localStorage.removeItem(key))
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                >
                  Сбросить настройки интерфейса
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Редактирование профиля</h2>
          
          {profileError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              Профиль успешно обновлён
            </div>
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Имя пользователя
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Часовой пояс
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Выберите часовой пояс для корректного отображения времени в напоминаниях и дедлайнах
              </p>
              
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {POPULAR_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.name}
                  </option>
                ))}
              </select>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Или введите свой часовой пояс (IANA формат, например: Europe/Moscow)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTimezone}
                    onChange={(e) => setCustomTimezone(e.target.value)}
                    placeholder="Europe/Moscow"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customTimezone.trim()) {
                        setTimezone(customTimezone.trim())
                        setCustomTimezone('')
                      }
                    }}
                    className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                  >
                    Применить
                  </button>
                </div>
              </div>

              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Текущий часовой пояс:</strong> {timezone}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Управление пользователями</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Всего: 0</p>
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Нет пользователей</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Управление пользователями</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Всего: {users.length}</p>

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Пользователь
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Часовой пояс
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Роль
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Дата регистрации
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {u.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {u.username}
                        {currentUser.id === u.id && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">(Вы)</span>
                        )}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                {u.timezone || 'Europe/Moscow'}
              </td>
              <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        Активен
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        Заблокирован
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                        Администратор
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                        Пользователь
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    {currentUser.id !== u.id && !u.is_admin && (
                      <div className="flex justify-end gap-2">
                        {u.is_active ? (
                          <button
                            onClick={() => handleBlock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : 'Блокировать'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblock(u.id)}
                            disabled={actionLoading === u.id}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : 'Разблокировать'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={actionLoading === u.id}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 disabled:opacity-50"
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
  return <SettingsContent />
}
