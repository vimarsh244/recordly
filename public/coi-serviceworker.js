/*
 * Turns on cross origin isolation for pages that a static host serves without
 * the two headers that grant it. With isolation the page may use
 * SharedArrayBuffer, so the multi threaded FFmpeg build runs instead of the
 * single threaded one. That is worth about one thread per processor core on
 * the exports that still need software encoding.
 *
 * The worker only adds headers to its own responses. Nothing leaves the device
 * and no request goes anywhere new. If the host already sends the headers, or
 * if the browser refuses the worker, the app still works, only slower.
 */

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.mode === 'no-cors') return
  // Reading this combination from a service worker throws.
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return

  event.respondWith(
    fetch(request).then((response) => {
      // An opaque response has no readable body, so leave it alone.
      if (response.status === 0) return response
      const headers = new Headers(response.headers)
      headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
      headers.set('Cross-Origin-Opener-Policy', 'same-origin')
      headers.set('Cross-Origin-Resource-Policy', 'cross-origin')
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }),
  )
})
