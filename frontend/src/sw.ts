declare let self: ServiceWorkerGlobalScope

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
