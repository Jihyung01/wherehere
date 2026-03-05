const CACHE_NAME = 'wherehere-v1'

// 앱 Shell 캐시 대상
const SHELL_ASSETS = [
  '/',
  '/app-icon.png',
  '/manifest.webmanifest',
]

// ── Install: Shell 자산 사전 캐시 ──────────────────────────────
self.addEventListener('install', function (event) {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS).catch(function () {
        // 일부 캐시 실패해도 설치 계속
      })
    })
  )
})

// ── Activate: 이전 버전 캐시 정리 ─────────────────────────────
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME })
          .map(function (key) { return caches.delete(key) })
      )
    }).then(function () {
      return self.clients.claim()
    })
  )
})

// ── Fetch: 네트워크 우선 + 오프라인 폴백 ──────────────────────
self.addEventListener('fetch', function (event) {
  var req = event.request

  // POST/기타 메서드, chrome-extension, 외부 도메인은 패스스루
  if (req.method !== 'GET') return
  var url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // API 요청: 네트워크 우선, 실패 시 503 반환
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      })
    )
    return
  }

  // _next/static (JS/CSS): 캐시 우선 (불변 자산)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached
        return fetch(req).then(function (res) {
          if (res.ok) {
            var clone = res.clone()
            caches.open(CACHE_NAME).then(function (c) { c.put(req, clone) })
          }
          return res
        })
      })
    )
    return
  }

  // 페이지/기타: 네트워크 우선, 오프라인 시 캐시 폴백
  event.respondWith(
    fetch(req).then(function (res) {
      if (res.ok) {
        var clone = res.clone()
        caches.open(CACHE_NAME).then(function (c) { c.put(req, clone) })
      }
      return res
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match('/')
      })
    })
  )
})

// ── Web Push: 푸시 수신 시 알림 표시 ─────────────────────────
self.addEventListener('push', function (event) {
  if (!event.data) return
  try {
    var data = event.data.json()
    var title = data.title || 'WhereHere'
    var options = {
      body: data.body || '',
      icon: '/app-icon.png',
      badge: '/app-icon.png',
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
