## Module 5 — Du web au mobile : connecter l'application à un backend (API HTTP, Supabase, TanStack Query)

Ce module traite de la connexion d'une application React Native à un backend distant : appels réseau avec `fetch`, isolation de la logique réseau, utilisation d'un BaaS (Supabase) pour un CRUD complet, puis délégation du cache et des mutations à TanStack Query, en soignant les états de chargement et d'erreur.

### Pourquoi un backend : ce que le local ne permet pas

Une application purement locale (données stockées uniquement sur l'appareil) souffre de limitations structurelles :
- Données enfermées sur un seul appareil.
- Pas de synchronisation entre téléphones.
- Pas de sauvegarde sur un serveur.
- Pas de partage entre utilisateurs.
- Pas de compte, donc pas de notification déclenchée côté serveur.

**Définition d'un backend** : c'est la partie invisible de l'application.
- Un serveur distant, souvent hébergé dans le cloud.
- Il stocke, traite et renvoie des données via une **API**.
- Il constitue le **pont entre les utilisateurs et la base de données**.

### Vocabulaire d'une API HTTP

| Terme | Définition |
|---|---|
| **endpoint** | L'URL précise à appeler (ex. `/notes`). |
| **méthode HTTP** | Le type d'action : `GET` pour lire, `POST` pour créer, etc. |
| **payload** | Les données envoyées dans la requête (au format JSON). |
| **header** | Informations supplémentaires : token, type de contenu (`Content-Type`)… |
| **response** | Ce que renvoie le serveur, souvent du JSON. |

**Exemples de requêtes/réponses REST :**

Créer une note (le payload JSON est envoyé dans le corps de la requête) :
```http
POST /notes
Content-Type: application/json

{
  "title": "Nouvelle note",
  "content": "Contenu de la note"
}
```

Lister les notes :
```http
GET /notes
```

Réponse du serveur (tableau JSON) :
```json
[
  { "id": 1, "title": "Première note" },
  { "id": 2, "title": "Deuxième note" }
]
```

### Faire un appel réseau avec `fetch()`

Concepts clés :
- Charger des données depuis un serveur = **appel réseau**.
- React Native **n'a pas d'outil dédié** : on utilise l'API standard **`fetch()`** (la même que sur le web).
- L'appel est **asynchrone** : il ne bloque pas l'application.
- On gère systématiquement **trois états** : chargement (`loading`), erreur (`error`), succès.

Pattern de chargement dans un composant, avec `useState` + `useEffect` :
```tsx
const [notes, setNotes] = useState<Array<any>>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function fetchNotes() {
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/posts");
      const data = await res.json();
      setNotes(data.slice(0, 10));
    } catch (err) {
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }
  fetchNotes();
}, []);
```
Points techniques :
- La fonction `async` est déclarée **à l'intérieur** du `useEffect` puis appelée, car le callback de `useEffect` ne peut pas être `async` directement.
- Le tableau de dépendances vide `[]` déclenche l'appel une seule fois au montage.
- `fetch(...)` renvoie une réponse ; `res.json()` (asynchrone) parse le corps JSON.
- `try / catch / finally` : le `finally` met `loading` à `false` quel que soit le résultat.

### Rendu conditionnel selon l'état + affichage avec `FlatList`

On ne rend la liste que lorsque les données sont prêtes, avec des retours anticipés (early returns) :
```tsx
if (loading) {
  return <ActivityIndicator size="large" />;
}
if (error) {
  return <Text>{error}</Text>;
}
return (
  <FlatList
    data={notes}
    keyExtractor={(item) => item.id.toString()}
    renderItem={({ item }) => (
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
        <Text>{item.body}</Text>
      </View>
    )}
  />
);
```
- **`ActivityIndicator`** (prop `size="large"`) : composant natif d'indicateur de chargement.
- **`FlatList`** : props `data`, `keyExtractor` (retourne une clé string, d'où `item.id.toString()`), et `renderItem` qui reçoit `({ item })`.

### Bonnes pratiques des appels réseau

- **Toujours gérer le chargement** : ne jamais afficher une interface vide.
- **Toujours gérer les erreurs** : un appel peut échouer à tout moment.
- **Afficher les données seulement quand elles sont prêtes.**
- **Jamais de `fetch()` directement dans le corps du `render`** (il doit être dans un `useEffect` ou une fonction dédiée), sinon il se relance à chaque rendu.

### Isoler la logique réseau dans un fichier dédié

Pourquoi extraire les appels réseau dans un module (ex. `lib/api.ts`) :
- Éviter de dupliquer `fetch()` et le parsing JSON.
- Rendre les composants plus simples à lire.
- Pouvoir changer d'API sans toucher à l'UI (URL, headers…).
- Tester les fonctions réseau facilement.
- Préparer le passage à une vraie base distante.

Fonction réseau isolée, typée, qui vérifie le statut HTTP et **transforme** la réponse au format attendu :
```ts
export async function getNotes(): Promise<
  Array<{ id: number; title: string; content?: string }>
> {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts");
  if (!res.ok) {
    throw new Error("Erreur réseau");
  }
  const data = await res.json();
  return data.slice(0, 10).map((item: any) => ({
    id: item.id,
    title: item.title,
    content: item.body,
  }));
}
```
- **`res.ok`** : vrai si le statut HTTP est 2xx ; sinon on lève une erreur.
- Le `.map(...)` adapte la forme des données de l'API à celle attendue par l'app (ex. `body` → `content`).

**Avant / après** — le composant passe d'un `fetch` inline à un simple appel de fonction :
```ts
// Avant : tout dans le composant
const res = await fetch("https://...typicode.com/posts");
const data = await res.json();
setNotes(data.slice(0, 10));

// Après : un appel à la fonction
import { getNotes } from "@/lib/api";
const notes = await getNotes();
setNotes(notes);
```
(Note : l'import `@/lib/api` utilise un alias de chemin.)

### Alternative : la bibliothèque `axios`

```ts
import axios from "axios";

export async function getNotes() {
  const res = await axios.get("https://jsonplaceholder.typicode.com/posts");
  return res.data.slice(0, 10);
}
```
- Avec axios : parsing JSON, erreurs, timeouts et headers sont **gérés pour vous** ; les données sont dans `res.data`.
- **Facultatif** : `fetch` suffit largement dans ce contexte.

### Supabase : un backend BaaS

**Définitions et caractéristiques :**
- **BaaS = Backend-as-a-Service** : tous les outils d'un backend, sans avoir à le coder.
- Fournit une **base PostgreSQL hébergée** + une **API auto-générée**.
- Inclut l'**authentification**, les **règles de sécurité** et le **stockage de fichiers**.
- **Open source**, gratuit pour démarrer.

Exemple de schéma de table `notes` :

| Colonne | Type | Contraintes |
|---|---|---|
| `id` | UUID | Primary key, `gen_random_uuid()` |
| `title` | text | non-null |
| `content` | text | nullable |
| `created_at` | timestamp | default `now()` |

### Installation et initialisation du client Supabase

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill
```
- **`expo install`** aligne la version des paquets sur votre **SDK Expo**.
- **`react-native-url-polyfill`** ajoute l'objet **`URL`** : **Hermes**, le moteur JavaScript de React Native, ne le fournit pas nativement.

Création du client (l'import du polyfill `/auto` doit venir en premier) :
```ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://xyzcompany.supabase.co";
const SUPABASE_KEY = "sb_publishable_..."; // clé publishable

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```
- L'**URL** se trouve dans **Settings > API** ; la **clé** dans **Settings > API Keys**.
- **Piège de sécurité important** : la clé publishable est **embarquée dans l'app** ; **ce n'est pas elle qui protège vos données** (la sécurité passe par les règles côté serveur, type Row Level Security).

### Lire des données depuis Supabase (Read)

```ts
import { supabase } from "./supabase";

export async function getNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error("Erreur Supabase : " + error.message);
  }
  return data;
}
```
API du client Supabase (chaînage / query builder) :
- **`.from("notes")`** : cible la table.
- **`.select("*")`** : sélectionne toutes les colonnes.
- **`.order("created_at", { ascending: false })`** : tri décroissant.
- Le client renvoie un objet **`{ data, error }`** : on vérifie toujours `error` avant d'utiliser `data`.

### Type partagé côté application

Le type `Note` (créé au module 3) doit être **mis à jour, pas redéclaré**. C'est ce type partagé qu'on réutilise partout :
```ts
type Note = {
  id: string;
  title: string;
  content: string | null; // colonne nullable côté base
  created_at: string;     // renvoyé par Supabase
};
```
- `content` est `string | null` car la colonne est nullable en base.
- `created_at` est une string renvoyée par Supabase.

### Créer une note (Create / POST)

Fonction d'insertion, avec un type `NewNote` dédié à la création (sans `id` ni `created_at`) :
```ts
type NewNote = {
  title: string;
  content?: string;
};

export async function addNote(note: NewNote) {
  const { data, error } = await supabase
    .from("notes")
    .insert(note)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
```
- **`.insert(note)`** : insère la ligne.
- **`.select()`** : demande à récupérer la ligne insérée.
- **`.single()`** : renvoie un objet unique plutôt qu'un tableau.

Synchronisation à l'UI après création (mise à jour de l'état local avec l'objet réellement créé, renvoyé par le serveur) :
```tsx
async function handleCreateNote() {
  try {
    const newNote = await addNote({
      title: "Titre saisi par l'utilisateur",
      content: "Contenu éventuel de la note",
    });
    setNotes((prev) => [newNote, ...prev]);
  } catch (e) {
    Alert.alert("Erreur", "Impossible d'ajouter la note.");
  }
}
```
- On préfixe la liste avec la nouvelle note : `[newNote, ...prev]`.
- **`Alert.alert(titre, message)`** : API native d'alerte pour signaler l'échec.

### CRUD : Delete et Update (PATCH)

**CRUD = Create, Read, Update, Delete** — les quatre opérations de toute base de données.

**Supprimer (DELETE) :**
```ts
export async function deleteNote(id: string) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
```
- **`.eq("id", id)`** cible la ligne à supprimer (clause d'égalité, équivalent d'un `WHERE id = ...`).
- **Pas de valeur de retour** : la fonction réussit ou lève une erreur.

**Mettre à jour (UPDATE / PATCH)** — on sépare l'`id` (pour le ciblage) des `fields` (pour la mise à jour) :
```ts
type UpdatePayload = {
  id: string;
  title?: string;
  content?: string;
};

export async function updateNote({ id, ...fields }: UpdatePayload) {
  const { data, error } = await supabase
    .from("notes")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
```
- **`.update(fields)`** : n'envoie que les champs fournis (les autres restent inchangés).
- Combiné à `.eq("id", id).select().single()` pour cibler et récupérer la ligne modifiée.

### Centraliser l'état avec un Provider (Context)

Avant TanStack Query, l'état est centralisé « à la main » dans un `NotesProvider`, avec chargement au montage et re-synchronisation après chaque mutation :
```tsx
export function NotesProvider({ children }) {
  const [notes, setNotes] = useState<Array<Note>>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    api
      .getNotes()
      .then(setNotes)
      .catch((e) => console.error("Chargement des notes", e))
      .finally(() => setIsReady(true));
  }, []);

  async function addNote(note: { title: string; content?: string }) {
    const created = await api.addNote(note);
    setNotes((prev) => [created, ...prev]);
  }

  async function deleteNote(id: string) {
    await api.deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  // … value={{ notes, addNote, deleteNote, isReady }}
}
```
- `isReady` bascule à `true` dans le `.finally()`.
- Après chaque mutation, on **met à jour manuellement** l'état : ajout `[created, ...prev]`, suppression via `filter`.
- **Limite reconnue** : ce couplage `useState` + `setNotes` après chaque mutation est fragile ; il sera **remplacé par TanStack Query**.

### État client vs état serveur

Distinction fondamentale qui justifie TanStack Query :

| État client | État serveur |
|---|---|
| Ce que votre app **possède** | Une **copie** d'une donnée distante |
| Texte saisi, onglet actif, filtre | Vos notes Supabase |
| Personne d'autre ne le connaît | Peut changer ailleurs, se **périmer** |
| `useState`, Context suffisent | Doit être **rechargée**, **invalidée** |

### TanStack Query : configuration du client

On délègue le cache, le rechargement et les mutations à TanStack Query au lieu de tout gérer à la main.

Mise en place du provider à la racine :
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotesProvider>{/* … navigation … */}</NotesProvider>
    </QueryClientProvider>
  );
}
```
- **`queryClient` créé en dehors du composant** (pour ne pas le recréer à chaque rendu).
- L'app est enveloppée dans **`<QueryClientProvider client={queryClient}>`**.

### Lire des données avec `useQuery`

```tsx
const queryClient = useQueryClient();

const { data: notes = [], isPending } = useQuery({
  queryKey: ["notes"],
  queryFn: api.getNotes,
});

// value={{ notes, addNote, deleteNote, isReady: !isPending }}
```
- **`queryKey`** (ex. `["notes"]`) : identifie la donnée dans le cache.
- **`queryFn`** : la fonction réseau déjà écrite dans `lib/api.ts`.
- `data: notes = []` : valeur par défaut `[]` tant qu'il n'y a pas de données.
- **`isPending`** remplace le `isReady` manuel (`isReady: !isPending`).
- **`useQueryClient()`** : hook pour accéder au client (utile pour invalider le cache).

### Correspondance : gestion manuelle → TanStack Query

| À la main | Avec TanStack Query |
|---|---|
| `useState` pour stocker | Le cache, via `queryKey` |
| `useEffect` pour charger | `useQuery` charge tout seul |
| un `isReady` basculé à la main | `isPending` |
| recharger au retour sur l'écran | **refetch automatique** |

### Mutations avec `useMutation` + invalidation du cache

```tsx
const addMutation = useMutation({
  mutationFn: api.addNote,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
});

const deleteMutation = useMutation({
  mutationFn: api.deleteNote,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
});

async function addNote(note: { title: string; content?: string }) {
  await addMutation.mutateAsync(note);
}
```
- **`mutationFn`** : la fonction d'écriture (`api.addNote`, `api.deleteNote`).
- **`onSuccess`** : après succès, on appelle **`queryClient.invalidateQueries({ queryKey: ["notes"] })`**, ce qui marque le cache comme périmé et **déclenche un rechargement automatique**.
- **`mutateAsync(...)`** : déclenche la mutation et renvoie une promesse (`await`-able).
- Conséquence : **plus jamais de `setNotes`** — la liste se recharge seule après invalidation.

### Ce que le cache TanStack Query débloque

- Un **cache centralisé** que TanStack Query contrôle.
- Persistance possible (« au module 8 ») : **lire sans réseau**.
- Des **mutations mises en file** et **rejouées au retour du réseau**.
- Tout cela serait **impossible à coder proprement à la main sur `useState`**.

### États réseau exposés par `useQuery`

| Champ | Signification |
|---|---|
| **`isPending`** | La **première** requête charge, il n'y a pas encore de donnée. |
| **`isError`** | La requête a échoué. |
| **`error`** | L'objet d'erreur correspondant. |
| **`isFetching`** | Une requête **tourne**, y compris un refresh de fond (rechargement silencieux). |

Distinction clé :
- **`isPending`** : seulement le tout **premier** chargement (aucune donnée en cache).
- **`isFetching`** : **tout** rechargement, y compris de fond (des données peuvent déjà être affichées).

### Exposer les états et `refetch` via le Context

```tsx
const {
  data: notes = [],
  isPending,
  isError,
  isFetching,
  refetch,
} = useQuery({ queryKey: ["notes"], queryFn: api.getNotes });

// types.ts
export type NotesContextType = {
  notes: Array<Note>;
  isReady: boolean;
  isError: boolean;
  isFetching: boolean;
  retry: () => void;
};
```
- **`refetch`** : fonction pour relancer manuellement la requête (exposée sous le nom `retry`).

### Rendu des trois états dans l'écran

```tsx
function NotesScreen() {
  const { notes, isReady, isError, retry } = useNotes();

  // 1. Chargement
  if (!isReady) {
    return <ActivityIndicator />;
  }

  // 2. Erreur (avec un moyen de réessayer)
  if (isError) {
    return (
      <View>
        <Text>Impossible de charger tes notes.</Text>
        <Button title="Réessayer" onPress={() => retry()} />
      </View>
    );
  }

  // 3. Succès (liste, éventuellement vide)
  return <FlatList data={notes} /* … */ />;
}
```
- Bonne pratique : toujours offrir un **bouton « Réessayer »** en cas d'erreur (`<Button title="Réessayer" onPress={() => retry()} />`).
- L'état de succès doit gérer une **liste éventuellement vide**.

### Pull-to-refresh avec `FlatList`

`FlatList` gère nativement le « tirer pour rafraîchir » via deux props reliées aux états de TanStack Query :
```tsx
const { notes, isFetching, retry } = useNotes();

<FlatList
  data={notes}
  onRefresh={() => retry()}
  refreshing={isFetching}
  /* … */
/>;
```
- **`onRefresh`** : callback déclenché par le geste de rafraîchissement → `retry()`.
- **`refreshing`** : booléen d'affichage du spinner, branché sur **`isFetching`** (et non `isPending`, car il s'agit d'un rechargement alors que des données sont déjà là).

### Options par défaut du `QueryClient` : `retry` et `staleTime`

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,              // 2 nouvelles tentatives avant l'échec
      staleTime: 1000 * 30,  // données "fraîches" pendant 30 s
    },
  },
});
```
- **`retry`** : combien de fois réessayer automatiquement avant de passer à `isError`.
- **`staleTime`** : durée pendant laquelle les données sont considérées « fraîches » → **moins de refetch** inutiles.


