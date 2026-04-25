import { useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToastStore } from '../stores/toastStore'

export function UpdateNotification() {
  const { t } = useTranslation('notifications')
  const { needRefresh, updateServiceWorker } = useRegisterSW()
  const addToast = useToastStore((s) => s.addToast)
  const removeToast = useToastStore((s) => s.removeToast)
  const toasts = useToastStore((s) => s.toasts)
  const toastIdRef = useRef<string | null>(null)

  const needRefreshValue = needRefresh[0]

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true)
  }, [updateServiceWorker])

  useEffect(() => {
    if (!needRefreshValue) return

    const existingUpdate = toasts.find((t) => t.type === 'update')
    if (existingUpdate) return

    const id = addToast({
      title: t('newVersionAvailable'),
      body: t('updateApp'),
      type: 'update',
      onAction: handleUpdate,
    })
    toastIdRef.current = id
  }, [needRefreshValue, addToast, toasts, handleUpdate, t])

  useEffect(() => {
    if (!needRefreshValue && toastIdRef.current) {
      removeToast(toastIdRef.current)
      toastIdRef.current = null
    }
  }, [needRefreshValue, removeToast])

  return null
}
