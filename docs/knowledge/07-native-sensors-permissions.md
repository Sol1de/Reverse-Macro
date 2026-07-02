## Module 7 — Capteurs natifs & permissions

Ce module traite de l'accès aux capteurs physiques du smartphone depuis une application React Native (avec Expo), et de la gestion propre des permissions natives. Le thème central : *« Du web au mobile, sans détour »* — ce que le mobile apporte par rapport au web, et comment le mettre en œuvre en TypeScript sans écrire de Java/Swift.

### Pourquoi les capteurs natifs (ce que le web ne permet pas)

Les capteurs physiques d'un smartphone apportent des capacités que le navigateur web ne permet pas (ou pas de façon fiable). Le catalogue des capteurs et leurs usages typiques :

- **GPS** — position en temps réel : itinéraires, météo locale
- **Caméra / galerie** — scanner un ticket, photo de profil
- **Micro** — dictaphone, reconnaissance vocale
- **Accéléromètre / gyroscope** — mouvement, jeux, sport
- **Boussole** — direction absolue, randonnée
- **Vibration** — retour haptique, action confirmée

### Un module Expo par capteur

Chaque capteur passe par un **package dédié, maintenu par Expo** :

- `expo-location` — géolocalisation
- `expo-camera` — appareil photo
- `expo-sensors` — mouvement
- `expo-notifications` — alertes push

Points clés de l'architecture Expo pour les capteurs :

- **Les permissions sont gérées par chaque module** — il n'y a *pas* de paquet séparé pour gérer les permissions.
- L'installation se fait toujours via `npx expo install <module>` (ex. `npx expo install expo-location`), et non `npm install`, pour que la version du module soit compatible avec le SDK Expo.
- **Tout se fait en TypeScript, zéro Java/Swift** : les APIs natives sont exposées en JS/TS.

### Demander des permissions proprement

Objectif : demander une permission de façon claire, au bon moment, et gérer le cas où l'utilisateur refuse.

#### Le même code fonctionne sur iOS et Android

L'API de permission est unifiée entre les deux plateformes :

```ts
import * as Location from "expo-location";

const { status } = await Location.requestForegroundPermissionsAsync();
// status === "granted" | "denied"
if (status !== "granted") throw new Error("Permission refusée");
```

Deux principes essentiels :

- **C'est votre appel qui déclenche la popup système.** La demande de permission n'apparaît que parce que le code appelle explicitement `requestForegroundPermissionsAsync()`.
- **iOS ne l'affiche pas tout seul** : sans demande explicite dans le code, l'accès au capteur échoue.

#### La popup n'apparaît qu'une fois

Comportement du système de permissions (cycle de décision) :

```
Appel request → Déjà répondu ?
                 ├─ Oui → status mémorisé (pas de popup)
                 └─ Non → Popup → status mémorisé
```

Une fois que l'utilisateur a répondu (accepté ou refusé), le statut est **mémorisé** par le système : rappeler la fonction de demande ne réaffiche pas la popup, il renvoie directement le statut mémorisé.

#### La vraie spécificité iOS : le texte d'usage

**iOS exige un texte d'explication par capteur**, sinon il **refuse la permission** — et l'absence de ce texte **peut casser un build de production**.

Ce texte se configure **par capteur dans `app.json`**, via la section `plugins` :

```json
{
  "expo": {
    "plugins": [
      ["expo-location", {
        "locationWhenInUsePermission":
          "NotezTout rattache votre position à vos notes."
      }]
    ]
  }
}
```

Le plugin renseigne les clés natives iOS (`Info.plist`) :

- `locationWhenInUsePermission` → renseigne `NSLocationWhenInUseUsageDescription`
- Pour la caméra → `NSCameraUsageDescription`
- Pour le mouvement (accéléromètre/gyroscope) → `NSMotionUsageDescription`

**Sans ce texte, la permission est rejetée.**

#### Jamais au lancement — demander au bon moment

**Ne jamais demander une permission au lancement de l'app.** Il faut demander la permission au moment d'une **action explicite** de l'utilisateur — par exemple un clic sur un bouton « Localiser ».

Règles pratiques :

1. Appeler `requestForegroundPermissionsAsync()` **avant** d'accéder au capteur.
2. Déclencher la demande sur une **action utilisateur**, jamais au lancement.
3. Tester un refus et gérer l'erreur **proprement, sans crash**.

#### Gérer le refus

**L'app ne doit jamais planter sur un refus.** Deux réactions possibles face à un refus de permission :

- **Informer** — annoncer que la fonctionnalité sera désactivée, et continuer sans elle.
- **Rediriger** — renvoyer vers les réglages système pour rouvrir la permission.

### Géolocalisation avec `expo-location`

Objectif : récupérer la position actuelle de l'utilisateur, de façon sécurisée et exploitable dans l'interface.

#### Installation

```bash
npx expo install expo-location
```

- `expo-location` est un **wrapper unifié sur le GPS Android et iOS**.
- Rappel : **iOS réclame son texte d'usage dans `app.json`** (voir section permissions).

#### Demander puis lire la position

Le pattern recommandé combine demande de permission puis lecture, dans une fonction asynchrone réutilisable :

```ts
import * as Location from "expo-location";

export async function getUserLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") throw new Error("Permission refusée");

  const location = await Location.getCurrentPositionAsync({});
  return location;
}
```

`Location.getCurrentPositionAsync({})` renvoie la position ponctuelle courante.

#### Ce que renvoie le GPS

Structure de l'objet retourné par `getCurrentPositionAsync` :

```json
{
  "coords": {
    "latitude": 48.8584,
    "longitude": 2.2945,
    "altitude": 35,
    "accuracy": 20,
    "heading": 0,
    "speed": 0
  },
  "timestamp": 1715194620000
}
```

L'essentiel à exploiter en pratique : `coords.latitude` et `coords.longitude`. L'objet fournit aussi `altitude`, `accuracy`, `heading`, `speed`, et un `timestamp`.

#### Afficher la position dans l'écran

Consommation dans un composant avec `useState` pour la position et pour l'erreur, et gestion d'erreur via `try/catch` :

```tsx
const [position, setPosition] = useState<
  { lat: number; lng: number } | null
>(null);
const [error, setError] = useState<string | null>(null);

async function handleLocate() {
  try {
    const { coords } = await getUserLocation();
    setPosition({ lat: coords.latitude, lng: coords.longitude });
  } catch (e) {
    setError((e as Error).message);
  }
}

return (
  <View style={{ padding: 24 }}>
    <Button title="Localiser ma position" onPress={handleLocate} />
    {position && <Text>Lat : {position.lat} / Lng : {position.lng}</Text>}
    {error && <Text style={{ color: "red" }}>{error}</Text>}
  </View>
);
```

#### Le cycle complet d'une lecture GPS

Enchaînement logique complet, du clic à l'affichage :

```
Clic → Permission → granted ?
                     ├─ Oui → Position en state
                     └─ Non → Message rouge (erreur)
```

### Afficher la position sur une carte avec `react-native-maps`

Objectif (bonus) : montrer la position GPS sur une carte interactive, avec un marqueur.

#### Installation et le piège Android

```bash
npx expo install react-native-maps
```

Différences de configuration entre plateformes :

- **iOS** : utilise Apple Maps, **aucune config** nécessaire. Tourne dans Expo Go directement. C'est le plus simple pour tester vite.
- **Android** : utilise Google Maps. **Réclame une clé d'API dans `app.json`**. Config native → un **build de dev requis**. Sans clé, la **carte est vide dans Expo Go**.

#### Une MapView centrée

Récupération de la position au montage puis affichage de la carte avec un marqueur :

```tsx
const [region, setRegion] = useState<Region | null>(null);

useEffect(() => {
  getUserLocation()
    .then(({ coords }) => setRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }))
    .catch((e) => console.warn(e));
}, []);

if (!region) return <ActivityIndicator size="large" />;

return (
  <MapView style={{ flex: 1 }} initialRegion={region}>
    <Marker coordinate={region} />
  </MapView>
);
```

Éléments d'API :
- `MapView` — le composant carte (occupe l'espace avec `style={{ flex: 1 }}`).
- `Marker` — un marqueur positionné via la prop `coordinate`.
- Le type `Region` comprend `latitude`, `longitude`, `latitudeDelta`, `longitudeDelta` (les *delta* contrôlent le niveau de zoom).
- Pattern de chargement : afficher un `ActivityIndicator` tant que `region` est `null`.

#### `initialRegion` vs `region` (prop contrôlée)

Principe : **centrer la carte une seule fois, puis laisser l'utilisateur libre.**

- **`initialRegion`** — centre la carte au **premier rendu** seulement. L'utilisateur peut ensuite déplacer et zoomer librement. **C'est le bon choix** pour une position one-shot.
- **`region` (contrôlé)** — la carte « revient » sans cesse à la valeur imposée, elle **lutte contre les gestes** de l'utilisateur. **À éviter** pour une position one-shot.

C'est le même piège que les composants contrôlés/non contrôlés : passer `region` en prop contrôlée force la carte à re-recentrer à chaque rendu.

### Autres capteurs avec `expo-sensors`

Objectif (avancé) : accéder à l'accéléromètre, au gyroscope ou à la boussole pour enrichir l'app avec le mouvement du téléphone.

#### Un module, plusieurs capteurs

```bash
npx expo install expo-sensors
```

Un seul module expose plusieurs capteurs :

- `Accelerometer` — mouvement
- `Gyroscope` — rotation
- `Magnetometer` — boussole
- `Barometer` — pression

#### S'abonner à l'accéléromètre

Les capteurs de mouvement fonctionnent par **abonnement** (listener) et non par lecture ponctuelle. Pattern complet avec `useEffect`, réglage de la fréquence, et nettoyage :

```tsx
const [data, setData] = useState({ x: 0, y: 0, z: 0 });

useEffect(() => {
  const subscription = Accelerometer.addListener(setData);
  Accelerometer.setUpdateInterval(500); // toutes les 500 ms

  return () => subscription.remove(); // nettoyage au démontage
}, []);

return (
  <View style={{ padding: 24 }}>
    {/* data = { x: -0.01, y: 0.02, z: 0.98 } au repos, à plat */}
    <Text>X : {data.x.toFixed(2)}</Text>
    <Text>Y : {data.y.toFixed(2)}</Text>
    <Text>Z : {data.z.toFixed(2)}</Text>
  </View>
);
```

API de l'accéléromètre :
- `Accelerometer.addListener(callback)` — s'abonne ; le callback reçoit `{ x, y, z }`. Renvoie un objet `subscription`.
- `Accelerometer.setUpdateInterval(ms)` — règle la fréquence de rafraîchissement (ex. `500` ms).
- `subscription.remove()` — se désabonne.

#### Lire x, y, z

L'accéléromètre renvoie trois axes, avec des valeurs proches de 0 au repos :

- `x` — gauche / droite
- `y` — haut / bas
- `z` — avant / arrière

Interprétation des valeurs :

```
Posé à plat, immobile :
  x ≈ 0.00
  y ≈ 0.00
  z ≈ 0.98   (gravité)

Incliné sur le côté :
  x monte, z baisse
```

La valeur `z ≈ 0.98` au repos à plat correspond à la **gravité** mesurée sur l'axe vertical.

#### Nettoyage impératif du listener

Le `return () => subscription.remove()` du `useEffect` est **impératif** :

> **Sans ce nettoyage, le capteur écoute encore écran fermé.**

Le listener doit donc être retiré au démontage du composant pour éviter que le capteur continue de consommer des ressources.

#### Disponibilité et permission

**iOS : permission de mouvement.** Avant un build App Store, il faut déclarer `NSMotionUsageDescription` dans `app.json`. Sans elle, l'accès peut être refusé.

**Vérifier que le capteur existe** avant de l'utiliser (tous les appareils n'ont pas tous les capteurs) :

```ts
const dispo = await Accelerometer.isAvailableAsync();
if (!dispo) return; // pas d'accéléromètre
```

### Caméra & galerie : `expo-camera` / `expo-image-picker`

Objectif : attacher une photo à une note — la prendre sur le moment ou la choisir dans la galerie, puis l'afficher.

#### Deux outils, deux besoins

Comparaison des deux approches :

- **`expo-image-picker`** — ouvre l'**UI système**. Permet de **prendre OU choisir** une image. **Le plus simple** — c'est le cas d'usage courant.
- **`expo-camera`** — caméra **intégrée à votre écran**. Aperçu temps réel, capture « maison ». À utiliser **quand la caméra est au cœur de l'app**.

#### `expo-image-picker` — prendre ou choisir

```ts
import * as ImagePicker from "expo-image-picker";

async function takePhoto() {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") return null;

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7, // compresse un peu (0 à 1)
  });
  return result.canceled ? null : result.assets[0].uri;
}
```

API de `ImagePicker` :
- `requestCameraPermissionsAsync()` — demande la permission caméra.
- `launchCameraAsync(options)` — ouvre l'appareil photo. Options : `allowsEditing` (recadrage), `quality` (compression, de `0` à `1`).
- Le résultat expose `canceled` (booléen) et `assets` (tableau) ; l'URI de l'image est dans `result.assets[0].uri`.
- **Choisir dans la galerie** : `pickFromLibrary()` est identique mais utilise `launchImageLibraryAsync({ mediaTypes: ["images"] })` à la place de `launchCameraAsync`.

#### Afficher la photo

Stocker l'URI dans un état puis l'afficher avec `<Image>` :

```tsx
const [photoUri, setPhotoUri] = useState<string | null>(null);

<Button
  title="Ajouter une photo"
  onPress={async () => setPhotoUri(await takePhoto())}
/>;

{photoUri && (
  <Image
    source={{ uri: photoUri }}
    style={{ width: 200, height: 200, borderRadius: 8 }}
  />
)}
```

- Le composant `<Image>` affiche une image locale via `source={{ uri: photoUri }}`.
- L'`uri` se range dans la donnée métier (ici le champ `photoUri` de la note) pour pouvoir la **réafficher** ensuite.

#### Option : caméra intégrée avec `CameraView`

Quand la caméra est au cœur de l'app, on utilise `expo-camera` avec le composant `CameraView`, le hook de permission `useCameraPermissions`, et une `ref` pour déclencher la capture :

```tsx
function NoteCamera({ onCapture }: { onCapture: (uri: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return null;            // se charge encore
  if (!permission.granted)
    return <Button title="Autoriser la caméra" onPress={requestPermission} />;

  async function snap() {
    const photo = await cameraRef.current?.takePictureAsync();
    if (photo) onCapture(photo.uri);
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      <Button title="Photographier" onPress={snap} />
    </View>
  );
}
```

API de `expo-camera` :
- `useCameraPermissions()` — hook qui renvoie `[permission, requestPermission]`.
  - `permission === null` → l'état de permission **se charge encore** (afficher `null` ou un loader).
  - `permission.granted` → booléen indiquant si l'accès est accordé ; sinon proposer un bouton qui appelle `requestPermission`.
- `CameraView` — le composant d'aperçu temps réel ; prop `facing="back"` (ou `"front"`) pour choisir la caméra. On lui passe une `ref`.
- `cameraRef.current?.takePictureAsync()` — capture une photo ; renvoie un objet exposant `photo.uri`.

### Concepts transverses et bonnes pratiques

- **Un package Expo par capteur**, chacun gérant lui-même ses permissions ; installation via `npx expo install`.
- **Demande de permission déclenchée par le code** (jamais automatique), toujours sur une **action utilisateur explicite**, jamais au lancement.
- **Le statut de permission est mémorisé** par l'OS : la popup n'apparaît qu'une seule fois.
- **iOS impose un texte d'usage** par capteur dans `app.json` (mappé sur les clés `NS...UsageDescription`) ; son absence rejette la permission et peut casser un build de prod. Clés vues : `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSMotionUsageDescription`.
- **Ne jamais crasher sur un refus** : informer ou rediriger vers les réglages, et continuer sans la fonctionnalité.
- **Différences iOS/Android** notables : cartes (Apple Maps sans config vs Google Maps avec clé d'API + build de dev).
- **Lecture ponctuelle** (GPS : `getCurrentPositionAsync`) vs **abonnement continu** (capteurs de mouvement : `addListener` + `setUpdateInterval`), ce dernier exigeant un **nettoyage** (`subscription.remove()`) au démontage.
- **`initialRegion` (non contrôlé) plutôt que `region` (contrôlé)** pour une carte centrée une fois, afin de ne pas lutter contre les gestes de l'utilisateur.
- **Vérifier la disponibilité d'un capteur** avec `isAvailableAsync()` avant usage.
- **Gestion d'état React classique** réutilisée : `useState` (position, erreur, URI photo, data capteur), `useEffect` (montage/démontage), `useRef` (référence caméra), affichage conditionnel (`{valeur && <JSX/>}`), et `ActivityIndicator` pour l'état de chargement.
- **Bonus mentionnés** : reverse-geocoding via `reverseGeocodeAsync` (obtenir une adresse depuis des coordonnées), et persistance des coordonnées (`latitude`/`longitude`) dans le modèle de données (ex. en base avec Supabase).


