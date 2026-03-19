const CACHE_NAME = 'ups-webapp-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const scope = self.registration.scope
      await cache.addAll([
        new URL('', scope),
        new URL('index.html', scope),
        new URL('manifest.webmanifest', scope),
        new URL('favicon.svg', scope),
        new URL('pwa-icon.svg', scope),
      ])
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const scope = self.registration.scope

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(new URL('index.html', scope))),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})
