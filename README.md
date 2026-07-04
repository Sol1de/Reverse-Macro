# ReverseMacro

> Planificateur de **reverse diet** : à partir de tes macros actuelles, d'une cible calorique et d'une durée, l'app génère une montée progressive **semaine par semaine** (calories + protéines / glucides / lipides).

Application mobile **Expo + Supabase**, développée dans le cadre du défi final « React Native pour les développeurs React ».

---

## Le problème

Changer d'objectif physique impose d'adapter sa diète. Le faire sans choquer l'organisme demande un ajustement **progressif et calculé** des apports. La plupart des gens le font approximativement, sans plan défini.

**ReverseMacro** répond à ce besoin : il transforme trois informations simples en un plan hebdomadaire clair et actionnable.

- **Utilisateur cible :** athlète, pratiquant de musculation / fitness, ou toute personne suivant un régime qui veut planifier proprement son changement de diète.
- **Hors périmètre (assumé) :** l'app **ne journalise pas** les repas au quotidien. Elle *génère un plan*, rien de plus.

---

## Fonctionnalités

**Cœur du MVP**
- Saisie du point de départ (protéines / glucides / lipides journaliers), de la cible calorique et de la durée.
- Génération d'un **tableau semaine par semaine** : pour chaque semaine, les quotas journaliers de kcal, protéines (g), glucides (g), lipides (g).
- Progression **linéaire** des calories du point de départ vers la cible ; protéines maintenues à un ratio réglable ; le reste réparti en préservant le ratio glucides/lipides de départ.

**Secondaires**
- Plusieurs plans sauvegardés par compte (un plan par objectif ou par phase).
- Renommer / modifier / supprimer un plan.
- Réglage de la répartition des macro-nutriments.

**Transverses**
- Authentification email / mot de passe.
- Chaque utilisateur ne voit que ses propres plans (RLS Postgres).
- Thème clair / sombre.

---

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Expo SDK 54** (React Native 0.81, React 19), New Architecture + React Compiler |
| Langage | **TypeScript** |
| Navigation | **Expo Router v6** (routage par fichiers, typed routes) |
| Backend (BaaS) | **Supabase** — Auth email/mot de passe, PostgreSQL, **RLS** |
| État serveur / cache | **TanStack Query v5** |
| État session | **React Context** + hook `useSession` |
| Schéma & migrations | **Drizzle ORM** (`drizzle-kit`) |
| Styling | **NativeWind v4** (Tailwind pour RN) |
| Design system | **react-native-reusables** (shadcn-style, `@rn-primitives/*`) |
| Tests | **Jest** (`jest-expo`) + `@testing-library/react-native` |
| Build & livraison | **EAS Build** — build de production `.aab` |

---

## Architecture en bref

**Routage par zones**

Expo Router monte deux groupes : `(auth)` pour la zone non connectée (`sign-in`, `sign-up`) et `(app)/(tabs)` pour la zone connectée (`my-plans`, `new-plan`, `plan-detail`, `account`). Un `SessionProvider` — un React Context au-dessus de `supabase.auth` — expose l'état `{ session, isLoading }`. Le layout racine garde chaque zone via `<Stack.Protected>` et retient le splash natif tant que la session n'est pas résolue. L'écran d'entrée redirige vers `my-plans` si l'utilisateur est connecté, sinon vers `sign-in`.

**Logique métier isolée**

Le calcul du plan vit dans [`lib/generate-reverse-plan.ts`](lib/generate-reverse-plan.ts), la source unique de vérité — une fonction pure, indépendante de l'UI et entièrement testée. Elle interpole linéairement les calories hebdomadaires du point de départ vers la cible, tient les protéines à un ratio réglable (un pourcentage des kcal de la semaine), et répartit le reste entre glucides et lipides en préservant leur ratio de départ. Les entrées sont validées (valeurs finies et positives, ratio entre 0 et 100, durée en semaines entières ≥ 1) — toute entrée invalide lève une `RangeError`. Point clé : la base ne stocke que les paramètres du plan ; le tableau semaine par semaine est recalculé côté client à chaque ouverture, sans jamais persister de donnée dérivée.

**Trois couches de données**

L'état serveur suit trois couches à ne pas court-circuiter. `PlansService` ([`lib/plans-service.ts`](lib/plans-service.ts)) encapsule la table Supabase `plans` et ses opérations (`list`, `get`, `create`, `update`, `remove`) ; c'est le seul endroit qui traduit le snake_case de la base vers le camelCase de l'app, et il injecte lui-même le `user_id`. Au-dessus, les hooks React Query ([`hooks/use-plans.ts`](hooks/use-plans.ts)) gèrent le cache (staleTime de 30 s) et l'invalidation via une *query-key factory*. Les écrans consomment ces hooks, jamais le service directement.

**Données & sécurité**

Le schéma est défini avec Drizzle ORM ([`db/schema.ts`](db/schema.ts)), qui déclare la table `plans` et ses politiques RLS au même endroit. La Row-Level Security est activée : chaque politique restreint les lignes à `auth.uid() = user_id`, donc un utilisateur ne voit que ses propres plans. À l'exécution, l'app parle à Supabase via `@supabase/supabase-js` avec la clé anon (RLS appliquée) ; Drizzle ne sert qu'à la gestion du schéma, jamais aux requêtes de l'app.

**Interface**

L'UI repose sur NativeWind v4 (Tailwind pour React Native) et le design system react-native-reusables. Les couleurs passent par des variables CSS sémantiques, et le thème clair / sombre est piloté par le hook `useColorScheme`.

---

## Démarrage

### Prérequis
- Node.js ≥ 20
- **pnpm** (gestionnaire de paquets du projet — ne pas utiliser npm)
- Un projet **Supabase** (URL + clé publishable/anon)

### Installation

```bash
pnpm install
cp .env.example .env   # puis renseigner les valeurs (voir ci-dessous)
```

### Variables d'environnement

| Variable | Rôle | Portée |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL du projet Supabase | client |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clé publishable / anon | client |
| `EXPO_PUBLIC_KCAL_PER_GRAM_PROTEIN` | kcal/g protéine (= 4) | client |
| `EXPO_PUBLIC_KCAL_PER_GRAM_CARBS` | kcal/g glucide (= 4) | client |
| `EXPO_PUBLIC_KCAL_PER_GRAM_FAT` | kcal/g lipide (= 9) | client |
| `DATABASE_URL` | Connexion Postgres directe | **serveur uniquement** — drizzle-kit, jamais dans l'app |

Les variables `EXPO_PUBLIC_*` sont lues via le singleton typé [`env.ts`](env.ts) (throw au démarrage si une clé requise manque). `DATABASE_URL` est un secret serveur utilisé seulement par les migrations — jamais importé dans le code de l'app.

### Lancer

```bash
pnpm start          # expo start --tunnel
pnpm ios            # simulateur iOS
pnpm android        # émulateur Android
pnpm web            # navigateur
```

---

## Scripts

```bash
pnpm lint           # eslint-config-expo
pnpm test           # jest (jest-expo)
pnpm db:generate    # génère la migration SQL depuis db/schema.ts
pnpm db:migrate     # applique les migrations (générer → migrer ; ne jamais utiliser drizzle-kit push)
```

> ⚠️ **Migrations** : toujours `db:generate` puis `db:migrate`. `drizzle-kit push` n'applique pas les corps de politiques RLS et casse la sécurité — il n'est volontairement pas câblé.

---

## Tests

26 tests unitaires couvrent la logique critique :
- [`lib/generate-reverse-plan.test.ts`](lib/generate-reverse-plan.test.ts) — cas nominal, bornes, validation des entrées, répartition des ratios.
- [`lib/plans-service.test.ts`](lib/plans-service.test.ts) — mapping des données et opérations CRUD.

```bash
pnpm test                                   # tout
pnpm test lib/generate-reverse-plan.test.ts # un fichier
```

---

## Base de données

Schéma défini avec Drizzle dans [`db/schema.ts`](db/schema.ts) (table `plans` + politiques RLS au même endroit). Migrations générées dans [`drizzle/`](drizzle/) — ne jamais éditer à la main.

Colonnes `plans` : `base_calories`, `base_protein`, `base_fat`, `base_carbs`, `target_calories`, `protein_ratio` (%), `week_duration` (semaines).

---

## Build de production & livraison

**Voie A** retenue : build `.aab` de production + plan de publication documenté.

- Config EAS : [`eas.json`](eas.json) (profil `production` → `.aab`).
- Étapes de build et plan de mise en ligne Google Play : **[docs/publication-plan.md](docs/publication-plan.md)**.

```bash
npx eas-cli build --platform android --profile production
```

---

## Documentation

- **[Cahier des charges](docs/scope.md)**
- **[Plan de publication](docs/publication-plan.md)**
- **[Fiche portfolio](docs/portfolio.md)**
- **[Pitch](docs/pitch.md)**

---

## Monétisation

Application **gratuite** (angle assumé). Piste ultérieure : offre pro (plans illimités, historique).

---

## Structure du projet

```
app/            # écrans (Expo Router) — (auth) + (app)/(tabs)
components/ui/  # design system react-native-reusables
db/             # schéma Drizzle + RLS
drizzle/        # migrations SQL générées
hooks/          # hooks React Query (use-plans, …)
lib/            # logique métier (generate-reverse-plan), services, supabase, auth
docs/           # scope, plan de publication, portfolio, pitch, knowledge
```
