import { useState, useEffect } from 'react'
import { ProtectedRoute } from '../components/ProtectedRoute'

type Theme = 'light' | 'dark'

function SettingsContent() {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
        <p className="mt-2 text-gray-600">Персонализируйте приложение под себя</p>
      </div>

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
