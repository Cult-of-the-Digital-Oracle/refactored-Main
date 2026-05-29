// Empty service worker — silences `GET /sw.js 404` noise without registering
// any caching/offline behaviour. If a previously installed SW is still active
// in the browser, this no-op replacement self-unregisters on activation.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister().then(() => self.clients.claim()));
});
