## Module 6 — Authentification avec Supabase Auth dans une app React Native

Ce module marque un tournant dans la conception de l'app : on passe d'une base de données distante **partagée par tous** à une app avec **notion d'identité, de comptes et de permissions**. Le fil conducteur reste l'app de notes des modules précédents (module 4 : AsyncStorage installé ; module 5 : notes en base distante + cache TanStack Query).

### Pourquoi l'authentification : le problème à résoudre

Sans authentification, l'app présente les limites suivantes :
- Les données vivent dans une base distante **mais communes à tous les utilisateurs**.
- Aucune notion d'identité, de compte ou de permissions.
- N'importe qui peut lire et supprimer les notes des autres.

L'authentification permet de :
- Personnaliser les données par utilisateur (« mes notes »).
- Sécuriser l'accès à certains écrans ou fonctionnalités.
- Sauvegarder des données personnelles côté serveur.
- Offrir une expérience **cross-device** : même contenu sur plusieurs téléphones.
- Restreindre selon un **rôle ou un statut** (admin, premium…).

### Ce qu'apporte Supabase Auth (vs tout coder soi-même)

| Sans Supabase | Avec Supabase Auth |
|---|---|
| Une API d'auth perso à écrire | `signUp()` / `signInWithPassword()` |
| Un backend Express ou Firebase | `signOut()` et gestion de session |
| Un JWT custom à gérer | Token rafraîchi automatiquement |
| Une base utilisateurs à maintenir | `user.id` accessible côté client |
| — | Tout intégré, **sans backend intermédiaire** |

Idée clé : le SDK Supabase fournit directement les primitives d'auth (inscription, connexion, déconnexion, session, rafraîchissement de token), et rend l'identifiant utilisateur (`user.id`) disponible côté client — sans serveur intermédiaire à écrire.

### `auth.uid()` et le filtrage côté base (introduction à la Row-Level Security)

```sql
-- L'utilisateur connecté ne voit que SES lignes
SELECT * FROM notes WHERE user_id = auth.uid()
```

- `auth.uid()` = l'identifiant de l'utilisateur connecté (fourni par Supabase).
- Le **filtrage se fait côté base**, sans API personnalisée.
- C'est le fondement de la **Row-Level Security (RLS)**, détaillée plus loin.

### Objectifs fonctionnels du module

- Créer un écran de login / signup simple.
- Gérer connexion et déconnexion.
- Afficher l'app **ou** l'écran d'auth selon l'état utilisateur.
- Protéger les routes et les données.
- Associer chaque donnée à l'utilisateur connecté.

### Écran de connexion / inscription : logique et méthodes du SDK

Un même écran gère à la fois connexion et inscription grâce à un état `isLogin`. On maintient email, mot de passe et le mode via `useState` :

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [isLogin, setIsLogin] = useState(true);

async function handleSubmit() {
  try {
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      Alert.alert("Inscription réussie", "Tu peux maintenant te connecter.");
    }
  } catch (e) {
    Alert.alert("Erreur", (e as Error).message);
  }
}
```

Points techniques :
- **`supabase.auth.signInWithPassword({ email, password })`** : connexion d'un compte existant.
- **`supabase.auth.signUp({ email, password })`** : création de compte.
- Les deux méthodes retournent un objet `{ error }` qu'il faut tester ; on relance l'erreur (`throw error`) pour la traiter dans le `catch`.
- Les retours utilisateur (succès / erreur) passent par **`Alert.alert(titre, message)`** (API React Native).
- En TypeScript, l'erreur du `catch` est typée via `(e as Error).message`.

### Interface (composants React Native de l'écran d'auth)

```tsx
<Text style={{ fontWeight: "bold", fontSize: 24 }}>
  {isLogin ? "Connexion" : "Inscription"}
</Text>

<TextInput placeholder="Email" autoCapitalize="none"
  value={email} onChangeText={setEmail} />

<TextInput placeholder="Mot de passe" secureTextEntry
  value={password} onChangeText={setPassword} />

<Button title={isLogin ? "Se connecter" : "S'inscrire"} onPress={handleSubmit} />

<Text onPress={() => setIsLogin(!isLogin)}>
  {isLogin
    ? "Pas encore de compte ? S'inscrire"
    : "Déjà inscrit ? Se connecter"}
</Text>
```

Props / composants importants :
- **`TextInput`** : champ contrôlé via `value` + `onChangeText` (équivalent RN de `onChange`).
- **`autoCapitalize="none"`** : indispensable pour un champ email (évite la majuscule auto sur mobile).
- **`secureTextEntry`** : masque le contenu saisi (champ mot de passe).
- **`Button`** : prop `title` pour le libellé, `onPress` pour l'action.
- **`<Text onPress={…}>`** : un `Text` peut recevoir `onPress` pour servir de lien / bouton texte (bascule login ⇄ signup ici).

### Comportement de `signUp()` selon la confirmation d'email

```
signUp()  →  Confirm email DÉSACTIVÉ  →  session immédiate
signUp()  →  Confirm email ACTIVÉ     →  session = null (normal)
```

- **Confirmation désactivée** : une session est créée immédiatement. Pratique **pour apprendre**.
- **Confirmation activée** : `session` vaut `null` — c'est normal ; l'utilisateur doit cliquer le lien reçu par email avant d'avoir une session.
- Désactiver « Confirm email » est **à ne jamais faire en production**.

### Persistance de session : le problème du stockage sur mobile

Le SDK Supabase garde la session **en mémoire**. Conséquence :

- App fermée → mémoire vidée → **session perdue**.
- Sur le **web**, le SDK utilise **`localStorage` automatiquement** pour persister la session.
- En **React Native**, **`localStorage` n'existe pas** → il faut fournir un stockage explicite.

### Configuration du client Supabase pour la persistance

On complète le `lib/supabase.ts` (créé au module 5) en passant des options `auth` au `createClient` :

```ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,       // où la session est écrite
    autoRefreshToken: true,      // rafraîchit le token avant expiration
    persistSession: true,        // sauvegarde la session sur l'appareil
    detectSessionInUrl: false,   // inutile sur mobile (pas d'URL)
    lock: processLock,           // évite les rafraîchissements concurrents
  },
});
```

Rôle de chaque option :
- **`storage: AsyncStorage`** : indique où écrire la session (AsyncStorage, déjà installé au module 4).
- **`autoRefreshToken: true`** : rafraîchit automatiquement le token avant son expiration.
- **`persistSession: true`** : sauvegarde la session sur l'appareil (survit au redémarrage).
- **`detectSessionInUrl: false`** : inutile sur mobile (pas d'URL de callback, contrairement au web OAuth).
- **`lock: processLock`** : évite les rafraîchissements de token **concurrents**.

### Rafraîchissement du token et cycle de vie de l'app (`AppState`)

`autoRefreshToken` repose sur un **minuteur** qui **ne survit pas à l'arrière-plan**. Il faut donc piloter le rafraîchissement selon l'état de l'app avec l'API **`AppState`** de React Native :

```ts
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();   // app au premier plan
  } else {
    supabase.auth.stopAutoRefresh();    // app en arrière-plan
  }
});
```

- **`supabase.auth.startAutoRefresh()`** quand l'app repasse au premier plan (`state === "active"`).
- **`supabase.auth.stopAutoRefresh()`** quand l'app passe en arrière-plan.
- Sans ce bloc : **au retour dans l'app, l'utilisateur se retrouve déconnecté** (le minuteur avait été suspendu).

### Choix du stockage : `AsyncStorage` vs `SecureStore`

| `SecureStore` | `AsyncStorage` |
|---|---|
| Chiffré | Non chiffré |
| Limité à ~2 Ko / valeur (iOS) | Pas de limite stricte |
| Idéal pour de petits secrets | Idéal pour la session |

Pourquoi **`AsyncStorage`** pour la session Supabase :
- Une session = **deux JWT + le profil**, soit souvent **> 2 Ko** → dépasse la limite de `SecureStore` sur iOS.
- Le SDK gère **seul** le rafraîchissement du token, donc le besoin critique de chiffrement du stockage est atténué.

### AuthContext : refléter l'état du SDK dans toute l'app

L'idée est de créer un **contexte d'authentification** qui **reflète** l'état du SDK et le rend disponible partout via un hook `useAuth()`. On restaure la session au démarrage puis on écoute les changements :

```tsx
const [session, setSession] = useState<Session | null>(null);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setIsLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => setSession(session),
  );

  return () => listener.subscription.unsubscribe();
}, []);

const user = session?.user ?? null;
```

Mécanismes clés :
- **`supabase.auth.getSession()`** : restaure la session au boot (lecture **locale**, instantanée).
- **`supabase.auth.onAuthStateChange((_event, session) => …)`** : s'abonne aux changements d'état d'auth (connexion / déconnexion / refresh) et met l'état React à jour **tout seul**.
- **Nettoyage indispensable** : `listener.subscription.unsubscribe()` dans la fonction de retour du `useEffect`.
- **`user`** est dérivé de la session : `session?.user ?? null`.
- `isLoading` distingue « restauration en cours » de « pas connecté ».

### Méthodes du contexte : déléguer au SDK

Les méthodes exposées par le contexte ne font qu'**appeler le SDK** ; elles **ne mettent pas l'état à jour elles-mêmes** — c'est `onAuthStateChange` qui s'en charge :

```tsx
async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Pas de setSession ici : onAuthStateChange s'en charge.
}

async function signOut() {
  await supabase.auth.signOut();
  // onAuthStateChange remettra session à null.
}
```

Principe (pattern important) : **une seule source de vérité**. On ne fait jamais `setSession` manuellement après un `signIn`/`signOut` ; l'écouteur `onAuthStateChange` est le point unique qui synchronise l'état.

### Piège : vider le cache à la déconnexion

Depuis le module 5, les notes vivent dans le **cache TanStack Query**. Piège de sécurité / confidentialité :

- À la déconnexion, le cache contient **encore les notes** de l'utilisateur précédent.
- Un autre utilisateur les verrait **une fraction de seconde**.

Solution : réagir à l'événement `SIGNED_OUT` là où les deux providers (Auth + Query) se rencontrent, et vider le cache :

```ts
// Réagir à SIGNED_OUT là où les deux providers se rencontrent
queryClient.clear();
```

### Monter le provider à la racine

`<AuthProvider>` doit englober toute l'app pour que **n'importe quel composant puisse appeler `useAuth()`** :

```tsx
import { AuthProvider } from "@/contexts/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}
```

- **`<Slot />`** (Expo Router) : point d'insertion des routes enfants dans un layout.
- Le chemin `@/contexts/auth` illustre l'alias d'import `@/` vers la racine du projet.

### Navigation conditionnelle selon l'état d'auth (Expo Router : route groups)

On adapte la navigation selon que l'utilisateur est connecté ou non, à l'aide des **groupes de routes** d'Expo Router (dossiers entre parenthèses, qui n'ajoutent pas de segment à l'URL) :

```
app/
├── (public)/            ← écran de connexion
│    └── auth/index.tsx
├── (private)/           ← toute l'app après login
│    └── notes/index.tsx
├── _layout.tsx          ← layout racine, choisit la zone
```

- **`(public)`** : accessible **sans** être connecté.
- **`(private)`** : réservé à l'utilisateur **authentifié**.
- Les parenthèses = **groupe de routes** : organisation logique **sans impact sur l'URL**.

### Gérer le chargement au niveau du navigateur (éviter le clignotement)

La lecture de `useAuth()` (donc `isLoading`) doit se faire dans un composant **enfant du provider** (`RootNavigator`), **pas** dans `RootLayout` lui-même — sinon `useAuth()` n'aurait pas accès au contexte :

```tsx
function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <ActivityIndicator size="large" />;
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
```

- Pendant `isLoading`, on affiche **`<ActivityIndicator size="large" />`** (spinner natif RN) → **pas de clignotement** entre écran d'auth et app.

### Redirections dans les deux sens (layouts de groupe)

Chaque groupe possède son `_layout.tsx` qui **redirige** selon la présence de `user`, via `router.replace` dans un `useEffect` :

```tsx
// app/(public)/_layout.tsx — déjà connecté ? → vers les notes
export default function PublicLayout() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) router.replace("/notes");
  }, [user]);
  return <Stack />;
}

// app/(private)/_layout.tsx — pas connecté ? → vers l'auth
export default function PrivateLayout() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) router.replace("/auth");
  }, [user]);
  return <Stack />;
}
```

- **`router.replace("/…")`** : remplace la route courante (l'utilisateur ne peut pas « revenir en arrière » vers l'écran interdit), contrairement à un `push`.
- **`<Stack />`** : navigateur en pile d'Expo Router.
- La redirection est déclenchée par un `useEffect` dépendant de `user`.

### Flux complet connexion / déconnexion

| Connexion | Déconnexion |
|---|---|
| Arrivée non connecté → `/auth` | Bouton « Déconnexion » → `signOut()` |
| L'utilisateur se connecte | `user` redevient `null` |
| `user` devient non nul | Le layout privé détecte l'absence de user |
| Redirigé vers `/notes` | Redirigé vers `/auth` |

C'est le **couplage état ⇄ navigation** : changer `user` suffit à faire basculer l'app d'une zone à l'autre, dans les deux sens, grâce aux redirections des layouts.

### Row-Level Security (RLS) : sécurité imposée par la base

La RLS déplace les règles d'accès **dans la base**, et non plus seulement côté client :

- Règles exécutées **côté Supabase à chaque requête**.
- Elles filtrent les lignes qu'on a le droit de **lire / écrire / modifier / supprimer**.
- Même en **oubliant `.eq("user_id", …)`** côté client, Supabase filtre quand même.
- **Imposées par la base : aucun client ne peut les contourner.**

Important : une fois la RLS activée, **tout est bloqué tant qu'aucune politique** n'est définie.

### Rattacher chaque ligne à un utilisateur (colonne `user_id`)

On ajoute à la table une colonne qui référence le compte propriétaire et se remplit automatiquement :

```sql
alter table notes
  add column user_id uuid references auth.users (id) default auth.uid();
```

- **`references auth.users (id)`** : chaque note pointe vers un **vrai compte** (clé étrangère vers la table des utilisateurs Supabase).
- **`default auth.uid()`** : la colonne est **remplie automatiquement** avec l'utilisateur courant à l'insertion.

### Politique de lecture (SELECT)

```sql
create policy "read_own_notes" on notes
  for select
  using ((select auth.uid()) = user_id);
```

- L'utilisateur **ne lit que les lignes** où `user_id` = son identifiant.
- **`(select auth.uid())`** : écrit sous forme de sous-requête pour être **évalué une seule fois par requête** (optimisation de performance recommandée).

### `using` vs `with check` : la distinction clé de la RLS

| Clause | Sur quoi elle porte | Opérations concernées |
|---|---|---|
| **`using`** | les lignes **déjà en base** | `select`, `update`, `delete` |
| **`with check`** | la ligne **qu'on écrit** | `insert`, `update` |

Règles à retenir :
- Un **`INSERT` se contrôle avec `with check`, jamais avec `using`**.
- C'est **l'erreur la plus fréquente en RLS**.
- L'**`UPDATE`** utilise **les deux** : `using` (quelles lignes on a le droit de modifier) **et** `with check` (ce qu'on a le droit d'écrire).

### Politiques INSERT / UPDATE / DELETE

```sql
create policy "insert_own_notes" on notes
  for insert
  with check ((select auth.uid()) = user_id);

create policy "update_own_notes" on notes
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "delete_own_notes" on notes
  for delete
  using ((select auth.uid()) = user_id);
```

### Renseigner `user_id` côté client : `getSession()` vs `getUser()`

À la création d'une note, on récupère l'utilisateur pour renseigner `user_id` :

```ts
const {
  data: { session },
} = await supabase.auth.getSession();
if (!session) throw new Error("Utilisateur non connecté");

const { data, error } = await supabase
  .from("notes")
  .insert({ title, content, user_id: session.user.id })
  .select()
  .single();
```

- **`getSession()`** : lecture **locale, instantanée**, fonctionne **hors-réseau** → à privilégier.
- **`getUser()`** ferait un **appel réseau** → **à éviter** pour ce cas.
- Chaîne d'API Supabase : **`.from("notes").insert({…}).select().single()`** — `insert` insère, `.select()` renvoie la ligne créée, `.single()` en extrait un objet unique.
- Bonne pratique : vérifier `if (!session)` avant d'écrire (garde-fou côté client, en plus de la RLS côté base).

### Gestion du compte utilisateur (API supplémentaires)

Autres méthodes du SDK Supabase Auth utiles pour un écran « Mon compte » :

- **`supabase.auth.updateUser({ password })`** : changer le mot de passe de l'utilisateur connecté.
- **`supabase.auth.updateUser({ email })`** : modifier l'email.
- **`supabase.auth.resetPasswordForEmail(email)`** : déclencher une réinitialisation de mot de passe par email.
- L'email courant est accessible via **`useAuth()`** (dérivé de la session).
- Un bouton de déconnexion propre appelle **`signOut()`**, ce qui ramène automatiquement à l'écran de connexion (via la navigation conditionnelle).


