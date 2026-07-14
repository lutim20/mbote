// ============================================================
//  MBOTE — notifications.js
//  Badge de messages non lus sur toutes les pages
//  Inclure dans swipe.html, profil.html, index.html
// ============================================================

import { auth, db, onAuthStateChanged } from "./firebase.js";
import {
  collection, query, where, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── INITIALISER LE BADGE ────────────────────────────────────
export function initNotifBadge() {
  onAuthStateChanged(auth, function(user) {
    if (!user) return;
    listenUnread(user.uid);
  });
}

// ─── ÉCOUTER LES MESSAGES NON LUS ────────────────────────────
function listenUnread(uid) {
  try {
    // Charger tous les matchs de l'utilisateur
    var q = query(collection(db, "matchs"), where("users", "array-contains", uid));

    onSnapshot(q, function(matchSnap) {
      var totalUnread = 0;
      var pending     = matchSnap.docs.length;

      if (pending === 0) {
        updateBadge(0);
        return;
      }

      matchSnap.docs.forEach(function(matchDoc) {
        var msgQ = query(
          collection(db, "matchs", matchDoc.id, "messages"),
          where("from", "!=", uid),
          where("lu", "==", false)
        );

        getDocs(msgQ).then(function(msgSnap) {
          totalUnread += msgSnap.size;
          pending--;
          if (pending === 0) updateBadge(totalUnread);
        }).catch(function() {
          pending--;
          if (pending === 0) updateBadge(totalUnread);
        });
      });
    });
  } catch(e) {
    console.error("Erreur notifications:", e);
  }
}

// ─── METTRE À JOUR LE BADGE ──────────────────────────────────
function updateBadge(count) {
  // Supprimer les anciens badges
  document.querySelectorAll('.notif-badge').forEach(function(b) { b.remove(); });

  if (count === 0) return;

  // Trouver tous les liens vers messages
  var msgLinks = document.querySelectorAll('a[href*="messages"]');
  msgLinks.forEach(function(link) {
    link.style.position = 'relative';
    var badge = document.createElement('span');
    badge.className = 'notif-badge';
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.cssText = [
      'position:absolute',
      'top:-4px',
      'right:-4px',
      'background:#E8394A',
      'color:#fff',
      'font-size:10px',
      'font-weight:800',
      'min-width:16px',
      'height:16px',
      'border-radius:50px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:0 4px',
      'font-family:Nunito,sans-serif',
      'pointer-events:none',
      'z-index:10'
    ].join(';');
    link.appendChild(badge);
  });

  // Mettre à jour le titre de la page
  if (count > 0) {
    var title = document.title;
    if (!title.startsWith('(')) {
      document.title = '(' + count + ') ' + title;
    }
  }
}
