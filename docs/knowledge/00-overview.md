# React Native pour les développeurs React — Base de connaissances

> Synthèse technique du cours **« React Native pour les développeurs React »** (13 modules).
> Ce document regroupe **les explications, concepts, caractéristiques, APIs et bonnes pratiques** vus dans le cours. Les énoncés d'exercices / TP / devoirs ont été volontairement écartés : seule la connaissance réutilisable est conservée.

Le cours s'appuie sur une application fil rouge, **« NotezTout »** (une app de prise de notes), qui sert d'exemple de bout en bout : navigation, état, persistance, backend, auth, capteurs, offline, notifications, animations, déploiement, tests et monétisation.

---

## La stack technique du cours

| Domaine | Outil / bibliothèque |
|---|---|
| Framework | **Expo** (surcouche outillée de React Native) + **EAS** (builds/soumission/OTA cloud) |
| Langage | **TypeScript** (zéro Java/Swift) |
| Navigation | **Expo Router** (routage basé sur les fichiers) |
| État local / global | `useState`, **React Context** + hook custom |
| État serveur / cache | **TanStack Query** (`@tanstack/react-query`) |
| Persistance locale | **AsyncStorage** (non chiffré) · **SecureStore** (chiffré, Keychain/Keystore) |
| Backend (BaaS) | **Supabase** : PostgreSQL, API auto-générée, **Auth**, **RLS**, **Edge Functions** (Deno), Storage |
| Capteurs / natif | `expo-location`, `expo-camera`, `expo-image-picker`, `expo-sensors`, `react-native-maps` |
| Offline | **NetInfo** + `onlineManager`, persistance du cache Query, file de mutations |
| Notifications | `expo-notifications` (locales + push via le service Expo) |
| Animations / gestes | **react-native-reanimated** · **react-native-gesture-handler** |
| Design system | tokens de thème + `useColorScheme` (clair/sombre) |
| Monitoring | **Sentry** (`@sentry/react-native`) |
| Tests | **Jest** (`jest-expo`) + **@testing-library/react-native** |
| Monétisation | **RevenueCat** (`react-native-purchases`) |

---

## Le modèle mental : du web (React) au mobile (React Native)

Différences structurelles qui reviennent tout au long du cours :

| React (web) | React Native (mobile) |
|---|---|
| DOM, `div`, `span`, `p`, `input`, `button` | Composants natifs : `View`, `Text`, `TextInput`, `Pressable`, `Image`, `ScrollView`, `FlatList` |
| `window`, `document`, `localStorage` | **N'existent pas** — moteur JS (Hermes), pas de navigateur |
| `className` + CSS | prop `style` + objets JS (`StyleSheet.create`) |
| unités `px` / `em` / `rem` | de simples **nombres** |
| `:hover`, événements souris | événements tactiles (`onPress`), pas de `:hover` |
| `flexDirection: row` par défaut | **`flexDirection: column` par défaut** |
| navigation par **URL / pages** | navigation par **pile d'écrans** (Stack / Tabs / Modals) |
| `<input onChange>` (event) | `<TextInput onChangeText>` (reçoit la chaîne) |
| rechargement de page réinitialise l'état | on change d'écran **sans recharger** → l'état doit persister en mémoire |

Points de vigilance propres au mobile : **zones sûres** (encoches, Dynamic Island) via `react-native-safe-area-context` ; **clavier** qui recouvre les champs (`KeyboardAvoidingView`, `behavior` dépendant de la plateforme) ; **permissions natives** explicites ; **réseau intermittent** ; différences **iOS / Android** ; distribution lente via la **revue des stores**.

---

## Conventions transverses (valables dans tous les modules)

- **Installer les paquets natifs avec `npx expo install <paquet>`** (jamais `npm install`) : Expo choisit la version compatible avec le SDK.
- **Pattern Provider + hook custom** : un `Context` détient l'état/la logique, un hook `useXxx()` l'expose et **lève une erreur** s'il est utilisé hors du provider. Le composant qui **monte** un provider ne peut pas le **consommer** (séparer parent monteur / enfant consommateur).
- **Mises à jour d'état immuables** via la forme fonctionnelle du setter (`set((prev) => …)`), jamais de mutation directe.
- **Drapeau de chargement `isReady`/`isLoading`** basculé dans un `finally`, pour n'afficher l'UI qu'une fois les données prêtes (souvent avec `ActivityIndicator`).
- **`useEffect` ne peut pas être `async`** : on y déclare une fonction `async` interne qu'on appelle ; on **nettoie** les abonnements dans la fonction de retour.
- **Gérer trois états réseau** : chargement / erreur / succès ; toujours un moyen de **réessayer**.
- **Sécurité des secrets** : variables publiques en `EXPO_PUBLIC_` (visibles dans le bundle) ; vrais secrets uniquement côté serveur / environnement de build EAS, jamais dans le dépôt.
- **Sensibilité des données** : non sensible → AsyncStorage ; token / mot de passe / clé → SecureStore (chiffré).
- **Permissions** : demandées **sur action utilisateur**, jamais au lancement ; l'app ne doit **jamais crasher** sur un refus.

---

## Sommaire des modules

| # | Module | Sujets couverts |
|---|---|---|
| 1 | Démarrage rapide (React Native + Expo) | Expo vs RN CLI, `create-expo-app`, structure projet, composants natifs, `StyleSheet`, Flexbox, safe areas, clavier, Expo Go vs dev build, debug |
| 2 | Navigation mobile (Expo Router) | Stack / Tabs / Modals, routage par fichiers, `_layout`, routes dynamiques `[id]`, `Link`/`router`, params, groupes `(…)`, `+not-found`, routes protégées |
| 3 | Gérer l'état | `useState`, champ contrôlé, params d'URL vs Context, **React Context**, architecture d'un contexte, **FlatList** (virtualisation, `keyExtractor`) |
| 4 | Persister les données | **AsyncStorage** (sérialisation JSON), réhydratation au montage, `isReady`, écran de chargement, **SecureStore** (chiffré) |
| 5 | Connecter à un backend | `fetch`, isolation `lib/api`, **Supabase** (BaaS, CRUD), état client vs serveur, **TanStack Query** (`useQuery`/`useMutation`, invalidation) |
| 6 | Authentification (Supabase Auth) | `signUp`/`signIn`/`signOut`, persistance de session, `AuthContext`, navigation conditionnelle, **Row-Level Security** (`using` vs `with check`) |
| 7 | Capteurs natifs & permissions | Modules `expo-*` par capteur, permissions propres, **GPS** (`expo-location`), cartes, **accéléromètre** (`expo-sensors`), **caméra** (`expo-image-picker`/`expo-camera`) |
| 8 | Mode offline & synchronisation | NetInfo + `onlineManager`, persistance du cache, **file de mutations** (`setMutationDefaults`, `resumePausedMutations`), **mises à jour optimistes**, conflits |
| 9 | Notifications push & locales | Locale vs push, `expo-notifications`, permissions, triggers, **push via Expo** + Edge Function Supabase (Deno), `pg_cron`, **deep-linking** |
| 10 | Animations & design system | **Reanimated** (shared values, `useAnimatedStyle`, layout animations), **Gesture Handler** (`Gesture.Pan`, `runOnJS`), tokens de thème, mode sombre |
| 11 | Déploiement (avec ou sans EAS) | `app.json`, secrets, profils `eas.json`, **EAS Build / Submit**, alternatives locales, **EAS Update (OTA)**, **Sentry** |
| 12 | Tester son app | Pyramide des tests, **Jest** (`jest-expo`), **Testing Library** (`render`, `renderHook`, `fireEvent`, `waitFor`, `act`), **mocking** (`jest.mock`, couture `lib/api`) |
| 13 | Monétisation | Modèles (payant/IAP/abonnement/freemium/pub), taxe des stores, règle bien numérique → IAP, **RevenueCat** (offering/entitlement, achat, restauration) |

---


