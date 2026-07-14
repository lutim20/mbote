// ============================================================
//  MBOTE — sw.js (Service Worker PWA)
//  Cache les fichiers pour mode hors-ligne + installation
// ============================================================

const CACHE_NAME    = 'mbote-v2';
const CACHE_TIMEOUT = 3600; // 1 heure

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/connexion.html',
  '/inscription.html',
  '/swipe.html',
  '/messages_v2.html',
  '/profil.html',
  '/firebase.js',
  '/notifications.js',
  '/manifest.json'
];

// ─── INSTALLATION ─────────────────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Mise en cache des fichiers');
      // On essaie de mettre en cache mais on ignore les erreurs
      return Promise.allSettled(
        FILES_TO_CACHE.map(function(url) {
          return cache.add(url).catch(function(e) {
            console.warn('[SW] Impossible de cacher:', url, e);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATION ───────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(
        keyList.map(function(key) {
          if (key !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ─── FETCH ────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  // Ne pas intercepter Firebase, Google Fonts, extensions
  var url = event.request.url;
  if (url.includes('firebase') ||
      url.includes('googleapis') ||
      url.includes('gstatic') ||
      url.includes('chrome-extension') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // Stratégie Network First : essayer le réseau d'abord
      return fetch(event.request).then(function(response) {
        // Mettre en cache la nouvelle version
        if (response && response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(function() {
        // Si pas de réseau → utiliser le cache
        if (cached) {
          console.log('[SW] Hors-ligne, utilisation du cache:', url);
          return cached;
        }
        // Si pas de cache non plus → page offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ─── NOTIFICATIONS PUSH ───────────────────────────────────────
self.addEventListener('push', function(event) {
  var data = {};
  try { data = event.data.json(); } catch(e) {}

  var options = {
    body:    data.body    || 'Tu as un nouveau message sur Mbote !',
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    vibrate: [200, 100, 200],
    data:    { url: data.url || '/messages_v2.html' },
    actions: [
      { action: 'open',   title: '💬 Voir le message' },
      { action: 'ignore', title: 'Ignorer' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🍒 Mbote — Nouveau message !',
      options
    )
  );
});

// ─── CLIC NOTIFICATION ────────────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'ignore') return;

  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/messages_v2.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
