## Module 8 — Mode offline & synchronisation locale

### Pourquoi gérer le mode offline (web vs mobile)

Sur mobile, le réseau n'a pas le même comportement que sur le web. La différence est fondamentale et conditionne toute l'architecture :

- **Web** : l'utilisateur est généralement assis, avec une connexion stable.
- **Mobile** : l'utilisateur est en mouvement (métro, ascenseur, tunnel, avion). Le réseau n'est pas simplement *absent* ou *présent* — il est **intermittent**.
- Conséquence UX : une app cassée hors-ligne paraît cassée tout court. La gestion de l'offline n'est pas un « nice to have », c'est indispensable.

**Ce que l'utilisateur attend** (objectif : rendre le réseau un détail invisible) :

- **Ne jamais bloquer** — l'app reste utilisable hors-ligne.
- **Montrer les dernières données connues** — réafficher le cache immédiatement.
- **Accepter les actions et les rejouer plus tard** — via une file d'attente locale.

### Architecture du module : lire et écrire hors-ligne

Deux besoins distincts, chacun avec sa solution :

| Besoin | Solution |
|---|---|
| Savoir si on est en ligne | Brancher le réseau sur `onlineManager` (TanStack Query) |
| Lire sans réseau | Persister le cache TanStack Query |
| Écrire sans réseau | File d'attente locale de mutations |
| Rejouer au retour | Resynchroniser et résoudre les conflits |

Les trois questions concrètes auxquelles le module répond :
- App **fermée puis rouverte** avant l'envoi d'une action → comment ne rien perdre ?
- Note **modifiée ailleurs** pendant qu'on était hors-ligne → un **conflit**, comment le résoudre ?
- Comment **rassurer** l'utilisateur hors-ligne sans l'inquiéter ?

### Détecter l'état du réseau avec NetInfo

`NetInfo` est le module réseau standard. Il expose l'état du réseau (connecté ou non, Wi-Fi ou cellulaire) et **notifie le code à chaque changement** de connexion.

Installation :
```bash
npx expo install @react-native-community/netinfo
```

Note : Expo propose aussi `expo-network` comme variante. On part sur `NetInfo` car c'est le module que **TanStack Query documente** officiellement pour l'intégration réseau.

### Connecter NetInfo à TanStack Query (onlineManager)

On rend TanStack Query « offline-aware » en branchant NetInfo sur son `onlineManager`. À faire **une seule fois, au démarrage**, dans `app/_layout.tsx` :

```tsx
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected));
  });
});
```

Mécanique : `NetInfo` → `setOnline` → `onlineManager`.
- **Réseau tombe** → les requêtes sont **suspendues**, les mutations **mises en pause**.
- **Réseau revient** → les requêtes/mutations sont **rejouées**.

Résultat : plus d'échec brutal quand le réseau saute. C'est le socle des deux leçons suivantes (persistance du cache et file de mutations).

### Hook d'affichage useOnlineStatus

`onlineManager` sert la **logique interne** ; ce hook sert **l'affichage** (l'UI). Distinction importante : ce sont deux préoccupations séparées.

```ts
// hooks/useOnlineStatus.ts
import { useNetInfo } from "@react-native-community/netinfo";

export function useOnlineStatus() {
  const { isConnected } = useNetInfo();
  // 'isConnected' vaut 'null' tant que le premier état n'est pas connu :
  // on considère alors qu'on est en ligne (cas optimiste).
  return isConnected ?? true;
}
```

Piège à connaître : `isConnected` vaut `null` tant que le premier état réseau n'est pas encore connu. On applique un **défaut optimiste** (`?? true`) pour ne pas afficher « hors-ligne » à tort au démarrage.

### Bannière « Hors ligne »

Composant informant l'utilisateur. Il ne rend rien quand on est en ligne (`return null`) :

```tsx
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Hors ligne — vos changements seront synchronisés plus tard
      </Text>
    </View>
  );
}
```

À placer **en haut de l'arbre, sous le `SafeAreaView`**, pour qu'elle soit visible partout (tous les écrans).

### Tester la bascule réseau selon la plateforme

Le simulateur/émulateur ne suit pas toujours le réseau de façon fiable :

- **iOS** : le mode réseau du simulateur est peu fiable. Pour voir la bascule, **couper le Wi-Fi du Mac** lui-même.
- **Android** : l'émulateur réagit bien au **toggle data** ; la bascule réseau est suivie correctement.

### Persister le cache et la file de mutations (AsyncStorage)

Objectif : persister le cache de TanStack Query **et** la file des mutations sur le téléphone, pour que **la lecture et l'écriture survivent au mode hors-ligne — et même à un redémarrage de l'app**.

Installation des trois paquets :
```bash
npx expo install @tanstack/react-query-persist-client \
  @tanstack/query-async-storage-persister \
  @react-native-async-storage/async-storage
```

Rôle de chaque paquet :
- `@tanstack/react-query-persist-client` (`persist-client`) : restaure le cache au lancement.
- `@tanstack/query-async-storage-persister` (`async-storage-persister`) : l'adaptateur disque.
- `@react-native-async-storage/async-storage` (`async-storage`) : le stockage clé-valeur (déjà présent depuis le module 4).

### Restaurer le cache au démarrage (PersistQueryClientProvider)

On remplace `QueryClientProvider` par `PersistQueryClientProvider`, en lui passant le `persister` via `persistOptions` :

```tsx
// Module 8 : cache restauré depuis le disque au lancement
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister }}
>
  <AuthProvider>
    <NotesProvider>{/* … navigation … */}</NotesProvider>
  </AuthProvider>
</PersistQueryClientProvider>
```

### Garder les données avec gcTime

Pour que la persistance ait quelque chose à restaurer, il faut empêcher le garbage collector de nettoyer les données inutilisées. On configure `gcTime` sur le `QueryClient` :

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Garde les données en cache 24 h, même inutilisées :
      // sinon elles seraient nettoyées et la persistance
      // n'aurait rien à restaurer.
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });
```

Point clé : `gcTime` doit être suffisamment long (ici 24 h) sinon le cache serait vidé avant d'être persisté, rendant la restauration vide.

### La file d'attente = les mutations en pause

Cycle d'une action écrite hors-ligne :

`Action hors-ligne` → `Mutation en pause` → (persistée) → `File sur disque` → (au lancement) → `Cache restauré` → (réseau présent) → `Envoyée à Supabase`

### Le piège : on ne sérialise pas une fonction

Problème fondamental de la persistance des mutations :
- On sérialise les **données** d'une mutation (titre, id).
- On ne sérialise **pas** la fonction qui l'exécute.
- Après redémarrage, on a « une mutation d'ajout en attente »… mais **comment l'exécuter** si la fonction n'a pas été sauvegardée ?

**Solution** : déclarer les `mutationFn` par **clé** (`mutationKey`), une fois pour toutes, via `setMutationDefaults`. Ainsi TanStack Query retrouve la fonction à partir de la clé persistée.

### Déclarer les mutationFn par clé (setMutationDefaults)

On associe chaque `mutationKey` à sa `mutationFn` au démarrage :

```ts
import * as api from "@/lib/api";

queryClient.setMutationDefaults(["notes", "add"], {
  mutationFn: api.addNote,
});

queryClient.setMutationDefaults(["notes", "delete"], {
  mutationFn: api.deleteNote,
});
```

Puis, dans les hooks (ex. `NotesProvider`), on **référence la clé au lieu de passer la fonction** :

```ts
const addMutation = useMutation({
  mutationKey: ["notes", "add"],
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
});
```

### Rejouer la file au lancement (resumePausedMutations)

Une mutation mise en pause **ne repart pas seule** après un redémarrage. Il faut la relancer explicitement quand le cache est restauré. On le fait dans le callback `onSuccess` de `persistOptions` du provider :

```tsx
<PersistQueryClientProvider
  client={queryClient}
  persistOptions={{ persister }}
  onSuccess={() => {
    // Le cache est restauré : on rejoue les mutations en pause.
    queryClient.resumePausedMutations();
  }}
>
```

`onSuccess` est appelé **pile quand le cache est restauré** depuis le disque.

**Cycle complet d'une note créée hors-ligne :**
1. Ajout sans réseau → la mutation passe en **`paused`**.
2. Le provider **sauvegarde** la mutation dans AsyncStorage.
3. L'app se ferme → la file est **sur le disque**, rien n'est perdu.
4. Au lancement, cache restauré → `resumePausedMutations()` relance dès qu'il y a du réseau.

### Vider le cache à la déconnexion (SIGNED_OUT)

Sécurité : sinon le prochain compte connecté verrait les notes du précédent — **en clair dans AsyncStorage**. On écoute l'événement `SIGNED_OUT` de Supabase et on vide le cache :

```ts
const queryClient = useQueryClient();

useEffect(() => {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      // vide le cache mémoire ; le persisteur écrase aussi sa copie disque
      queryClient.clear();
    }
  });
  return () => data.subscription.unsubscribe();
}, [queryClient]);
```

`queryClient.clear()` vide le cache mémoire ; le persisteur **écrase aussi sa copie disque**.

### Bonus : compter les actions en attente (useMutationState)

On peut afficher le nombre de mutations en attente de synchronisation avec le hook `useMutationState`, filtré sur le statut `pending` :

```tsx
import { useMutationState } from "@tanstack/react-query";

export function PendingBadge() {
  const pending = useMutationState({
    filters: { status: "pending" },
  });

  if (pending.length === 0) return null;

  return <Text>{pending.length} action(s) en attente de synchronisation</Text>;
}
```

### Resynchronisation au retour du réseau (automatique)

Parce que NetInfo est branché sur `onlineManager`, au retour du réseau TanStack Query, de façon automatique :
- **rejoue** les mutations en pause (la file part vers Supabase) ;
- **recharge** les requêtes périmées (ex. `["notes"]` est refetché).

Qui relance la file selon la situation :

| Situation | Qui relance la file |
|---|---|
| Réseau revient, **app ouverte** | `onlineManager` (automatique) |
| App **redémarre** avec des actions en attente | `resumePausedMutations()` |

### Le problème : rien ne s'affiche hors-ligne

Sans mises à jour optimistes, l'UX est mauvaise :

`Création hors-ligne` → `Mutation en pause` → (sans serveur) → `Cache inchangé` → `Note invisible`

Hors-ligne, la mutation est en pause **avant** d'atteindre le serveur. Sans rien de plus, la note créée **n'apparaît pas** — mauvaise UX.

### Les mises à jour optimistes

Principe : modifier le cache **immédiatement**, comme si l'opération avait réussi, puis se réconcilier avec le serveur.

Flux avec les callbacks de `useMutation` :

`onMutate` → (maj cache) → `Cache` → `succès ?`
- **non** → `onError` restaure (rollback)
- **fin** → `onSettled` invalide (refetch pour se resynchroniser)

### Ajout optimiste : onMutate

```ts
onMutate: async (newNote: { title: string; content?: string }) => {
  // On annule les refetch en cours pour ne pas écraser notre mise à jour
  await queryClient.cancelQueries({ queryKey: ["notes"] });

  const previous = queryClient.getQueryData<Note[]>(["notes"]);

  const optimistic: Note = {
    id: `temp-${Date.now()}`, // id temporaire, remplacé après synchro
    title: newNote.title,
    content: newNote.content ?? null,
    created_at: new Date().toISOString(),
  };

  queryClient.setQueryData<Note[]>(["notes"], (old = []) => [optimistic, ...old]);
  return { previous }; // transmis à onError / onSettled via `context`
};
```

Étapes clés :
- `cancelQueries` — annule les refetch en cours pour qu'ils n'écrasent pas la mise à jour optimiste.
- `getQueryData` — capture l'état précédent (`previous`) pour un éventuel rollback.
- `setQueryData` — insère immédiatement l'élément optimiste (ici en tête de liste).
- `id: temp-${Date.now()}` — **id temporaire**, remplacé après synchro par le vrai id serveur.
- `return { previous }` — le retour de `onMutate` devient le `context` reçu par `onError` et `onSettled`.

### Ajout optimiste : onError et onSettled

```ts
onError: (_err, _newNote, context) => {
  // Échec réel (≠ hors-ligne) : on remet la liste d'avant
  queryClient.setQueryData(["notes"], context?.previous);
},
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ["notes"] });
},
```

- `onMutate` s'exécute **même hors-ligne** → la note apparaît tout de suite.
- `onError` ne se déclenche que sur un **échec réel** (≠ hors-ligne) → rollback vers `context.previous`.
- Au retour réseau, `onSettled` invalide → Supabase renvoie le **vrai `id`**, le `temp-…` disparaît.
- Garder `keyExtractor={(item) => item.id}` sur la `FlatList` (les id temporaires puis réels servent de clés stables).

### Le même patron pour la suppression

Même structure optimiste appliquée à la suppression :

```ts
onMutate: async (id: string) => {
  await queryClient.cancelQueries({ queryKey: ["notes"] });
  const previous = queryClient.getQueryData<Note[]>(["notes"]);
  queryClient.setQueryData<Note[]>(["notes"], (old = []) =>
    old.filter((n) => n.id !== id),
  );
  return { previous };
},
onError: (_err, _id, context) =>
  queryClient.setQueryData(["notes"], context?.previous),
onSettled: () => queryClient.invalidateQueries({ queryKey: ["notes"] }),
```

Sans ce patron, une note supprimée hors-ligne **reste affichée** jusqu'au retour réseau.

### Résoudre les conflits : un choix produit

Un conflit = la même donnée a changé hors-ligne **et** sur le serveur. Le choix de stratégie est un **choix produit**, pas seulement technique :

| Stratégie | Principe | Pour qui |
|---|---|---|
| **Last-write-wins** | La dernière écriture écrase tout | Notes perso, faible collaboration |
| **Merge par champ** | Fusion champ par champ | Édition collaborative simple |
| **Résolution manuelle** | Présenter les deux versions | Données critiques (santé, finance) |

### Last-write-wins en pratique

Pour une app de notes personnelles (risque de conflit réel faible), le last-write-wins est adapté :

- C'est le comportement **naturel** de `updateNote()` : `.update().eq("id", …)` écrase la ligne.
- Note supprimée côté serveur : le `.update()` touche **0 ligne** — ce n'est **pas une erreur**, elle disparaît après l'invalidation.
- `updated_at` peut servir d'**arbitre** : n'écraser que si la modification locale est plus récente que celle du serveur.

### Le piège de l'authentification (RLS + session)

Point de vigilance critique pour l'écriture différée :

- Une note créée hors-ligne ne part qu'**au retour** du réseau.
- La table est protégée par la **Row-Level Security** (module 6) : `user_id` + session active requis.
- La session Supabase est **persistée** → elle est toujours là au redémarrage.
- À vérifier : `addNote()` doit rattacher le `user_id` **au moment de l'envoi**, pas au moment de la mise en file. (Sinon, risque d'incohérence si l'état d'auth a changé entre-temps.)

### API et symboles clés du module (récapitulatif)

- `@react-native-community/netinfo` : `NetInfo.addEventListener`, `useNetInfo`, `state.isConnected`.
- `onlineManager.setEventListener` — rend TanStack Query conscient du réseau.
- `PersistQueryClientProvider` (remplace `QueryClientProvider`), props : `client`, `persistOptions={{ persister }}`, `onSuccess`.
- `createAsyncStoragePersister({ storage: AsyncStorage })`.
- `QueryClient` `defaultOptions.queries.gcTime` (24 h pour la persistance).
- `queryClient.setMutationDefaults([key], { mutationFn })` + `useMutation({ mutationKey })` (persistance des mutations sans sérialiser la fonction).
- `queryClient.resumePausedMutations()` (dans `onSuccess`).
- `queryClient.clear()` (au `SIGNED_OUT`).
- `useMutationState({ filters: { status: "pending" } })`.
- Optimisme : `onMutate` / `onError` / `onSettled` avec `cancelQueries`, `getQueryData`, `setQueryData`, `invalidateQueries`, et passage d'état via `context`.


