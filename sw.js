// ============================================================
//  MBOTE — sw.js (Service Worker PWA + FCM)
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const CACHE_NAME = 'mbote-v3';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/connexion.html',
  '/inscription.html',
  '/swipe.html',
  '/messages_v2.html',
  '/profil.html',
  '/firebase.js',
  '/manifest.json'
];

// ─── FIREBASE CONFIG ──────────────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyBiNHcfaE2zI3qxXfKWoN8gnfGhGqRhi_g",
  authDomain:        "mbote-app-2e4ed.firebaseapp.com",
  projectId:         "mbote-app-2e4ed",
  storageBucket:     "mbote-app-2e4ed.firebasestorage.app",
  messagingSenderId: "483321291415",
  appId:             "1:483321291415:web:228bab54e1f956c433ffd2"
});

const messaging = firebase.messaging();

// ─── INSTALLATION ─────────────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return Promise.allSettled(
        FILES_TO_CACHE.map(function(url) {
          return cache.add(url).catch(function() {});
        })
      );
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATION ───────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// ─── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Ignorer tout ce qui n'est pas http/https
  if (!url.startsWith('http')) return;

  // Ignorer Firebase, Google, et autres APIs externes
  if (url.includes('firebase') || url.includes('googleapis') ||
      url.includes('gstatic') || url.includes('firebaseapp') ||
      event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      // Ne mettre en cache que les réponses valides de notre domaine
      if (response && response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          try { cache.put(event.request, clone); } catch(e) {}
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || caches.match('/index.html');
      });
    })
  );
});

// ─── NOTIFICATIONS FCM EN ARRIÈRE-PLAN ───────────────────
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Notification reçue en arrière-plan:', payload);

  var data  = payload.notification || payload.data || {};
  var title = data.title || '❤️ Mbote — Nouveau message !';
  var body  = data.body  || 'Tu as reçu un nouveau message.';
  var icon  = '/icon-192.png';
  var url   = (payload.data && payload.data.url) || '/messages_v2.html';

  var options = {
    body:    body,
    icon:    icon,
    badge:   icon,
    vibrate: [200, 100, 200],
    data:    { url: url },
    actions: [
      { action: 'open',   title: '💬 Voir le message' },
      { action: 'ignore', title: 'Ignorer' }
    ]
  };

  return self.registration.showNotification(title, options);
});

// ─── CLIC SUR NOTIFICATION ────────────────────────────────
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'ignore') return;

  var url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/messages_v2.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) { list[i].focus(); list[i].navigate(url); return; }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
