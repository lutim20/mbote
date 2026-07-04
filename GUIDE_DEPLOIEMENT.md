# 🚀 Guide Déploiement — Mbote
## Mise en ligne sur Vercel + Domaine + Checklist finale

---

## ÉTAPE 1 — Préparer le dossier projet (5 min)

Assure-toi que ton dossier `mbote/` contient tous ces fichiers :

```
mbote/
├── index.html          ✅ Page d'accueil
├── inscription.html    ✅ Inscription 4 étapes
├── connexion.html      ✅ Connexion Firebase
├── swipe.html          ✅ Page swipe
├── messages_v2.html    ✅ Messagerie temps réel
├── profil.html         ✅ Profil utilisateur
├── premium.html        ✅ Page Premium
├── firebase.js         ✅ Backend Firebase
├── sw.js               ✅ Service Worker (notifications)
└── vercel.json         ← À créer (voir ci-dessous)
```

---

## ÉTAPE 2 — Créer vercel.json

Crée un fichier `vercel.json` à la racine du projet :

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/swipe",     "destination": "/swipe.html" },
    { "source": "/messages",  "destination": "/messages_v2.html" },
    { "source": "/profil",    "destination": "/profil.html" },
    { "source": "/premium",   "destination": "/premium.html" },
    { "source": "/connexion", "destination": "/connexion.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",        "value": "DENY" },
        { "key": "X-XSS-Protection",       "value": "1; mode=block" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Service-Worker-Allowed", "value": "/" },
        { "key": "Cache-Control",          "value": "no-cache" }
      ]
    }
  ]
}
```

---

## ÉTAPE 3 — Publier sur GitHub (5 min)

```bash
# Dans ton dossier mbote/
git init
git add .
git commit -m "🍒 Mbote — première version"
git branch -M main

# Crée un repo sur github.com puis :
git remote add origin https://github.com/TON_PSEUDO/mbote.git
git push -u origin main
```

---

## ÉTAPE 4 — Déployer sur Vercel (3 min)

1. Va sur **https://vercel.com** → "Sign up" avec ton compte GitHub
2. Clique **"Add New Project"**
3. Sélectionne ton repo `mbote`
4. **Framework Preset** : `Other` (pas Next.js, pas React)
5. **Root Directory** : `.` (laisse vide)
6. Clique **"Deploy"** 🚀

➡️ En 2 minutes, ton site est en ligne sur :
`https://mbote.vercel.app`

---

## ÉTAPE 5 — Ajouter un domaine personnalisé (10 min)

### Option A — Domaine .cd (Congo)
1. Va sur **https://www.nic.cd** (registrar officiel .cd)
2. Cherche `mbote.cd` (prix ≈ 15$/an)
3. Achète et configure les DNS

### Option B — Domaine .app (international)
1. Va sur **https://www.namecheap.com**
2. Cherche `mbote.app` (prix ≈ 12€/an)
3. Achète le domaine

### Configurer le domaine dans Vercel :
1. Console Vercel → ton projet → **Settings → Domains**
2. Ajoute `mbote.cd` ou `mbote.app`
3. Vercel te donne 2 enregistrements DNS à configurer chez ton registrar :
   ```
   Type A     @      76.76.21.21
   Type CNAME www    cname.vercel-dns.com
   ```
4. Attends 5-30 minutes pour la propagation DNS
5. HTTPS est activé automatiquement ✅

### Ajouter le domaine à Firebase :
1. Console Firebase → Authentication → Settings → **Domaines autorisés**
2. Ajoute `mbote.cd` ou ton domaine

---

## ÉTAPE 6 — Configurer Stripe (paiement) (15 min)

1. Créer un compte sur **https://stripe.com**
2. Dashboard Stripe → **Products → Add product**
   ```
   Produit : Mbote Premium Mensuel
   Prix : 1,99€ récurrent mensuel
   Currency : EUR (ou CDF si disponible)
   → Copie le Price ID : price_XXXXXXXXXX
   
   Produit : Mbote Premium 6 mois
   Prix : 5,99€ récurrent / 6 mois
   → Copie le Price ID : price_YYYYYYYYYY
   ```

3. Installe Stripe.js dans `premium.html` :
   ```html
   <script src="https://js.stripe.com/v3/"></script>
   ```

4. Crée un backend (Firebase Cloud Functions) :
   ```bash
   npm install -g firebase-tools
   firebase init functions
   ```

5. Dans `functions/index.js` :
   ```javascript
   const stripe = require('stripe')('sk_live_XXXXX');
   
   exports.createSubscription = functions.https.onCall(async (data, context) => {
     if (!context.auth) throw new Error('Non authentifié');
     
     const { paymentMethodId, priceId } = data;
     const uid = context.auth.uid;
     
     // Créer ou récupérer le customer Stripe
     const userDoc = await admin.firestore().doc(`users/${uid}`).get();
     let customerId = userDoc.data().stripeCustomerId;
     
     if (!customerId) {
       const customer = await stripe.customers.create({
         email: context.auth.token.email,
         payment_method: paymentMethodId,
         invoice_settings: { default_payment_method: paymentMethodId }
       });
       customerId = customer.id;
       await admin.firestore().doc(`users/${uid}`).update({ stripeCustomerId: customerId });
     }
     
     // Créer la subscription
     const subscription = await stripe.subscriptions.create({
       customer: customerId,
       items: [{ price: priceId }],
       expand: ['latest_invoice.payment_intent']
     });
     
     // Activer Premium dans Firestore
     await admin.firestore().doc(`users/${uid}`).update({
       premium: true,
       premiumUntil: new Date(subscription.current_period_end * 1000),
       stripeSubId: subscription.id
     });
     
     return { success: true, subscriptionId: subscription.id };
   });
   ```

6. Déployer les functions :
   ```bash
   firebase deploy --only functions
   ```

---

## ÉTAPE 7 — Configurer Google Analytics (5 min)

1. Va sur **https://analytics.google.com**
2. Crée une propriété pour `mbote.cd`
3. Copie le code de suivi (G-XXXXXXXXXX)
4. Ajoute dans le `<head>` de chaque page :
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

---

## ✅ CHECKLIST FINALE — Avant le lancement

### Technique
- [ ] Firebase configuré (Auth + Firestore + Storage)
- [ ] Règles Firestore appliquées
- [ ] `firebase.js` avec vraie config (pas de placeholder)
- [ ] Service Worker (`sw.js`) en place
- [ ] Site déployé sur Vercel
- [ ] Domaine configuré + HTTPS actif
- [ ] Domaine ajouté dans Firebase Auth

### Contenu
- [ ] Page d'accueil (textes, stats, profils exemple)
- [ ] CGU et politique de confidentialité rédigées
- [ ] Photos de profil exemples remplacées par de vraies photos
- [ ] Villes congolaises complètes dans les formulaires

### Paiement
- [ ] Compte Stripe créé
- [ ] Produits Premium créés avec leurs Prix
- [ ] Firebase Functions déployées
- [ ] Test paiement avec carte test `4242 4242 4242 4242`

### Lancement
- [ ] Partager sur WhatsApp, Facebook, Instagram
- [ ] Créer une page Instagram @mbote_dating
- [ ] Contacter des communautés congolaises en ligne
- [ ] Demander à 10 amis de créer un profil pour "amorcer" la base

---

## 📊 Suivi des coûts mensuels

| Service | Plan gratuit | Quand upgrader |
|---|---|---|
| Vercel | Gratuit | À 100 000 requêtes/mois |
| Firebase Auth | Gratuit (10K/mois) | À 10 000 utilisateurs |
| Firestore | Gratuit (50K lectures/jour) | À 1 000 utilisateurs actifs |
| Firebase Storage | 5 Go gratuit | À partir de 1 000 photos |
| Stripe | 1,4% + 0,25€/transaction | Dès le premier paiement |
| Domaine .cd | ~15$/an | — |

**Total estimé pour les 6 premiers mois : 0€** (si < 1 000 utilisateurs)

---

## 🎉 Félicitations !

Mbote est maintenant un site de rencontres complet avec :
- ✅ Frontend responsive 5 pages
- ✅ Authentification Firebase
- ✅ Base de données temps réel
- ✅ Messagerie instantanée
- ✅ Système de likes et matchs
- ✅ Notifications push
- ✅ Abonnement Premium (Stripe)
- ✅ Déployé en ligne

**Prochaines évolutions possibles :**
- 📱 Application mobile (React Native ou PWA)
- 📍 Géolocalisation précise
- 🎥 Appels vidéo entre matchs
- 🤖 Algorithme de matching intelligent
- 🌍 Extension à d'autres pays africains
