import { Outlet, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { InstallPrompt } from './InstallPrompt'

export function AppLayout() {
  const { user, logout, isAuthenticated } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                Todowka
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              {isAuthenticated && user && (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors hidden sm:block"
                  >
                    {user.username}
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <InstallPrompt />
    </div>
  )
}
