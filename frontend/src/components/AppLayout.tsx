import { Outlet, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useGtdCounts } from '../hooks/useGtdCounts'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { InstallPrompt } from './InstallPrompt'
import { NotificationBell } from './NotificationBell'
import { StatusLight } from './StatusLight'
import { SearchOverlay } from './SearchOverlay'

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { counts } = useGtdCounts()
  const { user, logout } = useAuthStore()
  const { t } = useTranslation('nav')
  const [showTaskCounts] = useLocalStorage('show-task-counts', true)

  const gtdItems = [
    { path: '/inbox', label: t('inbox'), count: counts.inbox },
    { path: '/active', label: t('active'), count: counts.active },
    { path: '/today', label: t('today'), count: counts.today },
    { path: '/tomorrow', label: t('tomorrow'), count: counts.tomorrow },
    { path: '/next', label: t('nextActions'), count: counts.next },
    { path: '/waiting', label: t('waitingFor'), count: counts.waiting },
    { path: '/someday', label: t('someday'), count: counts.someday },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="flex flex-col h-full">
      <div className="flex-1 space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('groupGtd')}
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
            {showTaskCounts && item.count > 0 && (
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
            {t('groupView')}
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
          <span>{t('completed')}</span>
          {showTaskCounts && counts.completed > 0 && (
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
          <span>{t('trash')}</span>
          {showTaskCounts && counts.trash > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {counts.trash}
            </span>
          )}
        </Link>

        <div className="px-3 pt-4 pb-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t('groupManage')}
          </p>
        </div>
        {[
          { path: '/projects', label: t('projects') },
          { path: '/contexts', label: t('contexts') },
          { path: '/areas', label: t('areas') },
          { path: '/tags', label: t('tags') },
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
          {t('settings')}
        </Link>
        <button
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
        >
          {t('logout')}
        </button>
      </div>
    </nav>
  )
}

export function AppLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('nav')

  useEffect(() => {
    const editTaskId = searchParams.get('editTaskId')
    if (editTaskId && isAuthenticated && location.pathname !== '/tasks') {
      navigate(`/tasks?editTaskId=${editTaskId}`, { replace: true })
    }
  }, [searchParams, isAuthenticated, location.pathname, navigate])

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
      {/* Десктопная шапка */}
      <header className="hidden lg:flex sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 items-center h-16 px-6">
        <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
          Todowka <StatusLight />
        </Link>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="ml-8 flex-1 max-w-md text-left px-3 py-1.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {t('searchPlaceholder')}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
            {user?.username}
          </Link>
        </div>
      </header>

      {/* Мобильная шапка */}
      <header className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 lg:hidden sticky top-0 z-30">
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
          <Link to="/" className="ml-3 text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
            Todowka <StatusLight />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <NotificationBell />
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 pb-0">
              <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center" onClick={() => setSidebarOpen(false)}>
                Todowka <StatusLight />
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
            <div className="flex-1 overflow-y-auto p-4">
              <SidebarContent onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <aside className="hidden lg:block fixed top-16 bottom-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <SidebarContent />
      </aside>

      <main className="p-4 lg:ml-64 lg:p-8">
        <Outlet />
      </main>

      <InstallPrompt />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
