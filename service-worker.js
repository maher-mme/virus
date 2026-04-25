// Service Worker pour VIRUS PWA
// CACHE_VERSION : a bumper a chaque release importante pour forcer le refresh
var CACHE_VERSION = 'virus-v3.2.7';
var ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon.svg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(ASSETS_TO_CACHE).catch(function() {});
    })
  );
  // Ne pas skipWaiting auto : on attend le message du client (controle propre)
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        if (key !== CACHE_VERSION) return caches.delete(key);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  // Ne pas intercepter Firebase / API externes
  if (url.indexOf('firestore') >= 0 || url.indexOf('firebase') >= 0 || url.indexOf('googleapis') >= 0 || url.indexOf('gstatic') >= 0) {
    return;
  }
  // Ne pas intercepter les requetes non-GET
  if (event.request.method !== 'GET') return;
  // Network-first : toujours essayer le reseau d'abord pour avoir la derniere version
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_VERSION).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/');
      });
    })
  );
});
