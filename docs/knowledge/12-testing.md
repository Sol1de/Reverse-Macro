## Module 12 — Tester son app

Ce module couvre le test d'une application React Native (Expo) avec **Jest** et **@testing-library/react-native**, en s'appuyant sur l'app d'exemple *NotezTout*. Il traite du test de composants, de hooks/contextes, et du mocking de la couche de données (API / Supabase / modules natifs).

### Pourquoi tester une app mobile — le coût d'un bug

Le cycle de correction d'un bug est bien plus coûteux sur mobile que sur le web, ce qui rend les tests indispensables.

- **Sur le web** : bug détecté en prod → correction poussée → déployé en quelques minutes.
- **Sur mobile** : bug détecté en prod → correction native → **repasse par la revue des stores** → des jours d'attente, et potentiellement une mauvaise note des utilisateurs.

La lenteur du canal de distribution (revue App Store / Play Store) transforme un correctif trivial en incident long. D'où l'intérêt d'attraper les régressions avant publication.

### La pyramide des tests

Trois niveaux de tests, du moins cher au plus coûteux :

- **Unitaire** — très peu cher (rapide, isolé, nombreux).
- **Intégration** — bon rapport coût/valeur (teste plusieurs pièces ensemble).
- **E2E** (end-to-end) — lent et fragile (à réserver aux parcours critiques).

Le message implicite : privilégier la base de la pyramide (beaucoup d'unitaires et d'intégration, peu d'E2E).

### Ce qui change par rapport au web (React web)

Le test en React Native diffère du test React web sur trois points clés :

- **Pas de DOM** : le preset `jest-expo` simule l'environnement React Native (il n'y a pas de `document`/DOM navigateur). Les composants rendus sont des composants natifs simulés, pas des éléments HTML.
- **On interroge par accessibilité** : on trouve les éléments par leur **texte**, leur **rôle**, ou un **`testID`** — et non par un sélecteur `.class` CSS comme sur le web.
- **Les modules natifs se mockent** : caméra, notifications, Supabase, etc. doivent être remplacés par des mocks car ils n'existent pas dans l'environnement de test Node.

### Philosophie — tester le comportement, pas l'implémentation

Principe central de la testing-library :

> « La note ajoutée apparaît dans la liste » — **bon test**.
> « `setState` a été appelée » — **mauvais test**.

On vérifie ce que l'utilisateur observe (comportement, sorties visibles), pas les détails internes (appels de fonctions d'état, structure du composant). Cela rend les tests robustes au refactoring.

### Cibles de test dans une app (exemple NotezTout)

Trois catégories de choses à tester :

- **Un composant** : affichage + interactions.
- **Un hook / contexte** : ex. `useNotes()`, `useAuth()`.
- **La couche de données mockée** : flux d'ajout / suppression.

### Installer l'outillage (Jest + Testing Library)

Installation des dépendances de dev avec Expo :

```bash
npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
```

Puis configuration dans `package.json` :

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*)"
    ]
  }
}
```

Points importants :
- **`preset: "jest-expo"`** : configure Jest pour l'environnement Expo/React Native.
- **`transformIgnorePatterns`** : indispensable pour que Jest transpile les modules `react-native`, `@react-native-community`, `expo`, `@expo`, `@expo-google-fonts` (qui sont livrés en ES modules non transpilés). Sans cette regex négative, Jest ignore ces node_modules et échoue au parsing.

### Tester un composant

#### Le composant à tester

```tsx
// components/NoteCard.tsx
import { View, Text } from "react-native";

export function NoteCard({
  note,
}: {
  note: { title: string; content: string };
}) {
  return (
    <View>
      <Text>{note.title}</Text>
      <Text>{note.content}</Text>
    </View>
  );
}
```

#### Le premier test

```tsx
// components/NoteCard.test.tsx
import { render, screen } from "@testing-library/react-native";
import { NoteCard } from "./NoteCard";

describe("<NoteCard />", () => {
  it("affiche le titre et le contenu de la note", () => {
    render(<NoteCard note={{ title: "Courses", content: "Lait, pain" }} />);

    expect(screen.getByText("Courses")).toBeVisible();
    expect(screen.getByText("Lait, pain")).toBeVisible();
  });
});
```

APIs utilisées :
- **`render(...)`** : monte le composant dans l'environnement de test.
- **`screen`** : objet global exposant les requêtes sur l'arbre rendu (évite de destructurer le retour de `render`).
- **`screen.getByText(...)`** : trouve un nœud par son texte affiché.
- **`expect(...).toBeVisible()`** : matcher vérifiant que l'élément est visible à l'écran.
- Structure `describe(...)` / `it(...)` (`it` et `test` sont interchangeables).

### Trouver les éléments comme un utilisateur (requêtes)

Ordre de priorité recommandé pour les requêtes (du plus proche de l'utilisateur au dernier recours) :

| Requête | Pour trouver… |
|---|---|
| `getByText` | un texte affiché à l'écran |
| `getByRole` | un élément par son rôle (`button`, `header`, …) |
| `getByLabelText` | un champ via son label d'accessibilité |
| `getByTestId` | en dernier recours, via une prop `testID` |

Le `testID` est un mécanisme d'échappement quand aucune requête accessible ne convient :

```tsx
<Pressable testID="delete-button" onPress={onDelete}>
  <Text>Supprimer</Text>
</Pressable>
```

La hiérarchie encourage à écrire des composants accessibles : privilégier texte/rôle/label, et ne recourir à `testID` que lorsque c'est inévitable.

### Simuler une interaction (`fireEvent`)

```tsx
// components/DeleteButton.test.tsx
import { render, screen, fireEvent } from "@testing-library/react-native";
import { DeleteButton } from "./DeleteButton";

it("appelle onDelete avec l'id au moment de l'appui", () => {
  const onDelete = jest.fn();
  render(<DeleteButton id="note-1" onDelete={onDelete} />);

  fireEvent.press(screen.getByText("Supprimer"));

  expect(onDelete).toHaveBeenCalledWith("note-1");
});
```

APIs utilisées :
- **`fireEvent.press(...)`** : simule un appui (équivalent mobile du `click`). `fireEvent` porte les événements RN (`press`, `changeText`, `scroll`, etc.).
- **`jest.fn()`** : crée une fonction mock/espion pour vérifier ses appels.
- **`expect(fn).toHaveBeenCalledWith(...)`** : vérifie que le mock a été appelé avec les bons arguments.
- On passe un mock (`onDelete`) en prop pour observer le comportement du composant sans dépendance réelle.

### Tester un hook et un contexte

Objectif : tester `useNotes()` et son `NotesProvider` en lui fournissant les providers nécessaires, dont celui de **TanStack Query** (React Query).

#### Le défi des providers

Un hook qui dépend d'un contexte plante s'il est rendu sans ce contexte.

**Sans wrapper** :
```tsx
renderHook(() => useNotes());
// Error: no QueryClient set,
//   use QueryClientProvider
```
> Pas de contexte, pas de client : le hook plante.

**Avec wrapper** :
```tsx
renderHook(() => useNotes(), {
  wrapper: createWrapper(),
});
// ✓ le hook tourne
```
> `renderHook` accepte un `wrapper` qui enveloppe le hook.

APIs :
- **`renderHook(callback, options)`** : monte un hook en isolation ; retourne un objet `{ result }`.
- **`options.wrapper`** : composant React qui enveloppe le hook testé pour lui injecter les contextes (providers).

#### Un wrapper réutilisable

```tsx
// test/createWrapper.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotesProvider } from "@/contexts/notes";

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotesProvider>{children}</NotesProvider>
      </QueryClientProvider>
    );
  };
}
```

Bonnes pratiques :
- **`retry: false`** dans les `defaultOptions.queries` : désactive les nouvelles tentatives de TanStack Query en test (sinon un échec attendu déclenche des retries qui ralentissent/faussent le test).
- On **instancie un nouveau `QueryClient`** par wrapper pour isoler le cache entre tests.
- Le wrapper compose les providers (`QueryClientProvider` > `NotesProvider`) exactement comme dans l'app réelle.

#### Tester `useNotes()`

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { useNotes } from "@/contexts/notes";
import * as api from "@/lib/api";

jest.mock("@/lib/api");

it("expose les notes chargées via useNotes()", async () => {
  (api.getNotes as jest.Mock).mockResolvedValue([
    { id: "1", title: "Courses", content: "Lait, pain" },
  ]);

  const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isReady).toBe(true));
  expect(result.current.notes).toHaveLength(1);
  expect(result.current.notes[0].title).toBe("Courses");
});
```

APIs / patterns :
- **`jest.mock("@/lib/api")`** : auto-mock du module — toutes ses exports deviennent des `jest.fn()`.
- **`import * as api`** + cast **`(api.getNotes as jest.Mock)`** : accès typé au mock pour le configurer.
- **`.mockResolvedValue(...)`** : la fonction mockée retourne une promesse résolue avec la valeur donnée (simule un appel async réussi).
- **`result.current`** : la valeur courante retournée par le hook (change à chaque re-render).
- **`waitFor(callback)`** : attend qu'une assertion asynchrone passe (ici que `isReady` devienne `true` après le chargement async) ; indispensable car les données arrivent via une promesse.
- **`.toHaveLength(n)`** : matcher sur la longueur d'un tableau.

#### Le même schéma pour `useAuth()`

```tsx
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

it("expose l'état déconnecté une fois la session restaurée", async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthWrapper });

  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.user).toBeNull();
});
```

Points techniques :
- **Mock avec factory** : `jest.mock(chemin, factory)` — la fonction factory retourne l'implémentation mockée du module. Ici on reproduit la forme de l'objet `supabase.auth`.
- Il faut mocker **toutes** les méthodes que le hook consomme : `getSession` (async → `mockResolvedValue`) **et** `onAuthStateChange` (synchrone → `mockReturnValue`).
- **`onAuthStateChange`** doit retourner la forme `{ data: { subscription: { unsubscribe } } }` car le hook s'abonne au montage et appelle `unsubscribe` au démontage ; omettre cette forme fait planter le cleanup.
- **`.toBeNull()`** : matcher vérifiant qu'une valeur est `null` (ici `user`, état déconnecté).

### Mocker l'API et Supabase

Objectif : remplacer `lib/api` par un faux pour tester les flux d'ajout et de suppression sans jamais toucher au vrai Supabase.

#### Pourquoi mocker `lib/api`, pas Supabase directement

Chaîne de dépendances : **`NotesProvider` → `lib/api` → Supabase**.

`lib/api` est la **couture** (« seam ») entre l'app et le monde extérieur. On coupe à ce niveau (`on coupe ici` → `mock jest.fn()`) plutôt qu'au niveau du client Supabase.

Avantages de mocker à la couture `lib/api` :
- Un seul point d'interception, plus proche de l'app.
- On n'a pas à reproduire toute l'API interne de Supabase (moins fragile).
- Le contrat mocké (`getNotes`, `addNote`, `deleteNote`) est simple et stable.

#### Auto-mocker le module

```tsx
import * as api from "@/lib/api";

jest.mock("@/lib/api"); // getNotes, addNote, deleteNote… → jest.fn()

beforeEach(() => {
  jest.clearAllMocks(); // vide les appels enregistrés
});
```

> Sans `jest.clearAllMocks()`, les appels s'accumulent : un `toHaveBeenCalledTimes(1)` finit par échouer à cause d'un test précédent.

Piège clé — **isolation entre tests** :
- L'auto-mock transforme chaque export en `jest.fn()`.
- Les compteurs d'appels d'un mock **persistent** entre les `it()`.
- **`jest.clearAllMocks()` dans `beforeEach`** remet à zéro l'historique des appels avant chaque test, sinon les assertions de type `toHaveBeenCalledTimes(n)` deviennent dépendantes de l'ordre d'exécution.

#### Tester le flux d'ajout

```tsx
it("transmet la nouvelle note à l'API", async () => {
  (api.getNotes as jest.Mock).mockResolvedValue([]); // liste vide
  (api.addNote as jest.Mock).mockResolvedValue({
    id: "2", title: "Idée", content: "",
  });

  const { result } = renderHook(() => useNotes(), { wrapper: createWrapper() });
  await waitFor(() => expect(result.current.isReady).toBe(true));

  await act(async () => {
    await result.current.addNote({ title: "Idée", content: "" });
  });

  expect(api.addNote).toHaveBeenCalledWith({ title: "Idée", content: "" });
});
```

Patterns :
- On configure d'abord l'état initial (`getNotes` → `[]`, liste vide) puis la réponse de l'action (`addNote` → note créée).
- **`act(async () => { ... })`** : enveloppe toute mise à jour d'état déclenchée par le test (ici l'appel à `addNote` qui modifie l'état du hook) pour que React applique les effets/re-renders avant les assertions. Sans `act`, warnings et états incohérents.
- On attend `isReady` (chargement initial terminé) **avant** de déclencher l'action.
- L'assertion porte sur le **comportement observable** : `api.addNote` a bien reçu la note — pas sur l'état interne.

#### Contrôler avec une factory (mock explicite)

Alternative à l'auto-mock : fournir une factory qui déclare chaque fonction, pour un contrôle plus fin.

```tsx
jest.mock("@/lib/api", () => ({
  getNotes: jest.fn().mockResolvedValue([]),
  addNote: jest.fn(),
  deleteNote: jest.fn(),
}));
```

Et pour un module natif, même réflexe :

```tsx
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
}));
```

Points :
- La factory permet de fixer des valeurs par défaut directement (`getNotes` renvoie `[]` d'emblée).
- **Même approche pour les modules natifs Expo** (`expo-notifications`, caméra, etc.) : on remplace les fonctions natives par des `jest.fn()` avec des retours contrôlés (`requestPermissionsAsync` → `{ granted: true }` pour simuler la permission accordée).

### Alternative — MSW (Mock Service Worker)

Comparaison entre mocker `lib/api` et utiliser MSW :

| | Mocker `lib/api` | MSW |
|---|---|---|
| On remplace… | la couche `lib/api` | le réseau HTTP |
| `lib/api` réel exécuté | non | oui |
| Réalisme | bon | meilleur (sérialisation) |
| Setup | léger | plus lourd |

Arbitrage :
- **Mocker `lib/api`** : `lib/api` n'est **pas** exécuté (on le remplace), setup léger, réalisme correct.
- **MSW** : intercepte au niveau **réseau HTTP**, donc `lib/api` réel **est** exécuté et la vraie sérialisation JSON a lieu → réalisme supérieur, mais setup plus lourd.
- **Recommandation** : pour débuter, mocker `lib/api` reste le meilleur rapport simplicité/valeur.

### Récapitulatif — couverture de test cible (app NotezTout)

Les surfaces de test à couvrir pour une app de ce type, avec leur nature :

1. **Composant** — une carte de note affiche titre et contenu.
2. **Liste** — rend les notes fournies **et** gère l'état vide.
3. **Ajout** — soumettre le formulaire appelle l'API avec la bonne note.
4. **Suppression** — l'action cible le bon `id`.
5. **Accès** — `useAuth()` expose le bon état connecté / déconnecté.
6. **Mocks** — aucun test ne touche le vrai Supabase (`lib/api` mocké).

Cas avancés (bonus) évoqués : test de **parcours** (la note apparaît dans la liste), gestion d'un **état d'erreur réseau** avec bouton « Réessayer », et **liste triée** (éléments épinglés en premier).

### Récapitulatif des APIs et concepts clés

- **Preset** : `jest-expo` (+ `transformIgnorePatterns` pour transpiler RN/Expo).
- **Testing Library** : `render`, `screen`, `renderHook`, `waitFor`, `fireEvent`, `act`.
- **Requêtes** : `getByText` > `getByRole` > `getByLabelText` > `getByTestId` (priorité accessibilité).
- **Matchers** : `toBeVisible`, `toHaveLength`, `toBeNull`, `toHaveBeenCalledWith`, `toHaveBeenCalledTimes`.
- **Mocking Jest** : `jest.fn()`, `jest.mock(path)` (auto-mock), `jest.mock(path, factory)` (factory), `mockResolvedValue`, `mockReturnValue`, `jest.clearAllMocks()` (dans `beforeEach`).
- **Async** : `waitFor` pour attendre les états asynchrones ; `act(async …)` pour envelopper les mises à jour d'état déclenchées par le test.
- **Providers en test** : `renderHook(fn, { wrapper })`, wrapper composant qui injecte `QueryClientProvider` (avec `retry: false`) + providers de l'app.
- **Stratégie de mock** : couper à la **couture** (`lib/api`) plutôt qu'au client externe ; MSW comme alternative plus réaliste mais plus lourde.
- **Philosophie** : tester le comportement observable, pas l'implémentation.


