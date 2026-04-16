import { useState } from 'react'
import { usersApi } from '../api/users'
import { useAuthStore } from '../stores/authStore'

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

interface TimezoneSetupModalProps {
  onClose: () => void
}

export function TimezoneSetupModal({ onClose }: TimezoneSetupModalProps) {
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [customTimezone, setCustomTimezone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const updatedUser = await usersApi.updateCurrentUser({ timezone })
      const { setCurrentUser } = useAuthStore.getState()
      setCurrentUser(updatedUser)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set timezone')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black opacity-50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Добро пожаловать!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Выберите ваш часовой пояс для корректного отображения напоминаний и дедлайнов
          </p>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Часовой пояс
              </label>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Или введите свой часовой пояс (IANA формат)
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

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <strong>Выбранный часовой пояс:</strong> {timezone}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-indigo-600 dark:bg-indigo-700 text-white text-sm font-medium rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Сохранение...' : 'Продолжить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
