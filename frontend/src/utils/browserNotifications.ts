const STORAGE_KEY = 'ui-browser-notifications-enabled'

export type BrowserNotificationPermission = 'default' | 'granted' | 'denied'

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): BrowserNotificationPermission {
  if (!isSupported()) return 'denied'
  return Notification.permission as BrowserNotificationPermission
}

export function isEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setEnabled(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {}
}

export async function requestPermission(): Promise<BrowserNotificationPermission> {
  if (!isSupported()) return 'denied'
  const result = await Notification.requestPermission()
  return result as BrowserNotificationPermission
}

export interface ShowOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  onClick?: () => void
}

export async function show(options: ShowOptions): Promise<boolean> {
  if (!isSupported() || getPermission() !== 'granted' || !isEnabled()) {
    return false
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(options.title, {
        body: options.body,
        icon: '/icon-192x192.png',
        tag: options.tag,
        data: { url: window.location.href },
      })
      return true
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: '/icon-192x192.png',
      tag: options.tag,
    })

    if (options.onClick) {
      notification.onclick = () => {
        window.focus()
        notification.close()
        options.onClick!()
      }
    }

    await new Promise<boolean>((resolve) => {
      notification.onshow = () => resolve(true)
      notification.onerror = () => {
        notification.close()
        resolve(false)
      }
      setTimeout(() => {
        notification.close()
        resolve(true)
      }, 10000)
    })

    return true
  } catch {
    return false
  }
}

export async function showReminder(taskTitle: string, taskId?: string): Promise<boolean> {
  return show({
    title: 'Напоминание о задаче',
    body: taskTitle,
    tag: taskId ? `reminder-${taskId}` : undefined,
    onClick: () => {
      if (taskId) {
        window.location.hash = `/tasks?editTaskId=${taskId}`
      }
    },
  })
}
