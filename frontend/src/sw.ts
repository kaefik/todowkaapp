interface SWClient {
  navigate(url: string): Promise<SWClient>
  focus(): Promise<SWClient>
}

interface SWClients {
  claim(): Promise<void>
  matchAll(options?: { type?: string; includeUncontrolled?: boolean }): Promise<SWClient[]>
  openWindow(url: string): Promise<SWClient | null>
}

interface SWFetchEvent extends Event {
  readonly request: Request
  respondWith(response: Promise<Response> | Response): void
}

interface SWNotificationEvent extends Event {
  readonly notification: Notification & { data?: { url?: string; taskId?: string } }
  waitUntil(promise: Promise<unknown>): void
}

interface SWPushEvent extends Event {
  readonly data: { text(): string; json(): unknown } | null
  waitUntil(promise: Promise<unknown>): void
}

interface SWExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void
}

interface SWRegistration {
  showNotification(title: string, options?: NotificationOptions): Promise<void>
}

interface SWGlobalScope {
  readonly clients: SWClients
  readonly registration: SWRegistration
  addEventListener(type: 'install', listener: (ev: SWExtendableEvent) => void): void
  addEventListener(type: 'activate', listener: (ev: SWExtendableEvent) => void): void
  addEventListener(type: 'fetch', listener: (ev: SWFetchEvent) => void): void
  addEventListener(type: 'notificationclick', listener: (ev: SWNotificationEvent) => void): void
  addEventListener(type: 'push', listener: (ev: SWPushEvent) => void): void
  skipWaiting(): Promise<void>
}

const sw = self as unknown as SWGlobalScope

sw.addEventListener('install', () => {
  console.log('[SW] Install event')
  sw.skipWaiting()
})

sw.addEventListener('activate', (event: SWExtendableEvent) => {
  console.log('[SW] Activate event')
  event.waitUntil(sw.clients.claim())
})

sw.addEventListener('fetch', (event: SWFetchEvent) => {
  const url = new URL(event.request.url)

  if (url.pathname === '/offline.html') {
    event.respondWith(fetch(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch((): Promise<Response> => {
        return caches.match('/offline.html') as Promise<Response>
      })
    )
    return
  }
})

sw.addEventListener('notificationclick', (event: SWNotificationEvent) => {
  event.notification.close()

  const url = event.notification.data?.url

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: SWClient[]) => {
      if (clients.length > 0) {
        const client = clients[0]!
        if (url) {
          client.navigate(url)
        }
        return client.focus()
      }
      return sw.clients.openWindow(url || '/')
    })
  )
})

sw.addEventListener('push', (event: SWPushEvent) => {
  const data = event.data?.text()
  if (!data) return

  try {
    const message = JSON.parse(data) as { body?: string; title?: string; data?: { taskId?: string; url?: string } }
    const options: NotificationOptions = {
      body: message.body || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'todowka-notification',
      data: message.data || {},
      requireInteraction: false,
    }

    if (message.data?.taskId) {
      options.data = { ...options.data, taskId: message.data.taskId }
    }

    sw.registration.showNotification(message.title || 'Todowka', options)
  } catch (error) {
    console.error('[SW] Failed to parse push message:', error)
  }
})
