# Plan de publication — ReverseMacro (Voie A)

Référence : [scope.md](scope.md) §Voie de validation — *Voie A retenue : build `.aab` de production + plan de publication documenté.*

Ce document couvre deux livrables :

1. **Génération du build de production `.aab`** via EAS Build (offre gratuite) — étapes à exécuter localement.
2. **Plan de publication** décrivant les étapes qui mèneraient à une mise en ligne réelle sur le Google Play Store.

> Ticket Kaneo : **RM-16** — *Build prod `.aab` + plan de publication (Voie A)*.

---

## 0. Pré-requis

| Élément | Détail |
|---|---|
| Compte Expo (EAS) | Gratuit — https://expo.dev/signup |
| EAS CLI | Installé à la volée via `npx eas-cli` (aucune install globale requise) |
| Workflow | **Managed / CNG** — `/android` et `/ios` sont gitignored et régénérés par EAS via `expo prebuild`. Le build part de `app.json`, pas du dossier `android/` local. |
| Package Android | `dev.slain.reversemacro` (dans `app.json` → `expo.android.package`). **Immuable après le 1er upload sur le Play Store** — à figer avant publication réelle. |
| Config EAS | [`eas.json`](../eas.json) — profil `production` → `android.buildType: "app-bundle"` (génère un `.aab`). |

### Variables d'environnement

`.env` est **gitignored** → il n'est **pas** uploadé dans l'archive de build EAS. Les variables `EXPO_PUBLIC_*` (bundlées dans le client) doivent être déclarées comme **variables d'environnement EAS**, sinon le build produit une app sans URL Supabase ni constantes kcal.

Variables requises côté client :

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_KCAL_PER_GRAM_PROTEIN` (= 4)
- `EXPO_PUBLIC_KCAL_PER_GRAM_CARBS` (= 4)
- `EXPO_PUBLIC_KCAL_PER_GRAM_FAT` (= 9)

> `DATABASE_URL` est un **secret serveur** (drizzle-kit uniquement) — **ne jamais** l'ajouter aux variables EAS ni au bundle client.

---

## 1. Générer le build `.aab` de production

Étapes à exécuter depuis la racine du projet.

```bash
# 1. Se connecter à EAS (interactif — ouvre une session Expo)
npx eas-cli login

# 2. Lier le projet à EAS (crée le projectId dans app.json → expo.extra.eas.projectId)
npx eas-cli init

# 3. Déclarer les variables d'environnement du profil production
#    (à faire une fois ; --visibility plaintext car ce sont des clés publiques client)
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "<url-supabase>" --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "<cle-publishable>" --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_KCAL_PER_GRAM_PROTEIN --value "4" --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_KCAL_PER_GRAM_CARBS --value "4" --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_KCAL_PER_GRAM_FAT --value "9" --visibility plaintext

# 4. Lancer le build de production Android (.aab)
#    Au 1er build, EAS propose de générer le keystore de signature — accepter (géré par EAS).
npx eas-cli build --platform android --profile production
```

- Le build tourne sur les serveurs EAS (file d'attente gratuite). À la fin, l'URL du `.aab` s'affiche et est téléchargeable depuis le dashboard : https://expo.dev/accounts/&lt;compte&gt;/projects/reverseMacro/builds
- Récupérer le `.aab` :
  ```bash
  npx eas-cli build:download --platform android --profile production --latest
  ```

### Vérifications avant build

```bash
pnpm lint          # eslint-config-expo
pnpm test          # jest (jest-expo)
npx eas-cli build:inspect --platform android --profile production   # (optionnel) inspecter la config résolue
```

### Signature (keystore)

- **1er build** : laisser EAS générer et stocker le keystore (« Generate new keystore »). C'est l'app-signing key de référence.
- Sauvegarde : `npx eas-cli credentials` → exporter/consulter le keystore. À conserver hors dépôt (les `*.jks` / `*.p12` sont gitignored).

---

## 2. Plan de publication Google Play (mise en ligne réelle)

Étapes qui mèneraient à une publication réelle — **non exécutées dans la Voie A** (documentation uniquement).

### 2.1 Compte & console

1. Créer un compte **Google Play Console** (frais uniques ~25 USD) : https://play.google.com/console
2. Compléter le profil développeur (identité, coordonnées) — vérification d'identité requise depuis 2023.

### 2.2 Créer l'application

3. **Create app** → nom `ReverseMacro`, langue par défaut, type *App*, gratuite.
4. Renseigner les déclarations obligatoires : **content rating** (questionnaire IARC), **target audience**, **data safety** (déclarer que l'app envoie les données de plan vers Supabase, chiffrées en transit, supprimables), **privacy policy** (URL requise même pour une app simple).
5. **App access** : fournir un compte de test si l'app exige une connexion (c'est le cas — auth Supabase), pour la revue Google.

### 2.3 Fiche Store (Store listing)

6. Titre, description courte + longue, icône 512×512, feature graphic 1024×500, captures d'écran téléphone (min. 2). Catégorie : *Health & Fitness*.

### 2.4 Upload du build

7. **Release → Testing → Internal testing** (recommandé en premier) : créer une release, uploader le `.aab` généré en §1.
   - Alternative automatisée : configurer `eas submit` (voir §2.6).
8. Ajouter les testeurs internes (liste d'emails), diffuser le lien d'opt-in, valider l'installation.
9. Promotion progressive : **Internal → Closed (beta) → Open testing → Production**.

### 2.5 Passage en production

10. **Release → Production** : créer la release à partir du `.aab` validé, remplir les *release notes*, choisir le **staged rollout** (ex. 20 % puis 100 %).
11. Soumettre pour revue. Délai typique : quelques heures à quelques jours. Suivre le statut dans la console.

### 2.6 (Optionnel) Soumission automatisée via EAS

Une fois le compte Play + une clé de service configurés :

```bash
# Config du service account Google (Play Console → API access → JSON key)
npx eas-cli submit --platform android --profile production --latest
```

Le profil `submit.production` de [`eas.json`](../eas.json) est déjà présent (vide → complété avec le chemin de la clé de service au moment de la mise en place).

### 2.7 Mises à jour ultérieures

- Chaque nouvelle version : incrémenter `expo.version` (versionName) ; le **versionCode** est auto-incrémenté (`autoIncrement: true` + `appVersionSource: "remote"` dans `eas.json`).
- Rebuild (`eas build`) → nouveau `.aab` → nouvelle release Play.
- Correctifs JS purs sans nouveau binaire natif : envisager **EAS Update** (OTA) — hors périmètre actuel.

---

## Récapitulatif des artefacts

| Artefact | Emplacement |
|---|---|
| Config build EAS | [`eas.json`](../eas.json) — profil `production` → `.aab` |
| Package Android figé | `app.json` → `expo.android.package` = `dev.slain.reversemacro` |
| Ce plan | `docs/publication-plan.md` |
| Build `.aab` | Généré par EAS (dashboard Expo + `eas build:download`) |
