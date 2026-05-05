import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { sessionsApi, type SessionData } from '../../api/sessions'
import { SessionCard } from './SessionCard'
import { RevokeAllButton } from './RevokeAllButton'

export function SessionList() {
  const { t } = useTranslation('sessions')
  const sessionId = useAuthStore((s) => s.sessionId)
  const addToast = useToastStore((s) => s.addToast)
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadSessions = useCallback(async () => {
    try {
      const data = await sessionsApi.getSessions(sessionId ?? undefined)
      setSessions(data)
    } catch {
      addToast({ title: t('loadError'), body: '', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, addToast, t])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleRevoke = async (id: string) => {
    try {
      await sessionsApi.revokeSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      addToast({ title: t('revokeSuccess'), body: '', type: 'success' })
    } catch {
      addToast({ title: t('revokeError'), body: '', type: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
        {t('noSessions')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <RevokeAllButton onRevoked={loadSessions} />
      </div>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} onRevoke={handleRevoke} />
      ))}
    </div>
  )
}
