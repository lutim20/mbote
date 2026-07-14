// ============================================================
//  MBOTE — firebase.js
//  ✅ Configuré avec les vraies clés du projet mbote-app
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── CONFIG FIREBASE ─────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBiNHcfaE2zI3qxXfKWoN8gnfGhGqRhi_g",
  authDomain:        "mbote-app-2e4ed.firebaseapp.com",
  databaseURL:       "https://mbote-app-2e4ed-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "mbote-app-2e4ed",
  storageBucket:     "mbote-app-2e4ed.firebasestorage.app",
  messagingSenderId: "483321291415",
  appId:             "1:483321291415:web:228bab54e1f956c433ffd2"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ─── INSCRIPTION ─────────────────────────────────────────────
export async function inscrire(email, password, profileData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await updateProfile(user, { displayName: profileData.prenom });
    await setDoc(doc(db, "users", user.uid), {
      uid:       user.uid,
      prenom:    profileData.prenom,
      email:     email,
      dob:       profileData.dob,
      genre:     profileData.genre,
      ville:     profileData.ville,
      recherche: profileData.recherche,
      fruit:     profileData.fruit,
      bio:       profileData.bio || "",
      interests: profileData.interests || [],
      photoURL:  "",
      verified:  false,
      premium:   false,
      likes:     0,
      matchs:    0,
      vues:      0,
      online:    true,
      createdAt: serverTimestamp(),
      lastSeen:  serverTimestamp()
    });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}

// ─── CONNEXION ───────────────────────────────────────────────
export async function connecter(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    try {
      await updateDoc(doc(db, "users", userCredential.user.uid), {
        lastSeen: serverTimestamp(),
        online:   true
      });
    } catch(e) {}
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}

// ─── DÉCONNEXION ─────────────────────────────────────────────
export async function deconnecter() {
  try {
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          online: false,
          lastSeen: serverTimestamp()
        });
      } catch(e) {}
    }
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erreur déconnexion:", error);
  }
}

// ─── RESET MOT DE PASSE ──────────────────────────────────────
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}

// ─── LIRE PROFIL ─────────────────────────────────────────────
export async function getProfil(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) return { success: true, data: snap.data() };
    return { success: false, error: "Profil introuvable" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── METTRE À JOUR PROFIL ────────────────────────────────────
export async function updateProfil(uid, data) {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── LIKE / MATCH ────────────────────────────────────────────
// Version corrigée — détection fiable du like mutuel
export async function enregistrerLike(fromUid, toUid, action) {
  if (!action) action = "like";

  try {
    console.log("Like enregistré:", fromUid, "->", toUid, "action:", action);

    // 1. Marquer comme vu
    await setDoc(doc(db, "vus", fromUid + "_" + toUid), {
      from:      fromUid,
      to:        toUid,
      action:    action,
      timestamp: serverTimestamp()
    });

    // Si dislike → stop
    if (action === "dislike") {
      return { success: true, match: false };
    }

    // 2. Enregistrer le like dans collection "likes"
    await setDoc(doc(db, "likes", fromUid + "_" + toUid), {
      from:      fromUid,
      to:        toUid,
      action:    action,
      timestamp: serverTimestamp()
    });
    console.log("Like sauvegardé dans Firestore");

    // 3. Incrémenter likes reçus
    try {
      const toUserSnap = await getDoc(doc(db, "users", toUid));
      if (toUserSnap.exists()) {
        await updateDoc(doc(db, "users", toUid), {
          likes: (toUserSnap.data().likes || 0) + 1
        });
      }
    } catch(e) { console.error("Erreur update likes:", e); }

    // 4. Vérifier like inverse (like mutuel)
    const reverseId   = toUid + "_" + fromUid;
    const reverseSnap = await getDoc(doc(db, "likes", reverseId));
    console.log("Like inverse existe ?", reverseSnap.exists());

    if (reverseSnap.exists()) {
      // ✅ MATCH !
      const matchId = [fromUid, toUid].sort().join("_");
      console.log("MATCH créé ! matchId:", matchId);

      // Vérifier si le match existe déjà pour éviter les doublons
      const existingMatch = await getDoc(doc(db, "matchs", matchId));
      if (existingMatch.exists()) {
        console.log("Match déjà existant, pas de doublon");
        return { success: true, match: true, matchId: matchId };
      }

      await setDoc(doc(db, "matchs", matchId), {
        users:       [fromUid, toUid],
        timestamp:   serverTimestamp(),
        lastMsg:     null,
        lastMsgTime: null
      });

      // Incrémenter matchs des deux côtés
      try {
        const fromSnap = await getDoc(doc(db, "users", fromUid));
        if (fromSnap.exists()) {
          await updateDoc(doc(db, "users", fromUid), {
            matchs: (fromSnap.data().matchs || 0) + 1
          });
        }
        const toSnap = await getDoc(doc(db, "users", toUid));
        if (toSnap.exists()) {
          await updateDoc(doc(db, "users", toUid), {
            matchs: (toSnap.data().matchs || 0) + 1
          });
        }
      } catch(e) { console.error("Erreur update matchs:", e); }

      return { success: true, match: true, matchId: matchId };
    }

    return { success: true, match: false };

  } catch (error) {
    console.error("Erreur enregistrerLike:", error);
    return { success: false, error: error.message };
  }
}

// ─── ENVOYER MESSAGE ─────────────────────────────────────────
export async function envoyerMessage(matchId, fromUid, texte) {
  try {
    const msgRef = doc(collection(db, "matchs", matchId, "messages"));
    await setDoc(msgRef, {
      from:      fromUid,
      texte:     texte,
      lu:        false,
      timestamp: serverTimestamp()
    });
    await updateDoc(doc(db, "matchs", matchId), {
      lastMsg:     texte,
      lastMsgTime: serverTimestamp(),
      lastMsgFrom: fromUid
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── PROTECTION PAGE ─────────────────────────────────────────
export function protegerPage(redirectSiNonConnecte) {
  if (redirectSiNonConnecte === undefined) redirectSiNonConnecte = true;
  return new Promise(function(resolve) {
    onAuthStateChanged(auth, function(user) {
      if (user) {
        resolve(user);
      } else {
        if (redirectSiNonConnecte) window.location.href = "connexion.html";
        resolve(null);
      }
    });
  });
}

// ─── MESSAGES D'ERREUR ───────────────────────────────────────
function getErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use":   "Cet email est déjà utilisé.",
    "auth/invalid-email":          "Adresse email invalide.",
    "auth/weak-password":          "Mot de passe trop faible (6 caractères minimum).",
    "auth/user-not-found":         "Aucun compte avec cet email.",
    "auth/wrong-password":         "Mot de passe incorrect.",
    "auth/too-many-requests":      "Trop de tentatives. Réessaie plus tard.",
    "auth/network-request-failed": "Erreur réseau. Vérifie ta connexion.",
    "auth/invalid-credential":     "Email ou mot de passe incorrect.",
  };
  return messages[code] || "Une erreur est survenue. Réessaie.";
}

export { auth, db, onAuthStateChanged };
