// Web Push: 푸시 수신 시 알림 표시
self.addEventListener('push', function (event) {
  if (!event.data) return
  try {
    const data = event.data.json()
    const title = data.title || 'WhereHere'
    const options = {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: 'wherehere-notification',
      renotify: true,
    }
    event.waitUntil(self.registration.showNotification(title, options))
  } catch (_) {
    event.waitUntil(
      self.registration.showNotification('WhereHere', { body: event.data.text() || '새 알림' })
    )
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      if (clientList.length) clientList[0].focus()
      else if (self.clients.openWindow) self.clients.openWindow('/')
    })
  )
})
