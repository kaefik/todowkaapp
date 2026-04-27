import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import { OnboardingLanguage } from './OnboardingLanguage'
import { OnboardingTimezone } from './OnboardingTimezone'
import { OnboardingSection } from './OnboardingSection'

const STEPS = 3

export function OnboardingWizard() {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleLanguageSelect = (lang: string) => {
    setLanguage(lang)
    setStep(1)
  }

  const handleTimezoneSelect = (tz: string) => {
    setTimezone(tz)
    setStep(2)
  }

  const handleSectionSelect = async (section: string) => {
    if (!language || !timezone) return
    setIsSaving(true)
    try {
      const updatedUser = await usersApi.updateCurrentUser({
        language,
        timezone,
        default_section: section,
      })
      const { setCurrentUser } = useAuthStore.getState()
      setCurrentUser(updatedUser)
      localStorage.setItem('default-section', section)
      localStorage.setItem('onboarding-complete', 'true')
      navigate(`/${section}`, { replace: true })
    } catch (err) {
      console.error('Failed to save onboarding data:', err)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            Todowka
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {t('progress', { current: step + 1, total: STEPS })}
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step
                  ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
                  : 'w-6 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {step === 0 && <OnboardingLanguage onSelect={handleLanguageSelect} />}
          {step === 1 && <OnboardingTimezone onSelect={handleTimezoneSelect} />}
          {step === 2 && (
            <OnboardingSection onSelect={handleSectionSelect} />
          )}
        </div>

        {isSaving && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
