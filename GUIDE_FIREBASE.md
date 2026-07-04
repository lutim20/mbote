# 🔥 Guide Firebase — Mbote
## Configuration complète étape par étape

---

## ÉTAPE 1 — Créer le projet Firebase (5 min)

1. Va sur **https://console.firebase.google.com**
2. Clique **"Créer un projet"**
3. Nom du projet : `mbote-app`
4. Désactive Google Analytics (pas utile pour l'instant)
5. Clique **"Créer le projet"**

---

## ÉTAPE 2 — Activer Authentication (2 min)

1. Dans le menu gauche → **Authentication**
2. Clique **"Commencer"**
3. Onglet **"Méthode de connexion"**
4. Active **Email/Mot de passe** → Enregistrer

---

## ÉTAPE 3 — Créer la base de données Firestore (3 min)

1. Menu gauche → **Firestore Database**
2. Clique **"Créer une base de données"**
3. Choisis **"Commencer en mode test"** (pour l'instant)
4. Région : **europe-west3** (Frankfurt, plus proche du Congo)
5. Clique **"Activer"**

### Structure des collections à créer :

```
users/
  {uid}/
    prenom: "Amina"
    email: "amina@email.com"
    dob: "1997-03-15"
    genre: "femme"
    ville: "kinshasa"
    recherche: "homme"
    fruit: "🍒 Cerise"
    bio: "Passionnée de musique..."
    interests: ["🎵 Musique", "⚽ Football"]
    photoURL: ""
    verified: false
    premium: false
    likes: 0
    matchs: 0
    vues: 0
    online: true
    createdAt: timestamp
    lastSeen: timestamp

    vus/          ← sous-collection
      {autreUid}/
        action: "like" | "dislike"
        timestamp: ...

likes/
  {fromUid}_{toUid}/
    from: "uid1"
    to: "uid2"
    action: "like" | "superlike"
    timestamp: ...

matchs/
  {uid1}_{uid2}/
    users: ["uid1", "uid2"]
    lastMsg: "Bonjour !"
    lastMsgTime: timestamp
    lastMsgFrom: "uid1"

    messages/     ← sous-collection
      {msgId}/
        from: "uid1"
        texte: "Bonjour !"
        lu: false
        timestamp: ...
```

---

## ÉTAPE 4 — Activer Firebase Storage (2 min)

1. Menu gauche → **Storage**
2. Clique **"Commencer"**
3. Garde le mode test
4. Région : **europe-west3**

---

## ÉTAPE 5 — Récupérer ta config (2 min)

1. Menu gauche → ⚙️ **Paramètres du projet**
2. Descends jusqu'à **"Tes applications"**
3. Clique l'icône **</>** (Web)
4. Nom de l'app : `mbote-web`
5. **NE PAS** cocher Firebase Hosting pour l'instant
6. Copie l'objet `firebaseConfig` qui s'affiche

Il ressemble à ça :
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "mbote-app.firebaseapp.com",
  projectId: "mbote-app",
  storageBucket: "mbote-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijklmnop"
};
```

---

## ÉTAPE 6 — Coller ta config dans firebase.js

Ouvre `firebase.js` et remplace :
```javascript
const firebaseConfig = {
  apiKey:            "REMPLACE_PAR_TA_API_KEY",
  authDomain:        "mbote-app.firebaseapp.com",
  projectId:         "mbote-app",
  storageBucket:     "mbote-app.appspot.com",
  messagingSenderId: "REMPLACE_PAR_TON_SENDER_ID",
  appId:             "REMPLACE_PAR_TON_APP_ID"
};
```
Par ta vraie config copiée à l'étape 5.

---

## ÉTAPE 7 — Appliquer les règles de sécurité

### Firestore :
1. Console Firebase → Firestore → **Règles**
2. Copie-colle le contenu de `firestore.rules` (section Firestore)
3. Clique **Publier**

### Storage :
1. Console Firebase → Storage → **Règles**
2. Copie-colle la section Storage de `firestore.rules` (décommente les `/* */`)
3. Clique **Publier**

---

## ÉTAPE 8 — Tester l'inscription

1. Ouvre `inscription.html` dans ton navigateur
2. Remplis le formulaire et clique "Créer mon profil"
3. Va dans Console Firebase → Authentication → **Utilisateurs**
4. Tu dois voir ton compte apparaître ✅
5. Va dans Firestore → **users** → tu dois voir ton profil ✅

---

## Coût Firebase (plan gratuit Spark)

| Service | Limite gratuite |
|---|---|
| Authentication | 10 000 connexions/mois |
| Firestore | 1 Go stockage, 50K lectures/jour |
| Storage | 5 Go stockage, 1 Go/jour téléchargement |
| Hosting | 10 Go/mois |

➡️ **Largement suffisant pour démarrer et les premiers 1 000 utilisateurs.**

---

## Prochaine étape

Une fois Firebase configuré et testé :
→ **Phase 3** : Messagerie temps réel avec `onSnapshot` (écoute en direct)
→ **Phase 4** : Déploiement sur Vercel + domaine mbote.app
