import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { sessionsApi } from '../../api/sessions'
import { ConfirmDialog } from '../ConfirmDialog'

interface RevokeAllButtonProps {
  onRevoked: () => void
}

export function RevokeAllButton({ onRevoked }: RevokeAllButtonProps) {
  const { t } = useTranslation('sessions')
  const sessionId = useAuthStore((s) => s.sessionId)
  const addToast = useToastStore((s) => s.addToast)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const handleConfirm = async () => {
    if (!sessionId) return
    setIsRevoking(true)
    try {
      await sessionsApi.revokeAllSessions(sessionId)
      addToast({ title: t('revokeAllSuccess'), body: '', type: 'success' })
      onRevoked()
    } catch {
      addToast({ title: t('revokeAllError'), body: '', type: 'error' })
    } finally {
      setIsRevoking(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isRevoking}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
      >
        {t('revokeAll')}
      </button>

      <ConfirmDialog
        open={showConfirm}
        title={t('revokeAllConfirmTitle')}
        message={t('revokeAllConfirmMessage')}
        confirmText={t('revokeAll')}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
