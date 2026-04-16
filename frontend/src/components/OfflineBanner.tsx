import { useEffect, useState } from 'react'
import { useToastStore } from '../stores/toastStore'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      useToastStore.getState().addToast({
        title: 'Сеть восстановлена',
        body: 'Данные синхронизированы',
        type: 'success'
      })
    }

    const handleOffline = () => {
      setIsOffline(true)
      useToastStore.getState().addToast({
        title: 'Вы офлайн',
        body: 'Работаем с кэшированными данными',
        type: 'error'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white py-2 px-4 text-center z-50">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl">🔌</span>
        <span className="font-medium">Вы офлайн — работаем с кэшированными данными</span>
      </div>
    </div>
  )
}
