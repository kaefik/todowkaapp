import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 1 | 2 | 3

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const { t } = useTranslation('settings')
  const navigate = useNavigate()
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const addToast = useToastStore((s) => s.addToast)

  const [step, setStep] = useState<Step>(1)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleClose = () => {
    setStep(1)
    setPassword('')
    setConfirmText('')
    setError(null)
    setLoading(false)
    onClose()
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError(null)
    setStep(2)
  }

  const handleStep3 = async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteAccount(password)
      addToast({ title: t('deleteAccountDeleted'), body: '', type: 'success' })
      handleClose()
      navigate('/login', { replace: true })
    } catch (err) {
      if (err instanceof Error && err.message === 'Неверный пароль') {
        setError(t('deleteAccountWrongPassword'))
        setStep(1)
        setPassword('')
      } else {
        setError(err instanceof Error ? err.message : t('deleteAccountError'))
      }
    } finally {
      setLoading(false)
    }
  }

  const itemsWillBeDeleted = [
    t('deleteAccountWillDeleteTasks'),
    t('deleteAccountWillDeleteProjects'),
    t('deleteAccountWillDeleteAreas'),
    t('deleteAccountWillDeleteContexts'),
    t('deleteAccountWillDeleteTags'),
    t('deleteAccountWillDeleteNotifications'),
    t('deleteAccountWillDeleteVerbs'),
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('deleteAccountStep1Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('deleteAccountStep1Text')}
            </p>
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleStep1}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('deleteAccountPassword')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t('deleteAccountCancel')}
                </button>
                <button
                  type="submit"
                  disabled={!password}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('deleteAccountContinue')}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              {t('deleteAccountStep2Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('deleteAccountWillDelete')}
            </p>
            <ul className="space-y-1 mb-4">
              {itemsWillBeDeleted.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('deleteAccountBack')}
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                {t('deleteAccountUnderstand')}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t('deleteAccountStep3Title')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('deleteAccountStep3Text')}
            </p>
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t('deleteAccountStep3Placeholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('deleteAccountBack')}
              </button>
              <button
                type="button"
                onClick={handleStep3}
                disabled={confirmText !== 'УДАЛИТЬ' || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '...' : t('deleteAccountFinalBtn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
