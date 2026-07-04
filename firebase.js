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
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── CONFIG FIREBASE (mbote-app) ─────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBiNHcfaE2zI3qxXfKWoN8gnfGhGqRhi_g",
  authDomain:        "mbote-app-2e4ed.firebaseapp.com",
  databaseURL:       "https://mbote-app-2e4ed-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "mbote-app-2e4ed",
  storageBucket:     "mbote-app-2e4ed.firebasestorage.app",
  messagingSenderId: "483321291415",
  appId:             "1:483321291415:web:228bab54e1f956c433ffd2"
};
// ─────────────────────────────────────────────────────────────

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
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastSeen: serverTimestamp(),
      online:   true
    });
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
      await updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() });
    }
    await signOut(auth);
    window.location.href = "index.html";
  } catch (error) {
    console.error("Erreur déconnexion :", error);
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
    await updateDoc(doc(db, "users", uid), { ...data, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── LIKE / MATCH ────────────────────────────────────────────
export async function enregistrerLike(fromUid, toUid, action = "like") {
  try {
    await setDoc(doc(db, "users", fromUid, "vus", toUid), {
      action,
      timestamp: serverTimestamp()
    });

    if (action !== "like" && action !== "superlike") return { success: true, match: false };

    await setDoc(doc(db, "likes", `${fromUid}_${toUid}`), {
      from: fromUid, to: toUid, action, timestamp: serverTimestamp()
    });

    const toUser = await getDoc(doc(db, "users", toUid));
    if (toUser.exists()) {
      await updateDoc(doc(db, "users", toUid), { likes: (toUser.data().likes || 0) + 1 });
    }

    const reverseLike = await getDoc(doc(db, "likes", `${toUid}_${fromUid}`));
    if (reverseLike.exists()) {
      const matchId = [fromUid, toUid].sort().join("_");
      await setDoc(doc(db, "matchs", matchId), {
        users: [fromUid, toUid], timestamp: serverTimestamp(), lastMsg: null
      });
      return { success: true, match: true, matchId };
    }

    return { success: true, match: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── ENVOYER MESSAGE ─────────────────────────────────────────
export async function envoyerMessage(matchId, fromUid, texte) {
  try {
    const msgRef = doc(collection(db, "matchs", matchId, "messages"));
    await setDoc(msgRef, {
      from: fromUid, texte, lu: false, timestamp: serverTimestamp()
    });
    await updateDoc(doc(db, "matchs", matchId), {
      lastMsg: texte, lastMsgTime: serverTimestamp(), lastMsgFrom: fromUid
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ─── PROTECTION PAGE ─────────────────────────────────────────
export function protegerPage(redirectSiNonConnecte = true) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
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
