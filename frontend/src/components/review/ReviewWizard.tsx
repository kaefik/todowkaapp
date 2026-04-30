import { useTranslation } from 'react-i18next'

const STEP_TITLES = ['review:stepInbox', 'review:stepProjects', 'review:stepSomeday', 'review:stepDone']

interface ReviewWizardProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onComplete: () => void
  canGoBack: boolean
  canGoNext: boolean
  isLastStep: boolean
  isCompleting: boolean
  children: React.ReactNode
}

export function ReviewWizard({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  canGoBack,
  canGoNext,
  isLastStep,
  isCompleting,
  children,
}: ReviewWizardProps) {
  const { t } = useTranslation('review')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {t('title')}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('progress', { current: currentStep + 1, total: totalSteps })}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= currentStep
                  ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
                  : 'w-6 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {STEP_TITLES.map((titleKey, i) => (
            <span
              key={i}
              className={`text-sm font-medium transition-colors ${
                i === currentStep
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : i < currentStep
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              {t(titleKey)}
            </span>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {children}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400
              hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('back')}
          </button>

          {isLastStep ? (
            <button
              onClick={onComplete}
              disabled={isCompleting}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
                bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
                transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isCompleting && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {t('complete')}
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
                bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600
                transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t('next')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
