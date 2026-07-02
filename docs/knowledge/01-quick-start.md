## Module 1 — Démarrage rapide avec React Native + Expo

### Expo : rôle et positionnement

- **Expo est un framework/surcouche outillée au-dessus de React Native.** La chaîne de couches est : `Votre code JS` → `Expo SDK` → `React Native` → `Couche native`.
- C'est l'approche **recommandée par défaut pour démarrer** ; la documentation officielle de React Native conseille elle-même de partir d'un framework.
- Expo est **pensé pour les développeurs venus du web**, c'est aujourd'hui la solution la plus adaptée pour ce public qui se lance dans le mobile.

### Ce que fournit Expo

- Création de projet en une seule commande : `create-expo-app`.
- **Rechargement instantané du code** (fast refresh).
- **Expo Go** : application permettant de tester le projet directement sur un téléphone réel.
- **Modules natifs préintégrés** : géolocalisation, caméra, capteurs, notifications, etc.
- **Builds en cloud avec EAS** (Expo Application Services), sans avoir besoin de Xcode ni d'Android Studio.

### Expo vs React Native CLI

| Expo | React Native CLI |
|------|------------------|
| 1 commande, 0 configuration | Setup complexe (dépendances Android/iOS) |
| Test via Expo Go, sans build | Simulateur ou build nécessaire |
| Modules `expo-*` prêts à l'emploi | Modules à *linker* à la main |
| Builds iOS/Android via EAS | Compilation via Xcode / Android Studio |
| Doux pour les débutants | Plus technique |

### Environnement de développement

Trois outils essentiels : **Node.js 20.19+** et **VS Code** alimentent l'**Expo CLI (via `npx`)**, qui communique avec **Expo Go** sur le téléphone.

Vérification de l'installation :

```bash
node -v
# v22.11.0   → au moins 20.19

npx expo --version
# 0.x.x      → le CLI répond
```

- Si un numéro s'affiche pour chacun, l'installation est bonne.
- `npx expo-doctor` (dans un projet) vérifie la cohérence des dépendances.
- **Installer un paquet avec `npx expo install <paquet>`, jamais `npm install`.** (Point important : `expo install` choisit les versions compatibles avec le SDK Expo.)

Pré-requis à mettre en place : Node ≥ 20.19, Expo CLI accessible, **Expo Go** installé sur le téléphone, un compte gratuit sur **expo.dev**, et **VS Code**.

### Créer et nettoyer un projet

Flux de zéro à l'app : `Créer` → `Reset` → `Lancer` → `Scan QR` → `App`.

```bash
npx create-expo-app starterpack
cd starterpack
npm run reset-project   # répondre Y pour déplacer l'exemple
npx expo start          # QR code + menu dans le terminal
```

- `create-expo-app` génère une **app d'exemple à onglets**, et non une page vide.
- `reset-project` range cet exemple dans `/example` et recrée un dossier `app/` minimal.
- Résultat : `index.tsx` + `_layout.tsx`, propre pour démarrer.
- On scanne ensuite le QR code avec **Expo Go** pour voir l'app sur le téléphone.

### Ce qui change à l'écran vs React web

À l'écran après reset : écran quasi vide affichant *« Edit app/index.tsx to edit this screen »*. Le **rendu est natif, pas une page web**.

Différences avec React web :
- **Pas d'`index.html`.**
- **Pas de dossier `public/`.**
- **Pas de DOM.**
- On manipule des **composants natifs de l'OS**.

### Structure d'un projet Expo

Arborescence après reset :

```
starterpack/
├── src/
│   └── app/                ← point d'entrée + routeur (Expo Router)
│       ├── _layout.tsx     ← layout global (providers)
│       └── index.tsx       ← écran d'accueil (route /)
├── assets/                 ← images, polices, icônes
├── package.json            ← dépendances et scripts
├── tsconfig.json           ← configuration TypeScript
├── app.json                ← configuration de l'app Expo
└── .gitignore
```

- Le dossier `app/` sert à la fois de **point d'entrée et de routeur** (Expo Router).
- `_layout.tsx` = layout global, endroit où placer les **providers**.
- `index.tsx` = écran d'accueil, correspond à la **route `/`**.

### Le point d'entrée `index.tsx`

```tsx
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bienvenue sur mon app Expo !</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 20, fontWeight: "bold" },
});
```

### Configuration : `app.json` et `package.json`

`app.json` — l'app telle que vue par Expo :

```json
{
  "expo": {
    "name": "StarterPack",
    "slug": "starterpack",
    "icon": "./assets/images/icon.png",
    "platforms": ["ios", "android", "web"]
  }
}
```

`package.json` — scripts :

```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web"
}
```

### Absence des globals du navigateur

- **Pas de `window`, pas de `document`, pas de `localStorage`.**
- Pas de DOM, pas de navigateur : **tout tourne en natif, dans un moteur JavaScript.**

### Premiers composants React Native (équivalences HTML)

| React Native | Web | React Native | Web |
|--------------|-----|--------------|-----|
| `View` | `div`, `section` | `TextInput` | `input` |
| `Text` | `p`, `h1`, `span` | `Pressable` | `button`, `a` |
| `Image` | `img` | `SafeAreaView` | aucun équivalent direct |
| `ScrollView` | div scrollable | | |

Écran combinant plusieurs composants (dont une image distante) :

```tsx
import { View, Text, Image, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://reactnative.dev/img/tiny_logo.png" }}
        style={styles.logo}
      />
      <Text style={styles.title}>Bienvenue sur mon app mobile 🚀</Text>
      <Text style={styles.subtitle}>Construite avec React Native + Expo</Text>
    </View>
  );
}
```

### Trois règles à retenir sur les composants

1. **Tout est composant : pas de texte nu dans une `View`.** Le texte doit toujours être encapsulé dans un `Text`.

```tsx
<View>Bonjour</View>              // ❌
<View><Text>Bonjour</Text></View> // ✅
```

2. **Le style est obligatoire :** sans style, le rendu est brut, parfois invisible.
3. **Les images s'importent :** via `require()` ou une URL, jamais avec un attribut `src="logo.png"`.

```tsx
<Image source={require("../assets/logo.png")} />
<Image source={{ uri: "https://example.com/img.jpg" }} />
```

### Les styles en React Native

Méthode recommandée : `StyleSheet.create()`. Passage de l'inline vers StyleSheet :

```tsx
// StyleSheet : objet nommé, séparé du JSX
const styles = StyleSheet.create({
  monTexte: { fontSize: 20, color: "blue" },
});

<Text style={styles.monTexte}>Bonjour</Text>;
```

Pourquoi `StyleSheet.create()` :
- **Performance :** styles précompilés en natif, pas recalculés à chaque rendu.
- **Lisibilité :** structure du composant et apparence séparées.
- **Typage :** autocomplétion et erreurs détectées (ex. une faute comme `textAlignn` est signalée).
- **L'inline est réservé au dynamique ponctuel** : `style={{ opacity: isActive ? 1 : 0.5 }}`.

### Propriétés de style courantes et pièges venus du web

| Catégorie | Propriétés | React web | React Native |
|-----------|-----------|-----------|--------------|
| Layout | `flex`, `flexDirection`, `gap` | `className` | `style={styles.x}` |
| Taille | `width`, `padding`, `margin` | `px`, `em`, `rem` | juste des **nombres** |
| Texte | `fontSize`, `fontWeight`, `color` | `:hover` | non supporté |
| Bordures | `borderWidth`, `borderRadius` | | |

Pièges clés vs web : **pas de `className`** (on passe `style`), **pas d'unités `px`/`em`/`rem`** (les tailles sont de simples nombres), **pas de `:hover`**.

Bonnes pratiques : appliquer les styles via `StyleSheet.create()`, réserver l'inline à un style dynamique court.

### Layout mobile avec Flexbox

Flexbox est le **système de layout par défaut** de React Native.

**La différence qui surprend** — la direction par défaut n'est pas la même que sur le web :
- **Web :** `flexDirection: row` par défaut → disposition **horizontale**.
- **React Native :** `flexDirection: column` par défaut → disposition **verticale**.

Propriétés clés :

| Propriété | Rôle |
|-----------|------|
| `flexDirection` | sens principal : `column` (défaut) ou `row` |
| `justifyContent` | alignement sur l'axe principal |
| `alignItems` | alignement sur l'axe secondaire |
| `gap` | espace entre les enfants (RN 0.71+) |
| `flex` | proportion de l'espace disponible |

### Le piège de `flex: 1`

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1, // = flex: 1 1 0 → flexBasis: 0
    justifyContent: "center",
    alignItems: "center",
  },
});
```

- En **web**, `flex: 1` ≈ `flex-grow: 1`.
- En **React Native**, `flex: 1` = `flex: 1 1 0` (avec `flexBasis: 0`).
- Conséquence : l'élément **part de zéro puis remplit tout l'espace** du parent.

### Layout en lignes (exemple)

```tsx
<View style={styles.row}>
  <View style={styles.box} />
  <View style={styles.box} />
  <View style={styles.box} />
</View>;

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  box: { width: 60, height: 60, backgroundColor: "#2196F3" },
});
```

Résultat : trois carrés alignés horizontalement, espacés également.

### Zones sûres et encoches (safe areas)

Problème des écrans modernes : le contenu risque de passer sous la **barre d'état**, l'**encoche**, la **Dynamic Island** ou la **barre de navigation**. Modèle mental : `Barre d'état / encoche` (haut) → `Zone sûre : votre contenu` (milieu) → `Barre home / navigation` (bas).

Installation et fourniture du contexte :

```bash
npx expo install react-native-safe-area-context
```

```tsx
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack />
    </SafeAreaProvider>
  );
}
```

Deux outils pour protéger l'écran :

- **`SafeAreaView`** — protège un écran entier, et permet de choisir les bords via `edges` :

```tsx
<SafeAreaView style={{ flex: 1 }}>
  <Text>À l'abri des encoches.</Text>
</SafeAreaView>

// choisir les bords
<SafeAreaView edges={["bottom"]}>
```

- **`useSafeAreaInsets`** — hook donnant les *insets* pour un ajustement précis :

```tsx
const insets = useSafeAreaInsets();
// insets.top / right / bottom / left

<View style={{ paddingBottom: insets.bottom + 12 }}>
```

Marche à suivre : installer `react-native-safe-area-context`, envelopper l'app dans un `SafeAreaProvider`, passer les écrans en `SafeAreaView` (en jouant avec `edges`), utiliser `useSafeAreaInsets` pour un ajustement précis.

### Clavier et formulaires mobiles

Objectif : empêcher le clavier de recouvrir les champs, et le refermer au bon moment. Les trois pièces d'un formulaire : `SafeAreaView` → `KeyboardAvoidingView` → `Pressable` → `TextInput`.

Le champ de saisie avec `TextInput` (composant contrôlé) :

```tsx
import { useState } from "react";
import { TextInput } from "react-native";

const [title, setTitle] = useState("");

<TextInput
  value={title}
  onChangeText={setTitle}
  placeholder="Titre de la note"
  keyboardType="default"   // "email-address", "numeric"…
  returnKeyType="done"
/>;
```

Props notables de `TextInput` : `value`, `onChangeText`, `placeholder`, `keyboardType` (`default`, `email-address`, `numeric`…), `returnKeyType` (`done`…).

Formulaire complet et robuste :

```tsx
<SafeAreaView style={{ flex: 1 }}>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <Pressable style={{ flex: 1 }} onPress={() => Keyboard.dismiss()}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Titre" />
    </Pressable>
  </KeyboardAvoidingView>
</SafeAreaView>;
```

Points clés :
- `KeyboardAvoidingView` évite que le clavier recouvre les champs ; son `behavior` **dépend de la plateforme** : `"padding"` sur iOS, `"height"` sur Android (`Platform.OS === "ios" ? "padding" : "height"`).
- `Keyboard.dismiss()` (déclenché ici via un `Pressable` englobant, sur `onPress`) referme le clavier au tap.
- Un `TextInput` contrôlé utilise le couple `value` + `onChangeText`.
- Toujours **vérifier le rendu sur iOS et Android** (comportements différents).

### Expo Go vs build de développement

- **Expo Go** charge votre code JS (via scan QR) mais avec des **modules figés** : `Votre code JS` → (scan QR) → `Expo Go` → `Modules figés`. Expo Go finit donc par montrer ses limites dès qu'on a besoin de modules natifs non inclus.
- **Le build de développement** est **votre propre version d'Expo Go** :
  - Vous compilez **votre** version, avec **vos** modules natifs.
  - Vous gardez tout le confort : fast refresh, menu dev, serveur de dev.
  - Deux façons de le fabriquer : **cloud (EAS)** ou **local**.

```bash
npx expo install expo-dev-client
```

EAS (cloud) vs build local :

**EAS Build — recommandé**
```bash
npm install -g eas-cli
eas login
eas build --platform android \
  --profile development
```
- Compile sur les serveurs Expo.
- Tier gratuit limité, sinon payant.

**Local — sans service**
```bash
npx expo run:android
npx expo run:ios
```
- Gratuit et illimité.
- Exige Android Studio / Xcode (Mac).

Comment choisir :

| Expo Go | Build de développement |
|---------|------------------------|
| Mise en route immédiate | Une compilation à faire |
| Modules figés par Expo | Les modules que **vous** ajoutez |
| Fast refresh, menu dev | Fast refresh, menu dev |
| Idéal : démarrer, prototyper | Idéal : tout projet qui grandit |

### Déboguer une app React Native

Menu développeur vs React Native DevTools :

**Menu développeur**
- Ouvrir : touche `m` dans le terminal.
- Recharger : touche `r`.
- Donne accès au débogueur, à l'inspecteur, aux perfs.

**React Native DevTools**
- Ouvrir : touche `j` dans le terminal.
- Onglets Console, Sources (points d'arrêt).
- Network, inspecteur de composants.

Les logs et leur sortie :

```js
console.log("valeur du titre :", title);
// terminal Expo    → valeur du titre : Courses
// Console DevTools → valeur du titre : Courses

console.warn("attention, cas limite");   // LogBox jaune
console.error("ne devrait pas arriver"); // LogBox rouge
```

- `console.log` apparaît dans le terminal **et** dans la Console des DevTools.
- `console.warn` / `console.error` s'affichent en plus dans l'app via la **LogBox** (jaune pour `warn`, rouge pour `error`).

Lire une erreur, lire un crash :

**Red box (erreur JS)**
- Le **message** (« undefined is not… »).
- La **pile d'appels** : à remonter.
- Elle indique votre fichier et votre ligne, souvent en haut.

**Crash natif (sans red box)**
- L'app se ferme d'un coup.
- Le JS ne dit plus rien.
- Logs natifs à consulter : `adb logcat` (Android) / console Xcode (iOS).


