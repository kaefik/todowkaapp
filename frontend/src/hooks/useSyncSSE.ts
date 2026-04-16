import { useEffect } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useNotificationStore } from '../stores/notificationStore'

interface SyncEventData {
  type: 'task' | 'list' | 'reminder' | 'notification' | 'settings'
  action: 'created' | 'updated' | 'deleted'
  entity_id: string
  user_id: string
  timestamp: string
}

export function useSyncSSE(userId: string | null) {
  const { startSSE, stopSSE, incrementPending, decrementPending } = useSyncStore()
  const refetchNotifications = useNotificationStore((state) => state.refetch)

  useEffect(() => {
    if (!userId) {
      stopSSE()
      return
    }

    const originalHandleSyncEvent = useSyncStore.getState().handleSyncEvent

    const enhancedHandleSyncEvent = (data: SyncEventData) => {
      originalHandleSyncEvent(data)

      incrementPending()

      if (data.type === 'task' || data.type === 'list' || data.type === 'reminder') {
        window.dispatchEvent(new CustomEvent('tasks:refetch'))
      } else if (data.type === 'notification') {
        refetchNotifications()
      }

      setTimeout(() => {
        decrementPending()
      }, 100)
    }

    useSyncStore.setState({ handleSyncEvent: enhancedHandleSyncEvent })

    startSSE(userId)

    return () => {
      stopSSE()
      useSyncStore.setState({ handleSyncEvent: originalHandleSyncEvent })
    }
  }, [userId, startSSE, stopSSE, refetchNotifications, incrementPending, decrementPending])
}
