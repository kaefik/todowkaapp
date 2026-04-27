import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGS } from '../i18n'

const LANGUAGE_LABELS: Record<string, { flag: string; name: string }> = {
  ru: { flag: '🇷🇺', name: 'Русский' },
  en: { flag: '🇬🇧', name: 'English' },
}

interface OnboardingLanguageProps {
  onSelect: (language: string) => void
}

export function OnboardingLanguage({ onSelect }: OnboardingLanguageProps) {
  const { t } = useTranslation('onboarding')
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (lang: string) => {
    setSelected(lang)
    i18n.changeLanguage(lang)
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('stepLanguage')}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {t('stepLanguageDesc')}
        </p>
      </div>

      <div className="flex gap-4 w-full max-w-md">
        {SUPPORTED_LANGS.map((lang) => {
          const info = LANGUAGE_LABELS[lang]
          if (!info) return null
          const isSelected = selected === lang
          return (
            <button
              key={lang}
              type="button"
              onClick={() => handleSelect(lang)}
              className={`flex-1 rounded-xl border-2 p-6 text-center transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-4xl">{info.flag}</div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {info.name}
              </div>
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
        {t('next')}
      </button>
    </div>
  )
}
