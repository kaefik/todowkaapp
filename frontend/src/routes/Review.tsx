import { useState, useEffect, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { reviewApi, type ReviewStatus } from '../api/review'
import { ReviewWizard } from '../components/review/ReviewWizard'
import { ReviewProjects } from '../components/review/ReviewProjects'
import { ReviewCompletion, type ReviewStats } from '../components/review/ReviewCompletion'

const TOTAL_STEPS = 4

export function Review() {
  const { isAuthenticated } = useAuthStore()
  const { t } = useTranslation('review')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<ReviewStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<ReviewStats>({
    inboxProcessed: 0,
    projectsWithoutNext: 0,
    somedayActivated: 0,
  })

  useEffect(() => {
    if (!isAuthenticated) return

    reviewApi
      .getStatus()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [isAuthenticated])

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const handleNext = useCallback(() => {
    setStep((s) => {
      const next = Math.min(TOTAL_STEPS - 1, s + 1)
      if (s === 0) {
        setStats((prev) => ({
          ...prev,
          inboxProcessed: data?.inbox_tasks.length ?? 0,
        }))
      }
      if (s === 2) {
        setStats((prev) => ({
          ...prev,
          somedayActivated: 0,
        }))
      }
      return next
    })
  }, [data?.inbox_tasks.length])

  const handleCancel = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true })
  }, [navigate])

  const handleProjectsComplete = useCallback(() => {
    const withoutNext = (data?.active_projects ?? []).filter((p) => !p.has_next_action).length
    setStats((prev) => ({
      ...prev,
      projectsWithoutNext: withoutNext,
    }))
    handleNext()
  }, [data?.active_projects, handleNext])

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

  return (
    <div className="relative">
      <button
        onClick={handleCancel}
        className="absolute top-4 right-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
      >
        {t('cancel')}
      </button>

      <ReviewWizard
        currentStep={step}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        onComplete={handleGoHome}
        canGoBack={step > 0 && step < 3}
        canGoNext={step < TOTAL_STEPS - 1}
        isLastStep={step === TOTAL_STEPS - 1}
        isCompleting={false}
      >
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('inboxTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('inboxDescription', { count: data?.inbox_count ?? 0 })}
            </p>
            {data?.inbox_tasks.length ? (
              <ul className="space-y-2">
                {data.inbox_tasks.map((task) => (
                  <li
                    key={task.id}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('inboxEmpty')}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <ReviewProjects
            projects={data?.active_projects ?? []}
            onComplete={handleProjectsComplete}
          />
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('somedayTitle')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('somedayDescription', { count: data?.someday_tasks.length ?? 0 })}
            </p>
            {data?.someday_tasks.length ? (
              <ul className="space-y-2">
                {data.someday_tasks.map((task) => (
                  <li
                    key={task.id}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('somedayEmpty')}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <ReviewCompletion
            stats={stats}
            onGoHome={handleGoHome}
          />
        )}
      </ReviewWizard>
    </div>
  )
}
