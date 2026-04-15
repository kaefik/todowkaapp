import { useState, useCallback, useEffect } from 'react'
import * as bnApi from '../utils/browserNotifications'

export function useBrowserNotifications() {
  const [enabled, setEnabledState] = useState(bnApi.isEnabled)
  const [permission, setPermission] = useState(bnApi.getPermission)
  const [supported] = useState(bnApi.isSupported)

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'ui-browser-notifications-enabled') {
        setEnabledState(bnApi.isEnabled())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const enable = useCallback(async () => {
    if (!supported) return false

    const perm = await bnApi.requestPermission()
    setPermission(perm)

    if (perm === 'granted') {
      bnApi.setEnabled(true)
      setEnabledState(true)
      return true
    }
    return false
  }, [supported])

  const disable = useCallback(() => {
    bnApi.setEnabled(false)
    setEnabledState(false)
  }, [])

  const showNotification = useCallback(
    (title: string, body: string, tag?: string, onClick?: () => void) => {
      return bnApi.show({ title, body, tag, onClick })
    },
    []
  )

  const showReminder = useCallback((taskTitle: string, taskId?: string) => {
    return bnApi.showReminder(taskTitle, taskId)
  }, [])

  return {
    supported,
    enabled,
    permission,
    enable,
    disable,
    showNotification,
    showReminder,
  }
}
