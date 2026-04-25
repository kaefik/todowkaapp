import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function OfflinePage() {
  const { t } = useTranslation('sync')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('offlinePageTitle')}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {t('offlinePageDescription')}
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            {t('offlinePageFeatures')}
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 text-left space-y-1">
            <li>• {t('offlineFeatureCheck')}</li>
            <li>• {t('offlineFeatureWifi')}</li>
            <li>• {t('offlineFeatureRefresh')}</li>
            <li>• {t('offlineFeatureCached')}</li>
          </ul>
        </div>

        <Link
          to="/"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
        >
          {t('refreshPage')}
        </Link>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
          {t('offlineNote')}
        </p>
      </div>
    </div>
  )
}
