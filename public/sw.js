const CACHE = 'mmc-shell-v4'
const SHELL = ['/styles.css?v=4.0.0', '/site.js', '/favicon.svg']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') ||
      ['/my-service/', '/appointment/', '/payment/', '/feedback/', '/schedule/', '/prepare/', '/crew/'].includes(url.pathname)) return
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request)))
})
