## Module 2 — Navigation mobile avec Expo Router

### Pourquoi la navigation mobile est différente du web

La navigation mobile ne repose pas sur des « pages » mais sur des **écrans**. On raisonne en termes de **Stack**, **Tabs** et **Modals** plutôt qu'en simples pages. C'est un paradigme distinct de la navigation web.

**Web vs mobile : deux paradigmes**

Sur le web :
- On navigue entre des **pages**
- Chaque route = une **URL partageable**
- Le navigateur garde l'**historique**
- Bouton « Précédent » de la barre d'adresse

Sur mobile :
- On navigue entre des **écrans**
- **Pas de barre d'URL visible**
- On **empile** des écrans, on **ouvre des modales**
- Retour par **geste (swipe)** ou **bouton natif**

**Le modèle mental mobile, en un tableau**

| Sur le web | Sur le mobile |
|---|---|
| Navigation par URL | Pile d'écrans (stack) |
| `Link`, `navigate()` | `router.push()`, `router.back()` |
| Pages indépendantes | Écrans superposés |
| Barre d'adresse visible | Pas d'URL visible |
| Menu dans le header | Tabs en bas |
| Popup / modale flottante | Écran modal natif plein écran |

### Les trois formes de navigation mobile

**La Stack (pile d'écrans)**

Modèle : `Accueil → Produit → Commentaires`, où chaque navigation **empile** (`push`) un écran, et le retour **dépile** (`pop`) sans recharger. Chaque navigation empile un écran ; le retour dépile sans recharger.

**Tabs (onglets)**
- Barre en bas de l'écran
- Une branche par section
- Toujours visibles
- Exemple : Accueil / Recherche / Réglages

**Modals (modales)**
- Écran plein, par-dessus le reste
- Ce **n'est pas** un popup web flottant
- Se ferme par geste ou bouton
- Cas d'usage : créer une note, scanner un code

### Comprendre le fonctionnement d'Expo Router

Expo Router structure la navigation via le **dossier `app/`**. Il repose sur un routage **basé sur les fichiers** (file-based routing) : pas de table de routes à écrire.

**Le dossier `app/` : vos fichiers sont vos routes**
- `index.tsx` → route `/`
- `product/[id].tsx` → route `/product/42`
- Un fichier `.tsx` = un écran. Un dossier = une branche. **Pas de table de routes à écrire.**

**Les fichiers spéciaux à connaître**
- `index.tsx` — route par défaut d'un dossier
- `_layout.tsx` — layout partagé des enfants (Stack, Tabs…)
- `[param].tsx` — route dynamique, ex. `/note/123`
- `+not-found.tsx` — page 404, URL qui ne matche rien
- `(group)/` — dossier **virtuel**, absent de l'URL

**Expo Router vs React Router**

| React Router (web) | Expo Router (mobile) |
|---|---|
| `<Route path="/about" element={<About />} />` | `app/about.tsx` |
| `useParams()` | `useLocalSearchParams()` |
| route dynamique `path="/user/:id"` | `app/user/[id].tsx` |
| `<Outlet />` | `app/_layout.tsx` |

`useLocalSearchParams()` est l'équivalent Expo Router de `useParams()` de React Router. `_layout.tsx` joue le rôle de `<Outlet />`.

**Déjà installé dans votre projet**

Un projet créé avec `create-expo-app` (module 1) intègre déjà Expo Router.

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function Layout() {
  return <Stack />;
}
```

Ce `<Stack />` donne à tous vos écrans la navigation en pile, avec le **retour natif intégré**.

### Créer une navigation Stack

Modèle Stack natif : créer des écrans, naviguer entre eux, passer un paramètre, gérer le retour automatique.

**Deux écrans, une arborescence**

```
app/
├── index.tsx        ← Liste des notes (écran principal)
└── note/
    └── [id].tsx     ← Détail d'une note (route dynamique)
```

- `index.tsx` : la liste, point d'entrée
- `note/[id].tsx` : un détail par identifiant
- Les crochets `[id]` annoncent un paramètre

**`index.tsx` : la liste avec des liens**

```tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function NotesScreen() {
  return (
    <View style={styles.container}>
      <Link href="/note/123" asChild>
        <Pressable style={styles.note}>
          <Text>📝 Note 123</Text>
        </Pressable>
      </Link>
    </View>
  );
}
```

Le composant `<Link>` d'`expo-router` déclare une navigation. La prop `asChild` permet de passer le comportement de navigation à l'enfant (ici un `Pressable`) au lieu de rendre un élément propre.

**`note/[id].tsx` : lire le paramètre**

```tsx
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Note #{id}</Text>
    </View>
  );
}
```

`useLocalSearchParams()` = le `useParams()` d'Expo Router. On peut le typer avec un générique : `useLocalSearchParams<{ id: string }>()`.

**Le push et le pop, visuellement**
- `<Link href>` → **push** un écran (`index/liste → note/[id]/détail`)
- Retour **automatique** :
  - Android : bouton « back »
  - iOS : flèche + swipe droite
- **Aucun rechargement**, juste un dépilage

### Ajouter des Tabs (onglets de navigation)

Structurer l'application avec une navigation par onglets grâce au composant `Tabs` d'Expo Router.

**Un dossier de groupe pour les onglets**

```
app/
└── (tabs)/
    ├── _layout.tsx     ← définit la barre d'onglets
    ├── index.tsx       ← onglet Notes
    └── settings.tsx    ← onglet Réglages
```

Les parenthèses de `(tabs)` = dossier **virtuel** : il structure la navigation **sans apparaître dans l'URL**.

**Le layout Tabs**

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#007AFF",
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{
        title: "Notes",
        tabBarIcon: ({ color, size }) => (
          <Ionicons name="document-text-outline" color={color} size={size} />
        ),
      }} />
      <Tabs.Screen name="settings" options={{ title: "Réglages" }} />
    </Tabs>
  );
}
```

APIs :
- `<Tabs>` avec la prop `screenOptions` pour les options communes à tous les onglets.
- `tabBarActiveTintColor` : couleur de l'onglet actif.
- `headerShown: false` : masque l'en-tête.
- `<Tabs.Screen name="..." options={{...}}>` : configure chaque onglet.
- `title` : libellé de l'onglet.
- `tabBarIcon: ({ color, size }) => (...)` : fonction de rendu de l'icône, recevant `color` et `size`.
- Icônes via `Ionicons` de `@expo/vector-icons` (ex. `name="document-text-outline"`).

**Le piège des deux en-têtes**

Sans réglage : deux en-têtes sont empilés (`Stack header → (tabs) header → index`). Le groupe `(tabs)` apparaît dans le Stack racine, ce qui provoque un en-tête en double.

Solution — masquer l'en-tête du groupe avec `headerShown: false` :

```tsx
<Stack>
  <Stack.Screen
    name="(tabs)"
    options={{ headerShown: false }}
  />
</Stack>
```

**Stack et Tabs cohabitent**

```
app/
├── _layout.tsx          ← Stack racine (déclare (tabs))
├── (tabs)/
│   ├── _layout.tsx      ← barre d'onglets
│   ├── index.tsx        ← onglet Notes
│   └── settings.tsx     ← onglet Réglages
└── note/
    └── [id].tsx         ← détail — reste HORS de (tabs)
```

Principe : **Onglets** pour les grandes sections ; **Stack** pour empiler par-dessus. Un écran de détail comme `note/[id].tsx` reste hors de `(tabs)` afin d'être empilé au-dessus des onglets.

### Créer une Modal native

Une modale plein écran est un écran temporaire qui s'ouvre par-dessus le reste, sans perturber la navigation principale.

**Modale web vs modale mobile**

Web :
- Fenêtre flottante (popup)
- Au-dessus du contenu, en overlay
- Fermeture par bouton X

Mobile :
- Écran entier
- Slide up depuis le bas (iOS et Android)
- Fermeture par swipe down ou bouton

**Une seule option fait la modale**

```tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="note/create"
          options={{ presentation: "modal", title: "Nouvelle note" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
```

`presentation: "modal"` suffit : naviguer vers `/note/create` ouvre une **modale native**. `SafeAreaProvider` (de `react-native-safe-area-context`) enveloppe l'app pour gérer les zones sûres.

**`note/create.tsx` : un écran ordinaire**

Une modale est un écran comme un autre ; seule l'option `presentation: "modal"` du parent change son mode d'affichage.

```tsx
import { useRouter } from "expo-router";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useState } from "react";

export default function CreateNoteScreen() {
  const [content, setContent] = useState("");
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TextInput placeholder="Contenu" value={content}
        onChangeText={setContent} multiline />
      <Button title="Enregistrer et fermer" onPress={() => router.back()} />
    </View>
  );
}
```

APIs : `useRouter()` retourne l'objet `router` ; `router.back()` ferme l'écran courant (dépile). `TextInput` avec `multiline`, `value`, `onChangeText`. `Button` avec `title` et `onPress`.

**Ouvrir la modale : par code ou par lien**

```tsx
// par code
router.push("/note/create");

// ou par lien, avec un bouton flottant
<Link href="/note/create" asChild>
  <Pressable style={styles.fab}><Text>➕</Text></Pressable>
</Link>
```

Flux : `index — liste  --router.push('/note/create')-->  note/create — modale`, retour via `router.back()`.

### Transmettre des données entre les écrans

Passer des paramètres d'un écran à un autre, les récupérer avec `useLocalSearchParams()` et les utiliser dans l'interface.

**Côté détail : on lit déjà le paramètre**

```tsx
import { useLocalSearchParams } from "expo-router";

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Note #{id}</Text>;
}
```

**Piège important — les paramètres reviennent toujours en chaînes** : `/note/123` donne `{ id: "123" }`, **pas** le nombre `123`. Il faut **convertir** (ex. `Number(id)`) si besoin.

**Côté liste : deux formes de lien**

Forme courte (rapide, lisible) :

```tsx
<Link href="/note/123" asChild>
  <Pressable>
    <Text>📝 Note 123</Text>
  </Pressable>
</Link>
```

Forme objet (la plus sûre avec les **routes typées**) :

```tsx
<Link
  href={{
    pathname: "/note/[id]",
    params: { id: "456" },
  }}
  asChild
>
  <Pressable><Text>📝 Note 456</Text></Pressable>
</Link>
```

La forme objet sépare `pathname` (le patron de route, avec `[id]`) et `params` (les valeurs). Elle est recommandée avec les routes typées.

**Le flux complet, d'un écran à l'autre**

`Liste — Link href /note/123`  →(push avec id)→  `Détail — useLocalSearchParams`  →`{ id: '123' }`→  `Affiche Note #123`

### Navigation conditionnelle et gestion des erreurs (avancé)

Contrôler l'accès à certains écrans selon une condition, rediriger automatiquement un utilisateur et gérer les cas d'erreur comme une page 404.

**La méthode recommandée : `Stack.Protected`**

```tsx
import { Stack } from "expo-router";
import { useAuth } from "@/contexts/auth";

export default function RootLayout() {
  const { isAuthenticated } = useAuth();
  return (
    <Stack>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
```

`Stack.Protected` avec la prop `guard` (booléen) affiche/protège des écrans selon une condition. On peut avoir plusieurs blocs `Stack.Protected` avec des gardes complémentaires (`isAuthenticated` / `!isAuthenticated`) pour router entre l'app et l'écran de connexion.

**Sous le capot : `Redirect` et segments**

`<Redirect />` — redirection déclarative. Le rendu de `<Redirect>` = navigation immédiate.

```tsx
const [isLoggedIn] = useState(false);

if (!isLoggedIn) {
  return <Redirect href="/login" />;
}
```

`useSegments()` — savoir dans quelle branche on se trouve. Retourne un tableau des segments de l'URL courante.

```tsx
const segments = useSegments();
// /note/123        → ['note', '123']
// (tabs)/settings  → ['(tabs)', 'settings']
```

**La page 404 : `+not-found.tsx`**

```
app/
└── +not-found.tsx    ← s'affiche si l'URL ne matche AUCUN fichier
```

```tsx
import { Link } from "expo-router";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Erreur 404</Text>
      <Link href="/">Revenir à l'accueil</Link>
    </View>
  );
}
```

Le préfixe `+` est **obligatoire** : c'est ce qui en fait une route spéciale (`+not-found`).

**Piège : `/note/zzz` ne déclenche PAS la 404**
- `/oups/...` ne matche rien → **404** (`+not-found.tsx`)
- `/note/zzz` **matche** `note/[id]` → **détail** avec `id = "zzz"`
- Une route dynamique capte toute valeur : « Cette note n'existe pas » doit donc se gérer **dans `[id].tsx`** (logique applicative), et non via la page 404.


