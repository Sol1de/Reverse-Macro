## Module 9 — Notifications push & locales

Ce module traite des notifications dans une application React Native / Expo : la distinction fondamentale entre notifications **locales** et **push (distantes)**, la configuration de `expo-notifications`, la gestion des permissions, la planification de rappels, l'envoi de push via le service Expo (avec une Edge Function Supabase), et le **deep-linking** (ouvrir le bon écran au tap sur une notification).

### Deux familles de notifications : locale vs push

Distinction conceptuelle centrale du module.

| Locale | Push (distante) |
|---|---|
| Programmée par l'app, sur l'appareil | Envoyée par un serveur, à distance |
| Aucun réseau, aucun serveur | Passe par Apple (APNs) et Google (FCM) |
| Ex. « Relisez cette note dans 1 heure » | Ex. « Vous avez 3 notes en attente » |
| Marche même hors-ligne, **même dans Expo Go** | L'app n'a pas besoin d'être ouverte |

**Cycle d'une notification locale** : l'utilisateur fait une action dans l'app → l'app programme une notif pour plus tard → le centre de notifications la déclenche tout seul → aucun aller-retour réseau.

**Cycle d'une notification push** : votre serveur demande l'envoi → un serveur de notif route le message → il atteint le centre de notif du téléphone → l'app peut être fermée.

### Quand notifier (bonnes pratiques UX)

- Un rappel que l'utilisateur a **lui-même demandé**.
- Une info qu'il **attend** : commande arrivée, ami qui répond.
- Pas de « Revenez, vous nous manquez » trois fois par semaine.
- Piège : une mauvaise notif fait couper… **toutes** les autres (l'utilisateur désactive tout).

### Permissions : accord explicite obligatoire

**iOS et Android 13+ exigent un accord explicite.** Si l'utilisateur refuse, les notifications n'apparaîtront **jamais**. La permission doit être demandée « au bon moment » (pas au démarrage brut).

Correspondance cas d'usage → mécanisme :

| Cas d'usage | Type |
|---|---|
| Rappel « relis cette note » | Locale |
| Digest quotidien « Vous avez N notes » | Push serveur |
| Tap qui ouvre le bon écran | Deep-link |

### Installation de `expo-notifications`

```bash
npx expo install expo-notifications
```

- `npx expo install` choisit **la version compatible avec votre SDK** Expo (à préférer à `npm install`).
- Une **seule dépendance** couvre à la fois le local ET le push.

### Configurer le handler de présentation

`Notifications.setNotificationHandler` définit ce qui s'affiche quand une notification arrive, **notamment lorsque l'app est au premier plan**.

```js
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // bannière en haut de l'écran
    shouldShowList: true,   // ajout au centre de notifications
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
```

Comportement selon l'état de l'app (le champ clé est `shouldShowBanner`) :

| État de l'app | Sans handler | Avec `shouldShowBanner: true` |
|---|---|---|
| App au premier plan | Rien ne s'affiche | La bannière descend |
| App en arrière-plan | La notif s'affiche | La notif s'affiche |

Le handler sert exactement à couvrir le cas **app au premier plan** (sinon rien ne s'afficherait à l'écran).

### Demander la permission

`Notifications.getPermissionsAsync()` lit l'état courant ; `Notifications.requestPermissionsAsync()` déclenche la demande système. Pattern : vérifier d'abord, ne demander que si nécessaire.

```js
export async function ensureNotificationPermission() {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
}
```

### Canal de notification Android

Android **exige un canal** pour afficher des notifications ; sans lui, **pas d'affichage**. À créer conditionnellement selon la plateforme.

```js
if (Platform.OS === "android") {
  await Notifications.setNotificationChannelAsync("reminders", {
    name: "Rappels",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
```

- `Notifications.setNotificationChannelAsync(channelId, config)` : crée/configure le canal.
- `Notifications.AndroidImportance.DEFAULT` : niveau d'importance du canal.

### Programmer une notification locale (triggers)

`Notifications.scheduleNotificationAsync({ content, trigger })` planifie une notification. `content.data` transporte une charge utile arbitraire, réutilisée au tap pour le deep-linking.

```js
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Rappel de note",
    body: `Pense à relire « ${note.title} »`,
    data: { noteId: note.id }, // servira au tap (deep-link)
  },
  trigger: {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: 60 * 60, // dans 1 heure
  },
});
```

**Trigger de type intervalle** : `Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL` avec `seconds`.

**Trigger quotidien** : `Notifications.SchedulableTriggerInputTypes.DAILY` avec `hour` / `minute`.

```js
trigger: {
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour: 20,
  minute: 0, // tous les soirs à 20 h
}
```

### Annuler des notifications planifiées

`scheduleNotificationAsync` **retourne un identifiant** ; on le conserve pour pouvoir annuler une notification précise plus tard.

```js
const id = await Notifications.scheduleNotificationAsync({ /* … */ });

// Plus tard, l'utilisateur change d'avis :
await Notifications.cancelScheduledNotificationAsync(id);

await Notifications.cancelAllScheduledNotificationsAsync();
```

- `Notifications.cancelScheduledNotificationAsync(id)` : annule une notif ciblée.
- `Notifications.cancelAllScheduledNotificationsAsync()` : annule toutes les notifs planifiées.

### Push : récupérer le token Expo de l'appareil

**Le push n'existe pas dans Expo Go** : il faut un **build de développement**. Dépendances nécessaires :

```bash
npx expo install expo-constants expo-device
```

- `expo-constants` : lit le `projectId` du projet Expo.
- `expo-device` : détecte un simulateur — **pas de token sans vrai appareil**.

```js
export async function getPushToken() {
  // 0. Un simulateur n'a pas d'adresse push
  if (!Device.isDevice) {
    return null;
  }

  // 1. La permission, toujours
  const granted = await ensureNotificationPermission();
  if (!granted) {
    return null;
  }

  // 2. Le canal Android (sans lui, pas d'affichage)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", { /* … */ });
  }

  // 3. Le token, rattaché au projet Expo
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token; // ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
}
```

Points clés :
- `Device.isDevice` : `false` sur simulateur → aucun token possible.
- `Constants?.expoConfig?.extra?.eas?.projectId` : chemin d'accès au `projectId`.
- `Notifications.getExpoPushTokenAsync({ projectId })` : renvoie le **push token Expo**, de la forme `ExponentPushToken[…]`. C'est « l'adresse de notification » de l'appareil.
- Ordre imposé : appareil réel → permission → canal Android → token.

### Persister le token dans Supabase

Table `push_tokens` avec **Row Level Security (RLS)** : chaque utilisateur ne gère que ses propres tokens. Clé primaire composite `(user_id, token)` pour supporter plusieurs appareils par utilisateur.

```sql
create table push_tokens (
  user_id uuid references auth.users (id) on delete cascade,
  token text not null,
  updated_at timestamptz default now(),
  primary key (user_id, token)
);

alter table push_tokens enable row level security;

create policy "Un utilisateur gère ses propres tokens"
  on push_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Enregistrement du token via `upsert` (une fois l'utilisateur connecté), avec gestion de conflit sur la clé composite :

```js
export async function registerPushToken() {
  const token = await getPushToken();
  if (!token) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("push_tokens")
    .upsert({ user_id: user.id, token }, { onConflict: "user_id,token" });
}
```

- `supabase.auth.getUser()` : récupère l'utilisateur courant.
- `.upsert(row, { onConflict: "user_id,token" })` : insère ou met à jour sans doublon.

### Envoyer un push via le service Expo

**Vous ne parlez jamais directement à FCM ni APNs.** Android passe par FCM, iOS par APNs, mais **Expo route** : vous appelez une seule API.

Endpoint et format du message :

```
POST https://exp.host/--/api/v2/push/send

{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "NotezTout",
  "body": "Vous avez 5 notes — un petit tour ?",
  "data": { "screen": "notes" }
}
```

Le champ `data` (ici `{ "screen": "notes" }`) est réutilisé côté client au tap pour le deep-linking.

### Edge Function Supabase (Deno)

```bash
npx supabase functions new daily-reminder
```

Génère `supabase/functions/daily-reminder/index.ts` — **exécutée côté serveur, en Deno**.

Différences Deno vs Node (et ce qui ne change pas) :

| Ce qui change | Ce qui ne change pas |
|---|---|
| Pas de `npm install` : import par adresse (`npm:`, `jsr:`, `node:`) | `async` / `await` |
| `Deno.serve(handler)` au lieu du serveur HTTP de Node | `fetch`, `Request`, `Response` |
| `Deno.env.get("CLE")` au lieu de `process.env` | Le TypeScript, exécuté directement ; tous les objets JS habituels |

Corps de la fonction : lire tous les tokens, compter les notes de chaque utilisateur, construire un message par utilisateur ayant des notes.

```ts
Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  // 1. Tous les tokens enregistrés
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("user_id, token");
  // 2. Un message par utilisateur qui a des notes
  const messages = [];
  for (const { user_id, token } of tokens ?? []) {
    const { count } = await supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id);
    if (!count) continue; // on ne dérange personne pour rien
    messages.push({ to: token, title: "NotezTout",
      body: `${count} note${count > 1 ? "s" : ""} à relire ?` });
  }
  // → l'envoi sur la slide suivante
});
```

- `createClient(url, serviceRoleKey)` : client Supabase côté serveur.
- `.select("id", { count: "exact", head: true })` : récupère **uniquement le compte** (pas les lignes).
- `.eq("user_id", user_id)` : filtre.

**Envoi groupé** en un seul appel HTTP (le tableau `messages` est envoyé d'un coup) :

```ts
// 3. Un seul appel à l'API push d'Expo (envoi groupé)
await fetch("https://exp.host/--/api/v2/push/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(messages),
});
```

### Déploiement et test manuel

```bash
npx supabase functions deploy daily-reminder
```

- Déclencher la fonction une fois à la main (dashboard ou `curl`).
- L'outil `expo.dev/notifications` envoie un push à un token collé (test rapide).

### Planifier l'envoi quotidien avec `pg_cron`

`cron.schedule` (extension `pg_cron`) appelle la fonction via `net.http_post` (extension `pg_net`) selon une expression cron.

```sql
select cron.schedule(
  'daily-reminder',
  '0 18 * * *', -- tous les jours à 18 h UTC
  $$
  select net.http_post(
    url := 'https://<votre-projet>.supabase.co/functions/v1/daily-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <service_role_key>'
    )
  );
  $$
);
```

### Sécurité : `service_role_key`

La `service_role_key` **contourne la RLS**. Règles :
- **Dans l'app cliente : jamais.**
- Strictement **côté serveur**.
- En production : la ranger dans **Supabase Vault**.

### Deep-linking : ouvrir le bon écran au tap

Objectif : qu'un tap ouvre l'écran pertinent au lieu de l'accueil, **même quand l'app était fermée**.

Deux situations distinctes :

| App ouverte / arrière-plan | App complètement fermée |
|---|---|
| Réagir à l'événement « tap » immédiatement | Lire, au démarrage, la notif qui l'a lancée |
| Le cas facile, celui qu'on teste | **Le cas réel, souvent oublié** |

**Composant routeur** basé sur le hook `Notifications.useLastNotificationResponse()` et le `router` d'Expo Router :

```jsx
export function NotificationRouter() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;

    const data = response.notification.request.content.data;

    if (data?.noteId) {
      router.push(`/note/${data.noteId}`); // rappel local
    } else if (data?.screen === "notes") {
      router.push("/"); // digest serveur : la liste
    }
  }, [response]);

  return null;
}
```

- `Notifications.useLastNotificationResponse()` : hook qui expose la dernière réponse (tap) de notification.
- La charge utile se lit dans `response.notification.request.content.data` — c'est le `data` posé lors de la programmation / de l'envoi.
- Navigation avec `router.push(...)` d'Expo Router.

**Montage** à la racine, sous le routeur, dans `app/_layout.tsx` (pour que `router` soit disponible) :

```jsx
<NotesProvider>
  <NotificationRouter />
  {/* … votre navigation … */}
</NotesProvider>
```

**Alternative impérative** (sans hook) — écouter l'événement et lire la dernière réponse au lancement :

```js
// Écouteur d'événement (app ouverte / arrière-plan)
const sub = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  // … même navigation …
});
// sub.remove();

// Au lancement (cold start)
const last = await Notifications.getLastNotificationResponseAsync();
if (last) {
  const data = last.notification.request.content.data;
  // … même navigation …
}
```

- `Notifications.addNotificationResponseReceivedListener(cb)` : renvoie un abonnement (`sub`) qu'on retire avec `sub.remove()`.
- `Notifications.getLastNotificationResponseAsync()` : version asynchrone one-shot pour lire, au démarrage, la notif qui a lancé l'app.

**Test qui compte** : app fermée (swipe) puis relance via la notif → on doit atterrir sur le bon écran (cold start). Si ce cas passe, le deep-linking est solide.


