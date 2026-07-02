## Module 11 — Déploiement (avec ou sans EAS)

### Préparer l'app pour la publication

Avant toute publication réelle, il faut mettre `app.json` en ordre (identité, version, icône, splash) et gérer proprement les variables d'environnement et les secrets. C'est une étape indispensable.

### L'identité dans `app.json`

Le fichier `app.json` porte l'identité de l'application sous la clé `expo`. Structure de base pour une publication :

```json
{
  "expo": {
    "name": "NotezTout",
    "slug": "noteztout",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "ios": { "bundleIdentifier": "com.tonnom.noteztout", "buildNumber": "1" },
    "android": { "package": "com.tonnom.noteztout", "versionCode": 1 }
  }
}
```

- `name` : nom affiché de l'app.
- `slug` : identifiant projet Expo.
- `version` : version visible.
- `orientation` : ex. `portrait`.
- `icon` : chemin vers l'icône.
- `ios.bundleIdentifier` et `android.package` : identifiants d'application uniques (format reverse-DNS, ex. `com.tonnom.noteztout`). Ils sont **définitifs** une fois publiés.
- `ios.buildNumber` (string) et `android.versionCode` (nombre) : compteurs de build.

### Version visible vs compteurs techniques

Distinction fondamentale entre la version lue par l'utilisateur et les compteurs internes :

- `version` → la version **lue par l'utilisateur** (ex. `1.0.0`).
- `buildNumber` (iOS) / `versionCode` (Android) → compteurs **techniques**.
- Chaque envoi au store doit **les incrémenter**.
- Sinon le store **refuse** deux builds identiques (deux builds avec le même numéro sont rejetés).
- EAS peut les gérer **automatiquement** (voir `autoIncrement`).

### Icône et écran de démarrage (splash)

- Icône : image **carrée**, **1024 × 1024 px** recommandé.
- Le splash (écran de démarrage) se configure via le plugin `expo-splash-screen` (SDK 56).

```json
"plugins": [
  ["expo-splash-screen", {
    "image": "./assets/splash.png",
    "backgroundColor": "#ffffff",
    "imageWidth": 200
  }]
]
```

### La règle d'or des secrets

- Ce qui est **public** peut vivre dans le code.
- Ce qui est **secret** n'y entre **jamais**.

### Variables publiques : préfixe `EXPO_PUBLIC_`

Les variables préfixées `EXPO_PUBLIC_` sont **injectées et visibles dans le bundle**. Elles conviennent aux valeurs publiables (ex. URL Supabase et clé `anon`).

Fichier `.env` à la racine (à ajouter au `.gitignore`) :

```
# .env  (à la racine — à ajouter au .gitignore)
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Lecture dans le code via `process.env` :

```ts
// lib/supabase.ts
const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
```

- Le préfixe `EXPO_PUBLIC_` → injecté **et visible** dans le bundle.
- Parfait pour l'URL et la clé `anon`, qui sont **publiables**.

### Les vrais secrets vivent ailleurs

Un vrai secret vit dans **l'environnement de build EAS**, jamais dans le dépôt :

```bash
# Un secret vit dans l'environnement de build EAS, jamais dans le dépôt :
eas env:create --environment production \
  --name MA_CLE_SECRETE --value "ma-valeur" --visibility secret
```

Point de sécurité : une clé secrète poussée sur GitHub est **compromise dès la première seconde** — même supprimée ensuite.

### Checklist avant de compiler

- `name`, `slug`, `version` renseignés.
- `ios.bundleIdentifier` et `android.package` définis (**et définitifs**).
- Icône et splash en place.
- Variables publiques en `EXPO_PUBLIC_`, secrets **hors** du code.
- `.env` dans `.gitignore`.

### Comprendre les coûts d'EAS et les alternatives

#### Les deux factures à distinguer

Il faut distinguer deux types de coûts :

**EAS (build / submit)** :
- Encaissé par Expo.
- Tier gratuit, puis abonnement.
- Contournable (build local).

**Compte développeur** :
- Encaissé par Apple / Google.
- Apple 99 $/an · Google 25 $ unique.
- **Obligatoire pour publier** (non contournable).

#### Ce que couvre le tier gratuit d'EAS

- Un **nombre limité** de builds par mois.
- En **file d'attente partagée** (temps d'attente plus longs).
- **Largement suffisant** pour apprendre et publier.
- On ne compile que quelques fois par version.
- Rappel : le JS se met à jour **sans rebuild** (via OTA).

#### Les alternatives à EAS

| Étape | Alternative sans EAS |
|-------|----------------------|
| Compiler | `expo prebuild` + Xcode / Android Studio |
| Soumettre | Dépôt **manuel** dans les consoles |
| Mettre à jour | `expo-updates` **auto-hébergé** |

Compiler en local : **gratuit et illimité**, mais nécessite l'outillage natif (et un Mac pour iOS).

#### Décision : EAS ou pas ?

| Situation | Recommandation |
|-----------|----------------|
| Vous débutez, première app | EAS (tier gratuit) |
| Pas de Mac, vous visez iOS | EAS (compile dans le cloud) |
| Builds très fréquents / équipe | EAS payant ou local |
| Vous refusez tout service tiers | Local + dépôt manuel |

Par défaut : commencer avec EAS, apprendre le local pour savoir s'en passer.

### Compiler son app : EAS Build ou en local

Objectif : produire un vrai build de production (le fichier qu'on envoie aux stores), dans le cloud avec EAS Build ou en local.

#### Les profils de build (`eas.json`)

```json
"build": {
  "development": { "developmentClient": true, "distribution": "internal" },
  "preview": { "distribution": "internal" },
  "production": { "autoIncrement": true }
}
```

- `development` → le dev build (client de développement).
- `preview` → « comme en prod », mais **test interne** (`.apk`).
- `production` → le build **destiné aux stores**.

#### `autoIncrement`

Avec `"autoIncrement": true` :

- EAS incrémente seul `buildNumber` (iOS) / `versionCode` (Android).
- À **chaque** build de production.
- Le store ne refuse plus jamais deux builds identiques.
- On ne touche plus à ces compteurs **à la main**.

#### Voie A — EAS Build (cloud)

```bash
eas build --platform android --profile production   # → .aab
eas build --platform ios --profile production        # → .ipa
eas build --platform all --profile production        # les deux
```

- La compilation tourne sur les serveurs d'Expo.
- EAS gère la **signature** (certificats iOS, keystore Android).
- 1ʳᵉ fois : accepter de **générer et stocker les credentials**.
- Formats produits : `.aab` (Android), `.ipa` (iOS).

#### Voie B — Compiler en local

```bash
# Option 1 : projet natif puis outillage natif
npx expo prebuild
npx expo run:android --variant release
npx expo run:ios --configuration Release

# Option 2 : le pipeline EAS tourne sur votre machine
eas build --platform android --profile production --local
```

- **Gratuit et illimité**, mais Android Studio / Xcode (+ Mac) requis.
- La **signature**, c'est **vous** qui la gérez.
- Le flag `--local` fait tourner le pipeline EAS sur la machine locale.

#### EAS Build ou local : le comparatif

**EAS Build** :
- Outillage : **aucun**.
- Signature : gérée par EAS.
- iOS sans Mac : oui.
- Coût : tier gratuit puis payant.
- Idéal : démarrer, publier vite.

**Build local** :
- Outillage : Android Studio / Xcode (+ Mac).
- Signature : à votre charge.
- iOS sans Mac : non.
- Coût : gratuit, illimité.
- Idéal : indépendance, gros volume.

### Soumettre aux stores : EAS Submit ou manuellement

Envoyer le build (`.aab` / `.ipa`) sur le Play Store et l'App Store.

#### Prérequis côté stores

- Un **compte développeur** (Apple 99 $/an, Google 25 $).
- L'app **créée** dans la console (Play Console / App Store Connect).
- Une **fiche** : nom, description, captures, catégorie.
- Une **politique de confidentialité**.
- La fiche est **revue** — un store refuse une fiche vide.

#### Voie A — EAS Submit

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

- Android → **clé de compte de service Google** à fournir.
- iOS → **clé d'API App Store Connect** (pas de Mac requis).

Compiler puis soumettre dans la foulée avec `--auto-submit` :

```bash
# Compiler PUIS soumettre dans la foulée :
eas build --auto-submit -p android --profile production
```

#### Voie B — Dépôt manuel

| Plateforme | Manipulation |
|------------|--------------|
| Android | Play Console → créer une release → téléverser le `.aab` |
| iOS | `.ipa` via **Transporter** (macOS) ou App Store Connect |

Côté iOS, un **Mac est nécessaire** pour cette étape — c'est la friction qu'EAS Submit supprime.

#### La revue, puis la publication

Flux : Binaire déposé + fiche complète → Soumis pour revue → Décision → si **Validé** : publication immédiate ou planifiée ; si **Refusé** : motif à corriger, puis re-soumission.

#### EAS Submit ou manuel

| Critère | EAS Submit | Dépôt manuel |
|---------|-----------|--------------|
| Mac requis pour iOS | non | oui (Transporter) |
| Mise en place | Clé d'accès | Téléversement à la main |
| Automatisable | oui (`--auto-submit`) | non (à chaque fois) |
| Idéal pour | Livraisons répétées | Un dépôt ponctuel |

### Livrer des correctifs sans repasser par les stores (EAS Update / OTA)

Objectif : pousser un correctif JavaScript directement sur les appareils, sans nouvelle soumission, grâce aux mises à jour **over-the-air (OTA)** d'EAS Update — en connaissant la limite à ne pas dépasser.

#### JS oui, natif non (la limite fondamentale)

- Une OTA livre votre **JavaScript et vos assets**.
- Code natif → **nouveau build** + nouvelle soumission.

#### Installer et configurer

```bash
npx expo install expo-updates
eas update:configure
```

`eas update:configure` ajoute deux notions clés :
- la `runtimeVersion` — la « **compatibilité native** » d'un build.
- les **canaux** (`channel`) — `preview`, `production`…

#### Ce que la commande écrit dans `app.json`

```json
{
  "expo": {
    "runtimeVersion": { "policy": "appVersion" },
    "updates": { "url": "https://u.expo.dev/<ton-project-id>" }
  }
}
```

- Rien à taper à la main.
- `runtimeVersion` **filtre quelles updates un build accepte** (une update ne s'applique qu'aux builds de `runtimeVersion` compatible).

#### Publier une mise à jour

```bash
eas update --channel production \
  --message "Corrige le libellé du bouton d'ajout"
```

Flux : JS corrigé → `eas update` → Serveurs Expo → Appareils du canal → application au **prochain démarrage**.

#### Tester sur `preview` avant `production`

**Canal `preview`** :
- Lié à vos **builds internes**.
- Vous validez la correction.
- Aucun utilisateur réel touché.

**Canal `production`** :
- Lié au build **publié**.
- Diffusion à **tous**.
- Un bug se propage **vite**.

Bonne pratique : publier d'abord sur `preview`, valider, puis sur `production`.

#### Et sans EAS Update ?

- `expo-updates` peut pointer vers **votre propre serveur**.
- C'est l'**auto-hébergement**.
- Il faut servir manifestes + assets au bon format, gérer la signature.
- Faisable mais **avancé** — pour une vraie raison de ne pas dépendre d'EAS.

#### Quand utiliser quoi

| Type de changement | Outil |
|--------------------|-------|
| Texte, style, logique JS, correctif | EAS Update (OTA) |
| Lib **native**, plugin, SDK Expo | Nouveau build + soumission |
| Icône / permissions natives | Nouveau build + soumission |

### Surveiller les crashs et erreurs en production (Sentry)

Objectif : brancher Sentry pour être prévenu des crashs réels des utilisateurs, avec la pile d'appels lisible. Une app publiée sans monitoring est une app aveugle.

#### Le problème du crash en prod

**En dev** :
- L'erreur s'affiche dans **votre** console.
- Vous voyez la stack tout de suite.
- Vous corrigez sur le champ.

**En prod** :
- L'erreur est sur **un autre téléphone**.
- Vous n'en savez **rien**.
- Au mieux : un avis une étoile.

#### Le flux de remontée Sentry

Crash sur le téléphone → App instrumentée par Sentry → envoi vers le **DSN** → Sentry.io → Crash + stack + appareil + version.

#### Installer avec l'assistant

```bash
npx @sentry/wizard@latest -i reactNative
```

L'assistant installe le paquet, configure le plugin, ajoute le code d'init.
- Paquet : `@sentry/react-native`.
- Ajoute le plugin `@sentry/react-native/expo` à `app.json`.

#### Initialiser au démarrage

```tsx
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://exemple@oXXXX.ingest.sentry.io/XXXX",
  // En dev, on évite le bruit local :
  enabled: !__DEV__,
});

function RootLayout() {
  // … ta navigation et tes providers …
}

export default Sentry.wrap(RootLayout);
```

- `Sentry.init({ dsn, enabled })` : le `dsn` est l'adresse d'envoi ; `enabled: !__DEV__` désactive Sentry en développement pour éviter le bruit local.
- `Sentry.wrap(RootLayout)` : on enveloppe le composant racine exporté.

#### Source maps : une stack lisible

Sans source maps, la stack est illisible (code minifié) :

```
TypeError
  at a.b (index.js:1:8423)
  at c.d (index.js:1:9102)
```

Avec source maps, la stack pointe le vrai code source :

```
TypeError
  at addNote (NotesProvider.tsx:42)
  at onPress (NoteForm.tsx:18)
```

#### Le token Sentry, en secret EAS

Même réflexe que les secrets : le token vit dans l'environnement de build, jamais dans le dépôt.

```bash
# Même réflexe que la leçon 11-01 : un secret vit dans l'env de build :
eas env:create --name SENTRY_AUTH_TOKEN --visibility secret
```

- Sans `--environment`, la CLI demande l'environnement.
- Jamais dans le code, jamais dans le dépôt.

#### Vérifier que ça remonte

```tsx
<Button
  title="Tester Sentry"
  onPress={() => {
    throw new Error("Crash de test");
  }}
/>
```

- À déclencher sur un **build de production** (Sentry est off en dev via `enabled: !__DEV__`).
- L'erreur apparaît dans le dashboard **en quelques secondes**.
- `Sentry.captureException(error)` dans un `catch` → permet de suivre aussi les erreurs **rattrapées** (non fatales), pas seulement les crashs.

### Le pipeline complet, vu d'ensemble

Vue d'ensemble du cycle de déploiement :

`Code + app.json` → `EAS Build` → `Submit / dépôt` → `Revue store` → `App publiée` → (`correctif JS`) → `EAS Update`

Les correctifs JS post-publication court-circuitent le cycle stores via EAS Update (OTA), tandis que tout changement natif repart de `EAS Build`.


