// ============================================================
//  MBOTE — sw.js  (Service Worker)
//  Notifications push en arrière-plan
//  Placer ce fichier à la RACINE du projet (même niveau que index.html)
// ============================================================

const CACHE_NAME = 'mbote-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/swipe.html',
  '/messages_v2.html',
  '/profil.html',
  '/firebase.js',
];

// ─── INSTALLATION ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des fichiers');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATION ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache :', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH (Cache first pour les assets) ─────────────────────
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes Firebase
  if (event.request.url.includes('firebase') ||
      event.request.url.includes('googleapis')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// ─── NOTIFICATIONS PUSH ──────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body:    data.body    || 'Tu as un nouveau message sur Mbote !',
    icon:    data.icon    || '/icon-192.png',
    badge:   data.badge   || '/badge-72.png',
    image:   data.image   || null,
    vibrate: [200, 100, 200],
    data: {
      url:     data.url     || '/messages_v2.html',
      matchId: data.matchId || null,
    },
    actions: [
      { action: 'reply',  title: '💬 Répondre' },
      { action: 'ignore', title: 'Ignorer' },
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || '🍒 Mbote — Nouveau message !',
      options
    )
  );
});

// ─── CLIC SUR NOTIFICATION ───────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'ignore') return;

  const url = event.notification.data?.url || '/messages_v2.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si l'app est déjà ouverte → focus + naviguer
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Sinon → ouvrir une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── SYNC EN ARRIÈRE-PLAN ────────────────────────────────────
// Envoie les messages mis en file d'attente quand la connexion revient
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Récupérer les messages en attente depuis IndexedDB
  // (à implémenter si nécessaire pour le mode hors-ligne)
  console.log('[SW] Synchronisation des messages en attente...');
}
