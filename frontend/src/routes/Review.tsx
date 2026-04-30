import { useEffect, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useReviewStore } from '../stores/reviewStore'
import { ReviewMinimap } from '../components/review/ReviewMinimap'
import { ReviewInboxStep } from '../components/review/ReviewInbox'
import { ReviewProjectsStep } from '../components/review/ReviewProjects'
import { ReviewSomedayStep } from '../components/review/ReviewSomeday'
import { ReviewCompletion } from '../components/review/ReviewCompletion'

export function Review() {
  const { isAuthenticated } = useAuthStore()
  const { t } = useTranslation('review')
  const navigate = useNavigate()
  const { currentStep, isLoading, error, data, fetchData, resetStats } = useReviewStore()

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  useEffect(() => {
    return () => {
      resetStats()
    }
  }, [resetStats])

  const handleCancel = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleCancel])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'inbox':
        return <ReviewInboxStep />
      case 'projects':
        return <ReviewProjectsStep />
      case 'someday':
        return <ReviewSomedayStep />
      case 'completion':
        return <ReviewCompletion onGoHome={handleGoHome} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <ReviewMinimap />
      <div className="flex-1 flex flex-col relative">
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          {t('cancel')}
        </button>
        {renderStep()}
      </div>
    </div>
  )
}