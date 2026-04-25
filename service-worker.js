// Service Worker pour VIRUS PWA
// Strategie : network-first avec fallback cache pour rester a jour
var CACHE_VERSION = 'virus-v3.1.6';
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
    }).then(function() { return self.skipWaiting(); })
  );
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
  // Ne pas intercepter les requetes Firebase (toujours network)
  var url = event.request.url;
  if (url.indexOf('firestore') >= 0 || url.indexOf('firebase') >= 0 || url.indexOf('googleapis') >= 0) {
    return;
  }
  // Network-first avec fallback cache
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
