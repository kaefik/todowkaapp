declare let self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  console.log('[SW] Install event')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname === '/offline.html') {
    event.respondWith(fetch(event.request))
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html')
      })
    )
    return
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url as string | undefined

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        const client = clients[0]
        if (url) {
          client.navigate(url)
        }
        return client.focus()
      }
      return self.clients.openWindow(url || '/')
    })
  )
})

self.addEventListener('push', (event) => {
  const data = event.data?.text()
  if (!data) return

  try {
    const message = JSON.parse(data)
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

    self.registration.showNotification(message.title || 'Todowka', options)
  } catch (error) {
    console.error('[SW] Failed to parse push message:', error)
  }
})
