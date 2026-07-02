## Module 4 — Persister les données dans une app React Native

### Pourquoi persister les données

La persistance consiste à enregistrer des données dans un endroit qui **survit au redémarrage** de l'application, afin de pouvoir les **retrouver plus tard**, que l'app soit fermée ou non.

Le problème sans persistance : par défaut, l'état d'une app React (ex. une liste de notes gérée par un Context) vit uniquement en **RAM**. Le cycle de vie est le suivant :

```
Note créée → Context → Affichage → App fermée → État perdu
```

- Les notes vivent dans le Context (RAM).
- L'app est fermée par l'utilisateur ou le système.
- La RAM est vidée.
- À la réouverture : liste vide.

Avec persistance, en parallèle du Context, les données sont aussi écrites sur le téléphone (stockage local). Le stockage local survit à la fermeture de l'app, et à la réouverture les notes sont restaurées.

Équivalences web / mobile :
- Sur le web : `localStorage`, `cookie`.
- Sur mobile : le **stockage local** du téléphone.

### Ce qu'on persiste typiquement dans une app

| Cas d'usage | Donnée à persister |
|---|---|
| Liste de notes | Tableau d'objets |
| Utilisateur connecté | Token d'authentification |
| Préférences | Thème, langue |
| Onboarding | A-t-il vu l'intro ? |
| Dernière page ouverte | État de navigation |

### Le cycle de la persistance

Le pattern général relie l'état applicatif (Context) au stockage dans les deux sens :

```
Action → Context → (écriture) → Stockage
                 ← (relecture au lancement) ←
```

- **Écriture** : à chaque action/modification, on écrit du Context vers le Stockage.
- **Relecture au lancement** : au démarrage de l'app, on relit le Stockage pour réhydrater le Context.

### AsyncStorage — présentation

`AsyncStorage` est la solution de base pour la persistance non sensible en React Native.

Caractéristiques (en trois points) :
- Stockage **clé / valeur** **asynchrone**.
- **Maintenu par la communauté React Native** (paquet communautaire, pas dans le cœur de React Native).
- Stocke des **chaînes de caractères** durablement.
- Comparable à `localStorage` du web, **mais non chiffré**.

Installation :

```bash
npx expo install @react-native-async-storage/async-storage
```

- `npx expo install` choisit la **bonne version** compatible avec votre SDK Expo (à préférer à `npm install` pour ce type de paquet natif).

### Où placer la persistance (architecture avec Context)

Dans l'exemple d'app de notes, les notes sont déjà gérées par un `NotesContext`. La logique de persistance s'intègre ainsi :
- On ajoute une fonction `saveNotes()` au provider (`NotesProvider`).
- On l'appelle depuis les actions qui modifient l'état : `addNote` et `deleteNote`.
- On utilise une **clé claire et isolée** : `@notes` (convention de préfixe `@` pour les clés).

### Écrire avec AsyncStorage : la fonction `saveNotes()`

Points clés : import du module, fonction `async`, sérialisation en JSON avec `JSON.stringify`, écriture via `AsyncStorage.setItem(cle, valeur)`, et gestion d'erreur avec `try/catch`.

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";

async function saveNotes(updatedNotes: Array<Note>) {
  try {
    await AsyncStorage.setItem("@notes", JSON.stringify(updatedNotes));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des notes", error);
  }
}
```

Comme AsyncStorage ne stocke que des chaînes, un tableau d'objets doit être sérialisé via `JSON.stringify` avant écriture.

### Sauvegarder à chaque modification

`saveNotes(updated)` est appelé dans chaque action mutant l'état, en calculant d'abord la **nouvelle** liste puis en la persistant, à l'intérieur du updater fonctionnel de `setNotes`. On persiste `updated` (la valeur à venir), pas l'ancien state.

```tsx
function addNote(note: { title: string; content: string }) {
  const newNote = { id: Date.now().toString(), ...note };
  setNotes((prev) => {
    const updated = [newNote, ...prev];
    saveNotes(updated);
    return updated;
  });
}

function deleteNote(id: string) {
  setNotes((prev) => {
    const updated = prev.filter((note) => note.id !== id);
    saveNotes(updated);
    return updated;
  });
}
```

Détails techniques illustrés :
- Génération d'ID avec `Date.now().toString()`.
- Ajout en tête de liste via `[newNote, ...prev]`.
- Suppression via `prev.filter((note) => note.id !== id)`.

### Vérifier l'écriture et relire la clé

On peut relire une clé avec `AsyncStorage.getItem(cle)`, qui renvoie une Promise (usage `.then` possible) :

```tsx
AsyncStorage
  .getItem("@notes")
  .then(console.log);
```

Ce qui est réellement stocké est une chaîne JSON, par exemple :

```json
[
  { "id": "1718...", "title": "Courses", "content": "Lait, pain" },
  { "id": "1718...", "title": "Idées", "content": "App de notes" }
]
```

### Recharger les données au démarrage

Au lancement, le Context démarre **vide** : il faut relire le stockage et réhydrater l'état. Le flux :

```
Lancement → Context vide → useEffect lit @notes → JSON.parse → setNotes
```

#### `loadNotes()` dans un `useEffect`

On définit une fonction `async` interne au `useEffect` (car un `useEffect` ne peut pas être directement `async`), on lit la clé, et on ne réhydrate que si une valeur existe (`if (raw)`), en désérialisant avec `JSON.parse`. Le `useEffect` a un tableau de dépendances vide `[]` pour ne s'exécuter qu'une fois au montage.

```tsx
useEffect(() => {
  async function loadNotes() {
    try {
      const raw = await AsyncStorage.getItem("@notes");
      if (raw) {
        const parsed = JSON.parse(raw);
        setNotes(parsed);
      }
    } catch (e) {
      console.error("Erreur lors du chargement des notes", e);
    }
  }

  loadNotes();
}, []);
```

### Protéger le rendu avec `isReady`

Le chargement depuis AsyncStorage étant **asynchrone**, il faut un drapeau d'état `isReady` pour savoir quand les données sont prêtes. Le passage à `true` se fait dans un bloc **`finally`** pour garantir qu'il a lieu que le chargement réussisse ou échoue.

```tsx
const [isReady, setIsReady] = useState(false);

async function loadNotes() {
  try {
    const raw = await AsyncStorage.getItem("@notes");
    if (raw) setNotes(JSON.parse(raw));
  } catch (e) {
    console.error("Erreur lors du chargement", e);
  } finally {
    setIsReady(true);
  }
}
```

### Exposer `isReady` dans le contexte

On étend le **contrat de type** du contexte (`types.ts`) pour inclure `isReady`, et on le passe dans la `value` du provider afin que les consommateurs puissent réagir à l'état de chargement.

```ts
// types.ts — le contrat
export type NotesContextType = {
  notes: Array<Note>;
  addNote: (note: {...}) => void;
  deleteNote: (id: string) => void;
  isReady: boolean;
};
```

```tsx
// Le value du provider
<NotesContext.Provider
  value={{ notes, addNote, deleteNote, isReady }}
>
  {children}
</NotesContext.Provider>
```

### Afficher un écran de chargement proprement

#### Pourquoi un écran de chargement

- Le chargement `AsyncStorage` est **asynchrone** (souvent < 1 s).
- Sans gestion : l'interface s'affiche dans un état incohérent.
- Il faut empêcher l'UI de s'afficher **trop tôt**.
- Cela évite qu'un composant reçoive `undefined` (données pas encore chargées).

#### Le composant `LoadingScreen`

Utilise les composants natifs `View`, `Text` et **`ActivityIndicator`** (spinner natif React Native). Centrage via `flex: 1`, `justifyContent: "center"`, `alignItems: "center"`. `ActivityIndicator` accepte la prop `size="large"`.

```tsx
import { View, Text, ActivityIndicator } from "react-native";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>Chargement des notes…</Text>
    </View>
  );
}
```

### Le piège : monter ≠ consommer

**Le composant qui monte `<NotesProvider>` ne peut pas appeler `useNotes()`.** S'il le fait, on obtient l'erreur :

> « useNotes must be used within a NotesProvider »

Raison : le hook serait utilisé **en dehors** de son provider (le provider n'englobe pas le composant qui l'instancie).

**Solution : séparer en deux composants** — un composant parent qui monte le provider, et un composant enfant qui le consomme.

De même, on n'affiche **pas** le chargement directement dans `_layout` (le composant racine qui monte le provider), mais dans un composant enfant qui, lui, peut consommer le contexte.

### `RootLayout` monte, `RootNavigator` consomme

Pattern recommandé avec Expo Router : `RootLayout` (export default) monte le `NotesProvider`, et `RootNavigator` (enfant) appelle `useNotes()`, lit `isReady`, et affiche soit le `LoadingScreen`, soit la navigation `Stack`.

```tsx
function RootNavigator() {
  const { isReady } = useNotes();

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="note/create" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <NotesProvider>
      <RootNavigator />
    </NotesProvider>
  );
}
```

Options de navigation illustrées :
- `headerShown: false` masque l'en-tête d'un écran.
- `presentation: "modal"` présente un écran en modale.

Le cycle complet de persistance est alors bouclé :

```
Créer (addNote) → Sauvegarder (saveNotes) → Recharger (loadNotes) → Afficher (useNotes) → …
```

### Aller plus loin : SplashScreen native

- `expo-splash-screen` retient l'écran de démarrage **natif** : l'app ne s'affiche qu'une fois les données prêtes.
- Plus « clean », mais **pas nécessaire** pour la plupart des projets.
- Un simple `LoadingScreen` suffit largement dans la majorité des cas.

### SecureStore — stocker une donnée sensible (chiffrée)

#### La limite d'AsyncStorage

**Les données AsyncStorage ne sont pas chiffrées, même si elles sont locales.**
- Sans risque pour des notes ou des préférences.
- **Dangereux** pour un **token**, un identifiant, un mot de passe.
- Pour le sensible : il faut un stockage **chiffré**.

#### C'est quoi SecureStore

- `expo-secure-store` : stockage **clé / valeur chiffrées**.
- Les données sont stockées dans le **Keychain iOS** / **Keystore Android** (mécanismes de chiffrement natifs de l'OS).
- C'est la solution **recommandée** pour toute donnée critique.

Installation :

```bash
npx expo install expo-secure-store
```

#### API : `setItemAsync` / `getItemAsync`

L'API est asynchrone. On importe tout le module (`import * as SecureStore`). Écriture avec `SecureStore.setItemAsync(cle, valeur)`, lecture avec `SecureStore.getItemAsync(cle)`.

```ts
// utils/secureToken.ts — Écrire
import * as SecureStore from "expo-secure-store";

export async function setToken(token: string) {
  try {
    await SecureStore.setItemAsync("user_token", token);
  } catch (error) {
    console.error("Erreur d'enregistrement :", error);
  }
}
```

```ts
// Lire
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync("user_token");
  } catch (error) {
    console.error("Erreur de lecture :", error);
    return null;
  }
}
```

Le type de retour de lecture est `Promise<string | null>` : la valeur peut être absente (`null`).

#### Utiliser le token dans un composant

Appel des fonctions async dans un `useEffect` (via une fonction interne, car `useEffect` n'est pas `async`), avec dépendances `[]`.

```tsx
export function TokenExample() {
  useEffect(() => {
    async function testSecureStore() {
      await setToken("mon-token-secret");
      const token = await getToken();
      // token === "mon-token-secret"
    }

    testSecureStore();
  }, []);

  return <Text>Token stocké en sécurité</Text>;
}
```

### La règle de décision : sensible = SecureStore

**Si la donnée peut authentifier un utilisateur ou accéder à des ressources sensibles, elle doit être chiffrée.**

| Type de donnée | AsyncStorage | SecureStore |
|---|---|---|
| Note, thème, langue | Oui | Non |
| Token d'authentification | Non | Oui |
| Mot de passe, clé API | Non | Oui |
| Donnée temporaire sans risque | Oui | Non |

### Concepts transverses et bonnes pratiques (récapitulatif)

- **Sérialisation obligatoire** : AsyncStorage ne stocke que des chaînes → `JSON.stringify` en écriture, `JSON.parse` en lecture.
- **Toujours envelopper les accès stockage dans `try/catch`** (les opérations peuvent échouer).
- **Écriture au fil des mutations** : persister à chaque `add`/`delete`, en persistant la valeur **mise à jour** calculée dans l'updater fonctionnel de `setState`.
- **Réhydratation au montage** via `useEffect(..., [])`, avec fonction `async` interne (un `useEffect` ne peut pas être `async`).
- **Drapeau `isReady`** basculé dans un bloc `finally` pour couvrir succès et échec, exposé via le contexte, utilisé pour commander un écran de chargement.
- **Séparation monter / consommer** : le composant qui monte un provider ne peut pas consommer son hook (erreur « must be used within a Provider ») → scinder en deux (parent monteur / enfant consommateur).
- **Convention de clés** : préfixe `@` (ex. `@notes`), clés claires et isolées.
- **Choix du stockage selon la sensibilité** : AsyncStorage (non chiffré) pour le non sensible ; SecureStore (Keychain iOS / Keystore Android, chiffré) pour tokens, mots de passe, clés API.
- **`npx expo install`** (plutôt que `npm install`) pour les paquets natifs, afin d'obtenir la version compatible avec le SDK.
- **`Alert`** (API React Native) pour les confirmations d'action destructrice (ex. « Tout effacer »).


