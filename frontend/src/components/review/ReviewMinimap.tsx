import { useTranslation } from 'react-i18next'
import { useReviewStore, type ReviewStep, type SectionProgress } from '../../stores/reviewStore'

interface SectionConfig {
  step: ReviewStep
  labelKey: string
  icon: string
  color: {
    bg: string
    border: string
    badge: string
    progressBg: string
    progressFill: string
    text: string
  }
}

const SECTIONS: SectionConfig[] = [
  {
    step: 'inbox',
    labelKey: 'stepInbox',
    icon: '📥',
    color: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-400 dark:border-blue-500',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
      progressBg: 'bg-blue-100 dark:bg-blue-900',
      progressFill: 'bg-blue-500 dark:bg-blue-400',
      text: 'text-blue-700 dark:text-blue-300',
    },
  },
  {
    step: 'projects',
    labelKey: 'stepProjects',
    icon: '📁',
    color: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-400 dark:border-green-500',
      badge: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
      progressBg: 'bg-green-100 dark:bg-green-900',
      progressFill: 'bg-green-500 dark:bg-green-400',
      text: 'text-green-700 dark:text-green-300',
    },
  },
  {
    step: 'someday',
    labelKey: 'stepSomeday',
    icon: '🔮',
    color: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-400 dark:border-purple-500',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300',
      progressBg: 'bg-purple-100 dark:bg-purple-900',
      progressFill: 'bg-purple-500 dark:bg-purple-400',
      text: 'text-purple-700 dark:text-purple-300',
    },
  },
  {
    step: 'completion',
    labelKey: 'stepDone',
    icon: '✅',
    color: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-400 dark:border-gray-500',
      badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      progressBg: 'bg-gray-100 dark:bg-gray-900',
      progressFill: 'bg-gray-500 dark:bg-gray-400',
      text: 'text-gray-700 dark:text-gray-300',
    },
  },
]

function getProgressForStep(
  step: ReviewStep,
  inboxProgress: SectionProgress,
  projectsProgress: SectionProgress,
  somedayProgress: SectionProgress,
): SectionProgress {
  switch (step) {
    case 'inbox':
      return inboxProgress
    case 'projects':
      return projectsProgress
    case 'someday':
      return somedayProgress
    case 'completion':
      return { processed: 1, total: 1 }
  }
  return { processed: 0, total: 0 }
}

function ProgressBar({ progress, colorClass, trackClass }: { progress: SectionProgress; colorClass: string; trackClass: string }) {
  const pct = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
  return (
    <div className={`h-1.5 rounded-full ${trackClass}`}>
      <div className={`h-full rounded-full transition-all duration-300 ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function ReviewMinimap() {
  const { t } = useTranslation('review')
  const currentStep = useReviewStore((s) => s.currentStep)
  const setStep = useReviewStore((s) => s.setStep)
  const inboxProgress = useReviewStore((s) => s.inboxProgress)
  const projectsProgress = useReviewStore((s) => s.projectsProgress)
  const somedayProgress = useReviewStore((s) => s.somedayProgress)
  const data = useReviewStore((s) => s.data)

  const stepsOrder: ReviewStep[] = ['inbox', 'projects', 'someday', 'completion']

  const isSectionComplete = (step: ReviewStep): boolean => {
    const progress = getProgressForStep(step, inboxProgress, projectsProgress, somedayProgress)
    return progress.total > 0 && progress.processed >= progress.total
  }

  const isStepReached = (step: ReviewStep): boolean => {
    const currentIndex = stepsOrder.indexOf(currentStep)
    const stepIndex = stepsOrder.indexOf(step)
    return stepIndex <= currentIndex
  }

  const totalProcessed =
    inboxProgress.processed + projectsProgress.processed + somedayProgress.processed
  const totalItems =
    inboxProgress.total + projectsProgress.total + somedayProgress.total
  const overallPct = totalItems > 0 ? Math.round((totalProcessed / totalItems) * 100) : 0

  const projectsWithoutNext = data?.active_projects?.filter((p) => !p.has_next_action).length ?? 0

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col gap-2 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
        {t('minimapTitle')}
      </h3>

      {SECTIONS.map((section) => {
        const isActive = currentStep === section.step
        const isComplete = isSectionComplete(section.step)
        const progress = getProgressForStep(section.step, inboxProgress, projectsProgress, somedayProgress)
        const reached = isStepReached(section.step)

        return (
          <button
            key={section.step}
            onClick={() => setStep(section.step)}
            className={`w-full text-left rounded-lg p-3 transition-all border-2 ${
              isActive
                ? `${section.color.bg} ${section.color.border}`
                : reached
                  ? 'border-transparent bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
                  : 'border-transparent bg-gray-100 dark:bg-gray-800/50 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`flex items-center gap-1.5 text-sm font-medium ${isActive ? section.color.text : 'text-gray-700 dark:text-gray-300'}`}>
                <span>{section.icon}</span>
                {t(section.labelKey)}
              </span>
              {isComplete ? (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300 text-xs font-bold">
                  ✓
                </span>
              ) : (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${section.color.badge}`}>
                  {progress.processed}/{progress.total}
                </span>
              )}
            </div>
            <ProgressBar
              progress={progress}
              colorClass={section.color.progressFill}
              trackClass={section.color.progressBg}
            />

            {section.step === 'projects' && projectsWithoutNext > 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {t('minimapWithoutNext', { count: projectsWithoutNext })}
              </p>
            )}
          </button>
        )
      })}

      <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('minimapOverall')}
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {totalProcessed} {t('minimapOf')} {totalItems}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
