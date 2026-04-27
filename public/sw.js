// Service Worker — enables Android install prompt + basic offline shell
const CACHE = 'pep-trt-v1'

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(['/', '/logo.png', '/manifest.json'])
    )
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Network-first for API/Firebase calls, cache-first for static assets
  if (e.request.url.includes('firebase') || e.request.url.includes('googleapis')) {
    return // let Firebase handle its own requests
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
