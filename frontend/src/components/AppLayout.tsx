import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useGtdCounts } from '../hooks/useGtdCounts'
import { InstallPrompt } from './InstallPrompt'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { counts } = useGtdCounts()
  const { user, logout } = useAuthStore()

  const gtdItems = [
    { path: '/inbox', label: 'Inbox', count: counts.inbox },
    { path: '/next', label: 'Next Actions', count: counts.next },
    { path: '/waiting', label: 'Waiting For', count: counts.waiting },
    { path: '/someday', label: 'Someday / Maybe', count: counts.someday },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            GTD
          </p>
        </div>
        {gtdItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.path)
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>{item.label}</span>
            {item.count > 0 && (
              <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full ${
                isActive(item.path)
                  ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {item.count}
              </span>
            )}
          </Link>
        ))}

        <div className="px-3 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Просмотр
          </p>
        </div>
        <Link
          to="/completed"
          onClick={onNavigate}
          className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive('/completed')
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span>Completed</span>
          {counts.completed > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {counts.completed}
            </span>
          )}
        </Link>
        <Link
          to="/trash"
          onClick={onNavigate}
          className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive('/trash')
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span>Trash</span>
          {counts.trash > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {counts.trash}
            </span>
          )}
        </Link>

        <div className="px-3 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Управление
          </p>
        </div>
        {[
          { path: '/projects', label: 'Проекты' },
          { path: '/contexts', label: 'Контексты' },
          { path: '/areas', label: 'Области' },
          { path: '/tags', label: 'Теги' },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.path)
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 space-y-1">
        <Link
          to="/profile"
          onClick={onNavigate}
          className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          {user?.username}
        </Link>
        <Link
          to="/settings"
          onClick={onNavigate}
          className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        >
          Настройки
        </Link>
        <button
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
        >
          Выйти
        </button>
      </div>
    </nav>
  )
}

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main><Outlet /></main>
        <InstallPrompt />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 lg:hidden">
        <div className="flex items-center h-16 px-4">
          <button
            type="button"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link to="/" className="ml-3 text-xl font-bold text-indigo-600 dark:text-indigo-400">
            Todowka
          </Link>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400" onClick={() => setSidebarOpen(false)}>
                Todowka
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex">
        <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <Link to="/" className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6">
            Todowka
          </Link>
          <SidebarContent />
        </aside>
        <main className="ml-64 flex-1 p-8">
          <Outlet />
        </main>
      </div>

      <main className="lg:hidden p-4">
        <Outlet />
      </main>

      <InstallPrompt />
    </div>
  )
}
