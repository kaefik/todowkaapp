import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const SECTIONS = [
  { key: 'inbox', icon: '📥' },
  { key: 'active', icon: '⚡' },
  { key: 'today', icon: '📅' },
  { key: 'tomorrow', icon: '📆' },
  { key: 'next', icon: '➡️' },
  { key: 'waiting', icon: '⏳' },
  { key: 'someday', icon: '🔮' },
  { key: 'projects', icon: '📂' },
]

interface OnboardingSectionProps {
  onSelect: (section: string) => void
}

export function OnboardingSection({ onSelect }: OnboardingSectionProps) {
  const { t } = useTranslation('onboarding')
  const { t: tNav } = useTranslation('nav')
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepSection')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepSectionDesc')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
        {SECTIONS.map(({ key, icon }) => {
          const isSelected = selected === key
          const label = tNav(key === 'next' ? 'nextActions' : key === 'waiting' ? 'waitingFor' : key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {label}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        className="mt-4 rounded-lg bg-indigo-600 dark:bg-indigo-500 px-8 py-3 text-white font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {t('start')}
      </button>
    </div>
  )
}
