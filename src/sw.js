import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
self.addEventListener('activate', () => self.clients.claim())

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/'),
  new CacheFirst({
    cacheName: 'supabase-storage-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })]
  })
)

registerRoute(
  ({ url }) => url.hostname.endsWith('.jsdelivr.net'),
  new CacheFirst({
    cacheName: 'cdn-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })]
  })
)

self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHES') {
    caches.keys().then(names => Promise.all(names.map(n => caches.delete(n))))
      .then(() => self.clients.matchAll())
      .then(cls => cls.forEach(c => c.postMessage('CACHES_CLEARED')))
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  const showNotif = self.registration.showNotification(data.title || 'Nueva transferencia', {
    body: data.body || 'Tienes una transferencia pendiente por autorizar',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/autorizar', count: data.count || 1 },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  })
  const setBadge = 'setAppBadge' in self.navigator
    ? self.navigator.setAppBadge(data.count || 1)
    : Promise.resolve()
  event.waitUntil(Promise.all([showNotif, setBadge]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/autorizar'
  if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
