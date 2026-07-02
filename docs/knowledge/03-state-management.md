## Module 3 — Gérer l'état dans une app React Native

### Qu'est-ce que l'état (state)
- L'état, ce sont les **données internes** de l'application qui **évoluent dans le temps** : mémorisées, affichées, parfois partagées.
- C'est l'**action de l'utilisateur** qui les modifie.
- Exemples d'état : le contenu d'un champ de formulaire ; la liste de notes de l'utilisateur ; son nom / email une fois connecté ; la langue et le thème clair/sombre.

### Pourquoi la gestion d'état est plus critique en mobile
- On passe d'un écran à l'autre **sans recharger** (contrairement au web où un rechargement de page réinitialise tout).
- Il faut **garder les données en mémoire entre les navigations**.
- L'interface doit réagir **en temps réel**.

### Les 3 grands types d'état
Modèle mental central du module :

| Type | Où | Quand |
|------|-----|-------|
| **Local** (`useState`) | Dans un composant | Donnée propre à un écran |
| **Global** (Context) | Dans un Provider | Partagée dans toute l'app |
| **Persistant** (stockage) | Mémoire du téléphone | Survit au redémarrage |

### L'état local avec `useState()`

**Caractéristiques de l'état local :**
- Appartient à **un seul composant**.
- Pas besoin d'être partagé.
- Vit le temps que le composant est affiché ; **disparaît dès qu'on quitte l'écran**.
- Rapide, zéro setup. Parfait pour un champ isolé (champ de saisie, case cochée, compteur).

**Cycle de vie visuel de l'état local :** `Action → useState (état local) → Re-rendu → sortie écran → Perdu`.

**Pièges de l'état local :**
- Une donnée d'écran **disparaît dès qu'on change d'écran**.
- Elle n'est **pas accessible ailleurs**.
- Risque de **dupliquer la logique** entre composants.

**Forme minimale d'un champ contrôlé** (le pattern de base) :
```tsx
const [text, setText] = useState("");

<TextInput value={text} onChangeText={setText} />
<Text>{text}</Text>
```

### Le champ contrôlé (controlled input) en React Native

Différence clé avec le web : en React Native le champ texte est `TextInput` (et non `<input>`), et l'événement de saisie est **`onChangeText`** (qui reçoit directement la chaîne, pas un objet event) — et non `onChange`.

**Exemple complet d'un écran formulaire (Expo Router) :**
```tsx
import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function CreateNoteScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const router = useRouter();

  function handleSave() {
    console.log({ title, content }); // temporaire
    router.back(); // ferme la modal
  }
  // … le JSX du formulaire
}
```

**Le JSX correspondant (champs contrôlés) :**
```tsx
<View style={styles.container}>
  <Text style={styles.heading}>Créer une nouvelle note</Text>

  <TextInput
    placeholder="Titre de la note"
    value={title}
    onChangeText={setTitle}
    style={styles.input}
  />

  <Button title="Enregistrer" onPress={handleSave} />
</View>
```

**Cycle d'un champ contrôlé :** `Saisie → onChangeText → setTitle() → Re-rendu → value à jour` (boucle rétroactive vers la saisie).
- `setTitle(...)` **met à jour l'état ET provoque un re-render**.
- La valeur est **pilotée par React**, pas par le champ natif.
- Rafraîchissement automatique, rien à faire manuellement.
- Comportement 100 % local.

Notes d'API :
- `Button` utilise la prop **`title`** (le libellé) et **`onPress`** (et non `onClick`).
- Navigation : `useRouter()` d'`expo-router` fournit `router.back()` pour fermer une modal / revenir à l'écran précédent.

### Passer des données via la navigation (paramètres d'URL)

**Rappels du module 2 (acquis) :**
- Navigation impérative `router.push()` / déclarative `<Link href="…" />`.
- Retour arrière `router.back()` ; ouverture en modal via l'option `presentation: 'modal'`.
- Routes dynamiques : fichier **`[id].tsx`**.
- Lecture des paramètres d'URL avec **`useLocalSearchParams()`** :
```tsx
const { id } = useLocalSearchParams<{ id: string }>();
```
(le générique typé `<{ id: string }>` documente la forme des params attendus.)

**Option 1 — passer un objet sérialisé dans l'URL :**
```tsx
router.push({
  pathname: "/",
  params: {
    note: JSON.stringify({ title: "Hello", content: "..." }),
  },
});
```
On passe un objet en paramètre de route en le sérialisant en JSON (chaîne).

**Pourquoi l'URL ne suffit pas** (limites des paramètres de navigation) :
- Il faut **sérialiser / désérialiser à la main** (`JSON.stringify` / `JSON.parse`).
- **Limité en taille** (URLs longues).
- **Pas de fonctions ni de références complexes** transmissibles.
- **Aucun contrôle du cycle de vie** de la donnée.
- **Impossible de muter la liste réelle** : on ne transmet qu'une **copie figée**, pas la source.

**Deux modèles de partage :**
- Mauvais : `Modal → copie figée → Accueil` (chaque écran reçoit une copie indépendante).
- Bon : `Modal → addNote → Source de vérité → notes → (Accueil / Détail)` (une source unique alimente plusieurs écrans).

**Comparatif Paramètres d'URL vs État global (Context) :**

| Paramètres d'URL | État global (Context) |
|------------------|------------------------|
| Facile à mettre en place | Un peu plus de setup |
| OK pour valeurs simples | OK pour valeurs simples |
| Objets complexes : non | Objets complexes : oui |
| Multi-écrans : non | Multi-écrans : oui |
| Synchro auto : non | Synchro + persiste à la navigation |

### L'état global avec React Context

**Le besoin / problème résolu :** on veut créer une note dans `note/create.tsx` et qu'elle apparaisse dans la liste d'accueil. Avec `useState()` seul, **chaque écran a sa propre mémoire** → pas de partage possible. Le Context crée une **source de vérité unique**.

**Flux d'un Context :** `Modal (addNote) → écrit → NotesProvider (source de vérité) → notes → (Accueil / Détail)`. Le provider centralise l'état ; les écrans consommateurs le lisent.

**1. Définition du type et création du contexte :**
```tsx
import { createContext, useContext, useState } from "react";

type Note = { id: string; title: string; content: string };

type NotesContextType = {
  notes: Array<Note>;
  addNote: (note: { title: string; content: string }) => void;
  deleteNote: (id: string) => void;
};

const NotesContext =
  createContext<NotesContextType | undefined>(undefined);
```
Point technique : le contexte est initialisé à `undefined` et typé `NotesContextType | undefined` — ce qui force à vérifier sa présence dans le hook d'accès (voir plus bas).

**2. Le Provider (détient l'état + la logique métier) :**
```tsx
export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Array<Note>>([]);

  function addNote(note: { title: string; content: string }) {
    const newNote = { id: Date.now().toString(), ...note };
    setNotes((prev) => [newNote, ...prev]);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }

  return (
    <NotesContext.Provider value={{ notes, addNote, deleteNote }}>
      {children}
    </NotesContext.Provider>
  );
}
```
Bonnes pratiques illustrées :
- Génération d'`id` avec `Date.now().toString()`.
- **Mise à jour immuable** via la forme fonctionnelle du setter : `setNotes((prev) => [newNote, ...prev])` (ajout en tête) et `setNotes((prev) => prev.filter(...))` (suppression). On ne mute jamais le tableau directement.
- Le `value` du Provider expose à la fois l'état (`notes`) et les actions (`addNote`, `deleteNote`).

**3. Le hook d'accès `useNotes()` (avec garde-fou) :**
```tsx
export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error("useNotes must be used within a NotesProvider");
  }
  return context;
}
```
Pattern important : un hook custom encapsule `useContext` et **lève une erreur explicite** si le composant n'est pas enveloppé par le Provider — évite les bugs silencieux (`undefined`).

**4. Envelopper l'app avec le Provider (dans `_layout.tsx`) :**
```tsx
import { NotesProvider } from "@/contexts/notes";

export default function RootLayout() {
  return (
    <NotesProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="note/create" options={{ presentation: "modal" }} />
      </Stack>
    </NotesProvider>
  );
}
```
Notes : import via l'alias `@/` ; configuration des écrans du `Stack` avec `options` (`headerShown: false`, `presentation: "modal"`).

**5. Écrire depuis la modal :**
```tsx
import { useNotes } from "@/contexts/notes";

export default function CreateNoteScreen() {
  const { addNote } = useNotes();
  // … title, content, router déjà en place (leçon 2)

  function handleSave() {
    addNote({ title, content });
    router.back();
  }
}
```

**6. Lire depuis l'accueil (`index.tsx`) :**
```tsx
import { FlatList, Text, View } from "react-native";
import { useNotes } from "@/contexts/notes";

export default function NotesScreen() {
  const { notes } = useNotes();

  return (
    <FlatList
      data={notes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
          <Text>{item.content}</Text>
        </View>
      )}
    />
  );
}
```

### Structurer proprement un Context (architecture évolutive)

**Pourquoi réorganiser :** dès qu'on veut modifier/supprimer une note, gérer plusieurs états (auth, thème, settings) et séparer la logique métier des composants, un fichier unique ne suffit plus.

**Un dossier par contexte** — découpage en 4 fichiers :
```
contexts/
└── notes/
    ├── NotesProvider.tsx   // état + logique
    ├── useNotes.ts         // accès au contexte
    ├── types.ts            // le contrat
    └── index.ts            // barrel d'export
```

**`types.ts` — le contrat (types partagés) :**
```ts
export type Note = {
  id: string;
  title: string;
  content: string;
};

export type NotesContextType = {
  notes: Array<Note>;
  addNote: (note: { title: string; content: string }) => void;
  deleteNote: (id: string) => void;
};
```

**`useNotes.ts` (hook isolé) :**
```ts
import { useContext } from "react";
import { NotesContext } from "./NotesProvider";

export function useNotes() {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error(
      "useNotes must be used within a NotesProvider",
    );
  }
  return context;
}
```

**`index.ts` — le barrel d'export** (point d'entrée unique du module) :
```ts
export { NotesProvider } from "./NotesProvider";
export { useNotes } from "./useNotes";
export type { Note } from "./types";
```

**Mauvaise vs bonne pratique :**

| À éviter | Recommandé |
|----------|------------|
| Tout dans un seul fichier | Composants / logique / types séparés |
| Pas de typage | Types explicites dans `types.ts` |
| Pas de hook dédié | Hook `useNotes()` centralisé |
| Intestable, fragile | Architecture prête à scaler |

**Composer plusieurs providers** (imbrication) :
```tsx
<AuthProvider>
  <NotesProvider>
    <ThemeProvider>
      <Stack>...</Stack>
    </ThemeProvider>
  </NotesProvider>
</AuthProvider>
```
Chaque domaine d'état (auth, notes, thème) a son propre provider ; ils s'imbriquent autour de l'arbre de navigation.

### Afficher une liste performante avec `FlatList`

**Pourquoi pas un simple `.map()` :**

| `ScrollView` + `.map()` | `FlatList` |
|--------------------------|------------|
| Rend **tous** les éléments d'un coup | **Virtualisée** |
| Même ceux hors écran | Ne rend que le visible (+ marge) |
| Mémoire et fluidité en souffrent | Recycle au défilement |

`FlatList` est virtualisée : elle ne rend que les éléments visibles (plus une marge) et recycle les vues au défilement, contrairement à `ScrollView` + `.map()` qui monte tout d'un coup.

**Les trois props essentielles :**
```tsx
<FlatList
  data={notes}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <View>
      <Text>{item.title}</Text>
    </View>
  )}
/>
```
- **`data`** : le tableau de données (les notes).
- **`renderItem`** : fonction qui affiche **un** élément ; reçoit un objet déstructuré `{ item }`.
- **`keyExtractor`** : renvoie la **clé unique** de chaque ligne.

**`keyExtractor` : toujours par `id`** (piège classique de la clé) :
```tsx
// La seule clé fiable
keyExtractor={(item) => item.id}

// Le piège classique (à éviter)
keyExtractor={(item, index) => index.toString()}
```
Utiliser l'`index` comme clé est un anti-pattern : les clés deviennent instables quand la liste change (ajout/suppression/réordonnancement), ce qui casse le rendu et l'état des lignes.

**État vide avec `ListEmptyComponent` :**
```tsx
<FlatList
  data={notes}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <NoteRow note={item} />}
  ListEmptyComponent={
    <Text>Aucune note pour l'instant. Crée la première !</Text>
  }
/>
```
`ListEmptyComponent` s'affiche automatiquement quand `data` est vide.

**Séparateurs et en-tête avec `ItemSeparatorComponent` / `ListHeaderComponent` :**
```tsx
<FlatList
  data={notes}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <NoteRow note={item} />}
  ItemSeparatorComponent={() => (
    <View style={{ height: 1, backgroundColor: "#eee" }} />
  )}
  ListHeaderComponent={<Text style={{ fontSize: 24 }}>Mes notes</Text>}
/>
```
- `ItemSeparatorComponent` : rendu **entre** les items (pas avant le premier ni après le dernier).
- `ListHeaderComponent` : en-tête de liste.

**Ligne avec bouton de suppression (`Pressable` + layout flex) :**
```tsx
renderItem={({ item }) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <View>
      <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
      <Text>{item.content}</Text>
    </View>
    <Pressable onPress={() => deleteNote(item.id)}>
      <Text>🗑</Text>
    </Pressable>
  </View>
)}
```
Points de style/layout : `flexDirection: "row"`, `alignItems: "center"`, `justifyContent: "space-between"` ; interaction tactile via **`Pressable`** avec `onPress`. La suppression cible la ligne **par `item.id`** (jamais par position).

### Écran de détail branché sur la vraie note

Combinaison route dynamique + Context : lire l'`id` depuis l'URL, retrouver la note dans le state global, gérer le cas « note introuvable ».
```tsx
export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes } = useNotes();
  const note = notes.find((n) => n.id === id);

  if (!note) {
    return (
      <View style={{ padding: 24 }}>
        <Text>Cette note n'existe pas (ou plus).</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>{note.title}</Text>
      <Text>{note.content}</Text>
    </View>
  );
}
```
Bonne pratique : on récupère la note par `id` (`notes.find((n) => n.id === id)`) et on **gère toujours l'absence** (`if (!note)`), car une note peut avoir été supprimée entre-temps.

### Édition d'une note — principes (mise à jour ciblée par `id`)

Concepts à retenir pour enrichir le Context avec l'édition :
- `updateNote(id, data)` **met à jour la note ciblée par `id`, sans toucher les autres** (mise à jour immuable sélective).
- On **cible toujours par `id`, jamais par position** (l'index n'est pas fiable).
- On **récupère la note à éditer par son `id`** via `find` sur `notes`.
- L'écran/modal d'édition est **pré-rempli** avec le titre + contenu actuels.
- Après validation, la liste affiche la version modifiée **sans rechargement** (réactivité du Context) — plusieurs écrans restent synchronisés automatiquement.
- Variantes utiles évoquées : ajouter un `getNoteById(id)` au provider ; un champ `updatedAt` (« modifiée le… ») ; désactiver « Enregistrer » si le titre est vide.

### Récapitulatif des API / composants React Native & Expo Router cités
- **React** : `useState`, `createContext`, `useContext`, hook custom (`useNotes`), mise à jour immuable via setter fonctionnel `set((prev) => …)`, type `React.ReactNode` pour `children`.
- **react-native** : `View`, `Text`, `TextInput` (prop `value` + `onChangeText`), `Button` (props `title` + `onPress`), `Pressable` (`onPress`), `ScrollView` (comparaison), `FlatList` (props `data`, `renderItem` `{ item }`, `keyExtractor`, `ListEmptyComponent`, `ItemSeparatorComponent`, `ListHeaderComponent`), styles inline (`flexDirection`, `alignItems`, `justifyContent`, `padding`, `fontWeight`, `fontSize`, `backgroundColor`, `height`).
- **expo-router** : `useRouter()` → `router.push()` (avec `pathname` + `params`) / `router.back()` ; `<Link href="…" />` ; `useLocalSearchParams<T>()` ; `Stack` + `Stack.Screen` avec `options` (`headerShown`, `presentation: "modal"`) ; routes dynamiques `[id].tsx` ; convention de fichiers (`app/index.tsx`, `note/create.tsx`, `note/[id].tsx`, `_layout.tsx`) ; alias d'import `@/`.


