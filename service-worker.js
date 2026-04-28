// Service Worker pour VIRUS PWA
// CACHE_VERSION : a bumper a chaque release importante pour forcer le refresh
var CACHE_VERSION = 'virus-v3.3.8';

// SDK Firebase (cross-origin) : doit etre cache pour que l'app demarre offline
var FIREBASE_SDK = [
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
];

// Shell pre-cache a l'install pour pouvoir lancer l'app offline meme si l'utilisateur
// installe la PWA et passe offline immediatement apres.
var CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/favicon.svg',
  '/assets/écran_de_chargement.png',
  // CSS
  '/css/base.css',
  '/css/components.css',
  '/css/friends.css',
  '/css/game.css',
  '/css/hud.css',
  '/css/lobby.css',
  '/css/meeting.css',
  '/css/menu.css',
  '/css/minigames.css',
  '/css/passe.css',
  '/css/responsive.css',
  // JS
  '/js/config.js',
  '/js/translation.js',
  '/js/account.js',
  '/js/api.js',
  '/js/bots.js',
  '/js/cameras.js',
  '/js/chat.js',
  '/js/comments.js',
  '/js/decorations.js',
  '/js/emotes.js',
  '/js/firebase-sync.js',
  '/js/friends.js',
  '/js/game.js',
  '/js/meeting.js',
  '/js/minigames.js',
  '/js/missions.js',
  '/js/music.js',
  '/js/passe.js',
  '/js/player.js',
  '/js/replay.js',
  '/js/roles.js',
  '/js/shop.js',
  '/js/skins.js',
  '/js/stats.js',
  '/js/ui.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      // Pre-cache local
      var localPromises = CORE_ASSETS.map(function(url) {
        return cache.add(url).catch(function() {});
      });
      // Pre-cache SDK Firebase (cross-origin → mode no-cors pour eviter CORS errors)
      var sdkPromises = FIREBASE_SDK.map(function(url) {
        return fetch(url, { mode: 'no-cors' }).then(function(resp) {
          return cache.put(url, resp);
        }).catch(function() {});
      });
      return Promise.all(localPromises.concat(sdkPromises));
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
  // Ne pas intercepter les RPC Firebase live (Firestore / Auth / Realtime)
  // → ces endpoints DOIVENT echouer naturellement quand offline pour que le code
  //   passe en mode degrade. Mais on doit cacher le SDK gstatic (statique).
  if (url.indexOf('firestore.googleapis.com') >= 0 ||
      url.indexOf('firebaseio.com') >= 0 ||
      url.indexOf('identitytoolkit.googleapis.com') >= 0 ||
      url.indexOf('securetoken.googleapis.com') >= 0 ||
      url.indexOf('firebaseinstallations.googleapis.com') >= 0) {
    return;
  }
  // Ne pas intercepter les requetes non-GET
  if (event.request.method !== 'GET') return;

  // Detecte si la requete est une page HTML (navigation ou .html)
  var isHTML = event.request.mode === 'navigate' ||
               (event.request.headers.get('accept') || '').indexOf('text/html') >= 0 ||
               url.indexOf('.html') >= 0;

  event.respondWith(
    caches.open(CACHE_VERSION).then(function(cache) {
      // HTML : NETWORK-FIRST → toujours frais quand online, cache en fallback offline
      if (isHTML) {
        return fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cache.match(event.request).then(function(c) {
            return c || cache.match('/index.html');
          });
        });
      }
      // Autres assets : STALE-WHILE-REVALIDATE → cache immediat + maj en arriere-plan
      return cache.match(event.request).then(function(cached) {
        var networkFetch = fetch(event.request).then(function(response) {
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cached || null;
        });
        return cached || networkFetch;
      });
    })
  );
});
