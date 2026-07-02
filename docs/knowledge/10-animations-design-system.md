## Module 10 — Animations & design system mobile

### Pourquoi animer une application mobile

Le mouvement fait partie du langage d'une application mobile : c'est un élément indispensable, pas décoratif. **Le mouvement informe, il ne décore pas.** Une bonne animation répond à trois questions inconscientes de l'utilisateur :

- **D'où ça vient, où ça va ?** — L'écran glisse depuis la droite signifie « vous avancez ».
- **Qu'est-ce qui vient de changer ?** — La liste se réorganise en douceur pour montrer l'évolution.
- **Mon action a-t-elle été prise en compte ?** — Le bouton réagit au toucher.

Comparaison sans animation / avec animation :

| Sans animation | Avec animation |
|---|---|
| La note surgit d'un coup | La note apparaît en fondu |
| Une suppression fait « sauter » la liste | Les voisines glissent pour combler le trou |
| L'œil doit chercher ce qui a changé | Le regard suit naturellement |
| Sensation : brutal, « pas fini » | Sensation : fluide, soigné |

Principe directeur : **discret, rapide, cohérent**. Les meilleures animations sont celles qu'on ne remarque pas.

### Le défi de performance : tenir 60 fps

Une animation utile est une animation **fluide**, sans saccade. Le problème vient de l'architecture des threads :

- Le JavaScript tourne sur **un seul thread**.
- Si ce thread est occupé (requête réseau, recalcul de liste…), une animation pilotée par ce même thread **saccade**.
- Elle doit attendre que le JS soit libre pour dessiner la frame suivante.

**Solution : animer sur l'UI thread.** Le thread JS peut être occupé sans bloquer l'animation, car l'UI thread tourne indépendamment à 60 fps. C'est exactement le rôle de la bibliothèque Reanimated.

### react-native-reanimated : installation

```bash
npx expo install react-native-reanimated react-native-worklets
npx expo start --clear
```

Points clés d'installation :
- Le **plugin Babel** est **configuré automatiquement** par `babel-preset-expo` (pas de config manuelle).
- `react-native-worklets` fournit le **moteur de l'UI thread**.
- Il faut **redémarrer avec `--clear`** (cache vidé) après l'installation.

### La shared value : le cœur de Reanimated

Une **shared value** est une valeur **animable**, partagée entre le thread JS et l'UI thread.

- Créée avec `useSharedValue(valeurInitiale)`.
- Lue et écrite via la propriété `.value`.
- `useAnimatedStyle` la connecte à un style ; ce style est **recalculé sur l'UI thread** à chaque changement de la valeur.

Chaîne de données : `useSharedValue(1)` → `.value` → `useAnimatedStyle` → `Animated.View` (style recalculé sur l'UI thread).

Exemple d'une boîte qui s'estompe au toucher :

```jsx
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming,
} from "react-native-reanimated";
import { Pressable, StyleSheet } from "react-native";

export function FadeBox() {
  const opacity = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={() =>
        (opacity.value = withTiming(opacity.value === 1 ? 0.2 : 1))
      }
    >
      <Animated.View style={[styles.box, animatedStyle]} />
    </Pressable>
  );
}
```

### Trois règles à retenir pour animer

1. **On anime des composants `Animated.*`** (`Animated.View`, `Animated.Text`), pas les composants standard.
2. **`useAnimatedStyle` renvoie un objet de style** calculé à partir des `.value`.
3. **Jamais d'affectation brute** : on passe toujours par une fonction d'animation.
   - `withTiming(cible)` interpole en douceur (transition linéaire dans le temps).
   - `withSpring(cible)` ajoute un effet de ressort, plus naturel pour les interactions.

### Les animations de layout (le raccourci)

Trois props posées sur un `Animated.View` suffisent à animer apparition, disparition et repositionnement :

| Prop | Rôle | Exemple de valeur |
|---|---|---|
| `entering` | Comment l'élément **apparaît** | `FadeIn` |
| `exiting` | Comment il **disparaît** | `FadeOut` |
| `layout` | Comment il se **repositionne** | `LinearTransition` |

Application aux notes d'une liste :

```jsx
import Animated, {
  FadeIn, FadeOut, LinearTransition,
} from "react-native-reanimated";

function NoteItem({ note }: { note: Note }) {
  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      layout={LinearTransition}
    >
      {/* … le contenu de votre carte de note … */}
    </Animated.View>
  );
}
```

Résultat : ajout en fondu, suppression en fondu, et les notes restantes **glissent** pour combler le trou.

### Régler les durées (penser « discret »)

Les modificateurs de durée s'enchaînent sur les fonctions d'entrée/sortie via `.duration(ms)` :

```jsx
// Par défaut — effet correct, durées génériques
entering={FadeIn}
exiting={FadeOut}

// Calibré pour des notes — 200-300 ms suffisent, mêmes animations partout
entering={FadeIn.duration(250)}
exiting={FadeOut.duration(150)}
```

Bonne pratique : garder des durées **courtes et cohérentes** (200-300 ms), et réutiliser les mêmes animations partout.

### Deux pièges avec la FlatList

- **`exiting` ne se déclenche que si la donnée disparaît** réellement du tableau de données.
- Il faut garder un `keyExtractor={(item) => item.id}` : c'est ainsi que **Reanimated suit l'identité** des éléments.
- La `FlatList` est **virtualisée** : `exiting` / `layout` peuvent être **capricieux hors écran** (éléments non montés).
- Pour des listes courtes, l'approche layout-props suffit largement.

### Gérer les gestes avec react-native-gesture-handler

Objectif : détecter un swipe, le relier à une shared value, et révéler des actions.

**Installation et wrapper racine** — l'application doit être enveloppée dans `GestureHandlerRootView` à la racine :

```bash
npx expo install react-native-gesture-handler
```

```jsx
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* … vos providers et votre navigation … */}
    </GestureHandlerRootView>
  );
}
```

**L'API moderne : `Gesture` + `GestureDetector`**

```jsx
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const pan = Gesture.Pan()
  .onUpdate((event) => {
    // event.translationX : distance horizontale depuis le début
  })
  .onEnd((event) => {
    // event.velocityX : vitesse au relâchement
  });

// <GestureDetector gesture={pan}><Animated.View … /></GestureDetector>
```

Point clé : les callbacks `.onUpdate` / `.onEnd` sont des **worklets** — ils tournent sur l'UI thread et peuvent modifier directement une shared value.

Propriétés d'événement utiles :
- `event.translationX` : distance horizontale parcourue depuis le début du geste.
- `event.velocityX` : vitesse au relâchement (utile pour détecter un swipe rapide).

### La note swipeable : architecture à deux couches

Le pattern d'une carte swipeable superpose deux couches : une carte **opaque** au-dessus, et les **actions dessous** (masquées par défaut). Un swipe vers la gauche fait glisser la carte et **révèle les actions** cachées en dessous.

**Borner et caler le geste** — la position est contrainte entre l'état ouvert et fermé, et on « cale » sur l'un des deux à la fin :

```jsx
const translateX = useSharedValue(0);
const startX = useSharedValue(0);

const pan = Gesture.Pan()
  .activeOffsetX([-10, 10]) // s'active à l'horizontale seulement
  .onBegin(() => { startX.value = translateX.value; })
  .onUpdate((event) => {
    const next = startX.value + event.translationX;
    // borné entre ouvert (-ACTIONS_WIDTH) et fermé (0)
    translateX.value = Math.min(0, Math.max(-ACTIONS_WIDTH, next));
  })
  .onEnd(() => {
    const opened = translateX.value < -ACTIONS_WIDTH / 2;
    translateX.value = withTiming(opened ? -ACTIONS_WIDTH : 0);
  });
```

Techniques importantes :
- `.activeOffsetX([-10, 10])` : le geste ne s'active qu'après un déplacement horizontal, pour ne pas interférer avec le scroll vertical.
- `.onBegin()` mémorise la position de départ (`startX`) afin d'accumuler les déplacements successifs.
- `Math.min` / `Math.max` bornent la translation entre la position ouverte (`-ACTIONS_WIDTH`) et fermée (`0`).
- `.onEnd()` décide de « caler » (snap) vers ouvert ou fermé selon que l'on a dépassé la moitié, avec `withTiming`.

**Connecter la position au style** :

```jsx
const cardStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: translateX.value }],
}));

// <GestureDetector gesture={pan}>
//   <Animated.View style={[styles.card, cardStyle]}>
```

Flux complet : geste Pan `onUpdate` → écrit `translateX` (shared value) → lu par `useAnimatedStyle` → `Animated.View` avec `transform: translateX`.

### runOnJS : du worklet vers le JavaScript

Problème fondamental : les callbacks de geste (`onEnd`, etc.) sont des **worklets qui tournent sur l'UI thread**, alors que les fonctions métier (comme `onDelete`) sont du **JavaScript classique** sur le thread JS. Les appeler directement depuis un worklet **plante** — il faut une passerelle : `runOnJS`.

```jsx
import { runOnJS } from "react-native-reanimated";

.onEnd((event) => {
  // relâché vite vers la gauche → suppression directe
  if (event.velocityX < -1000) {
    runOnJS(onDelete)(note.id);
    return;
  }
  const opened = translateX.value < -ACTIONS_WIDTH / 2;
  translateX.value = withTiming(opened ? -ACTIONS_WIDTH : 0);
});
```

Règle : **tout appel de code JavaScript depuis un geste/worklet doit passer par `runOnJS(fn)(args)`**.

**Brancher un composant swipeable sur une liste** :

```jsx
const { notes, deleteNote } = useNotes();
const router = useRouter();

<FlatList
  data={notes}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <SwipeableNote
      note={item}
      onEdit={(id) => router.push(`/note/${id}`)}
      onDelete={(id) => deleteNote(id)}
    />
  )}
/>;
```

On combine avec les animations de layout (`exiting={FadeOut}` + `layout`) pour une suppression en douceur.

### Construire un mini design system

Motivation — le problème des **valeurs éparpillées** : des couleurs, espacements et rayons codés en dur (`backgroundColor: "#2563eb"`, `padding: 16`, `borderRadius: 12`) répétés dans chaque fichier. Changer la couleur oblige à « fouiller partout ». Avec des tokens (`theme.colors.primary`, `theme.spacing.md`, `theme.radius.md`), on a **une seule source** : changer un token et tout suit.

**Étape 1 : définir les tokens**

```ts
export const lightTheme = {
  colors: {
    background: "#ffffff",
    surface: "#f3f4f6",
    text: "#111827",
    textMuted: "#6b7280",
    primary: "#2563eb",
    danger: "#dc2626",
    border: "#e5e7eb",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 20 },
  typography: {
    title: { fontSize: 20, fontWeight: "700" },
    body: { fontSize: 16, fontWeight: "400" },
    caption: { fontSize: 13, fontWeight: "400" },
  },
} as const;
```

**Le thème sombre, par-dessus le clair** — on réutilise le thème clair par étalement (`...lightTheme`) pour garder spacing/radius/typographie et on ne surcharge que les couleurs :

```ts
export const darkTheme = {
  ...lightTheme, // mêmes spacing, radius, typo
  colors: {
    background: "#0b0b0f", surface: "#1f2937",
    text: "#f9fafb", textMuted: "#9ca3af",
    primary: "#3b82f6", danger: "#ef4444", border: "#374151",
  },
} as const;

export type Theme = typeof lightTheme | typeof darkTheme;
```

Rôle de `as const` : **fige les littéraux** — sans lui, `"700"` serait élargi au type `string`, alors qu'on veut conserver le type littéral exact `"700"`. Le type `Theme` est l'**union** des deux thèmes.

**Étape 2 : le hook `useTheme`** — React Native connaît déjà la préférence système via `useColorScheme()` ; on l'enveloppe pour renvoyer le bon jeu de tokens :

```tsx
import { useColorScheme } from "react-native";
import { lightTheme, darkTheme, type Theme } from "./theme";

export function useTheme(): Theme {
  const scheme = useColorScheme(); // "light" | "dark" | null
  return scheme === "dark" ? darkTheme : lightTheme;
}
```

`useColorScheme()` retourne `"light"`, `"dark"` ou `null`.

**Étape 3 : des composants qui lisent le thème** — chaque composant appelle `useTheme()` et applique les tokens en styles inline :

```tsx
import { Pressable, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";

export function Button({ label, onPress }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={{
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radius.md,
    }}>
      <Text style={{ color: "#fff", ...theme.typography.body }}>{label}</Text>
    </Pressable>
  );
}
```

### Inline vs StyleSheet.create

Choix stratégique entre les deux approches de styles :

- `StyleSheet.create` est fait pour des styles **statiques**.
- Les valeurs issues du thème **dépendent du thème → elles sont dynamiques**.
- On **garde `StyleSheet.create` pour le fixe** (par ex. `hairlineWidth`, positions).
- On **passe en inline** pour tout ce qui vient des tokens (couleurs, espacements dépendant du thème).

### Débloquer le mode sombre (config Expo)

Par défaut, **Expo verrouille en clair** : `useColorScheme()` renvoie toujours `"light"`. Il faut débloquer le thème système dans `app.json` :

```json
{
  "expo": {
    "userInterfaceStyle": "automatic"
  }
}
```

Points clés :
- `"automatic"` débloque le suivi du thème système.
- Installer `expo-system-ui` (évite un flash blanc sur Android).
- C'est une **config native** → il faut **relancer le build**, un simple fast refresh ne suffit pas.

**Appliquer et basculer** — un écran qui lit `theme` se met à jour automatiquement quand le système change :

```tsx
function NotesScreen() {
  const theme = useTheme();
  return (
    <View style={{
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.md,
    }}>
      {/* … votre FlatList de <Card> … */}
    </View>
  );
}
```

Flux de bascule : réglage système clair → sombre → `useColorScheme()` change → `useTheme()` renvoie `darkTheme` → nouveau rendu avec les couleurs sombres.

### Pistes d'extension (concepts mentionnés)

- **Détail animé** : un écran de détail `note/[id]` qui apparaît via la prop `entering`.
- **Feedback piloté au press** : un bouton qui réagit au toucher via `useSharedValue` + `useAnimatedStyle` (léger effet de scale).
- **Transition d'écran personnalisée** : via l'option `animation` d'un `Stack` (navigation).
- **Interrupteur clair/sombre applicatif** : gérer le thème via un Context React (plutôt que seulement la préférence système).


