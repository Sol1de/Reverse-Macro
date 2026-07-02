## Module 13 — Monétisation

Ce module couvre les modèles de monétisation d'applications mobiles, les contraintes imposées par les stores (Apple App Store, Google Play), et l'implémentation concrète des achats in-app en React Native / Expo à l'aide de RevenueCat (`react-native-purchases`). Il se termine sur la méthodologie de choix d'un modèle adapté et le respect des règles et de l'utilisateur.

### Panorama des modèles de monétisation

Il existe cinq grands modèles pour gagner de l'argent avec une application :

- **App payante** : on paie une fois pour télécharger l'application. Revenu ponctuel, friction élevée à l'installation. Convient aux outils de niche ou professionnels.
- **Achats in-app (IAP)** : l'application est gratuite au téléchargement, on débloque du contenu ou des fonctionnalités à l'intérieur. Revenu ponctuel mais répétable, friction faible. Convient aux jeux et aux déblocages.
- **Abonnement** : paiement récurrent donnant un accès continu. Revenu récurrent, friction moyenne. Convient aux apps offrant une valeur continue.
- **Freemium** : application gratuite et utile, avec une offre premium en option. Revenu mixte, friction très faible. Convient aux apps grand public reposant sur la conversion d'une minorité d'utilisateurs.
- **Publicité** : application gratuite, financée par des annonces. Revenu proportionnel au volume d'audience, friction nulle. Convient aux apps à très forte audience.

#### Tableau comparatif « Lequel pour quoi »

| Modèle | Revenu | Friction | Va bien avec |
|---|---|---|---|
| App payante | Ponctuel | Élevée | Outils de niche, pro |
| IAP | Ponctuel, répété | Faible | Jeux, déblocages |
| Abonnement | Récurrent | Moyenne | Valeur continue |
| Freemium | Mixte | Très faible | Apps grand public |
| Publicité | Volume d'audience | Nulle | Très forte audience |

### La « taxe des stores » — commission ~30 %

Point de contrainte central qui conditionne tous les modèles : Apple et Google prélèvent une commission d'environ **30 %** sur tout ce qui est vendu à l'intérieur de l'application. Cette commission est **souvent réduite à ~15 %** pour les petits revenus (petits développeurs / programmes small business) et pour les abonnements longs (typiquement à partir de la deuxième année d'abonnement).

### La règle qui conditionne tout : bien numérique vs bien physique

La distinction déterminante pour savoir quel système de paiement utiliser :

- **Bien numérique consommé dans l'application** → l'**IAP du store est obligatoire**. On ne peut PAS utiliser Stripe (ou un autre processeur tiers) pour débloquer une fonction premium numérique. Contourner cette règle entraîne le **rejet de la mise à jour** par le store.
- **Bien physique ou service rendu hors application** → vous utilisez **vos propres moyens de paiement** (Stripe, etc.), sans passer par l'IAP du store.
- Ces **règles sont en évolution** : des ouvertures apparaissent sur les paiements externes, notamment en Europe et aux États-Unis (contexte réglementaire mouvant).

### Cas d'application : NotezTout en freemium

L'application fil rouge « NotezTout » adopte le modèle freemium :

- **NotezTout gratuit** : permet de prendre des notes (fonctionnalité de base réellement utile).
- La **conversion d'une minorité** d'utilisateurs mène à **NotezTout Pro** (abonnement).
- **NotezTout Pro** débloque : la **synchronisation multi-appareils**, les **thèmes**, et les **notes illimitées**.

### Achats in-app avec RevenueCat

#### Pourquoi RevenueCat plutôt que l'ancien module

- `expo-in-app-purchases` est **abandonné** et retiré du SDK Expo : il ne faut plus l'utiliser.
- Implémenter la vente « à la main » directement avec **StoreKit** (iOS) / **Play Billing** (Android) reste **lourd** et complexe.
- La gestion des **reçus, de la restauration et de la fraude** est prise en charge par RevenueCat.
- `react-native-purchases` (le SDK RevenueCat) est le **standard de l'industrie**.

#### La chaîne complète d'un achat in-app

Le flux d'un achat suit ces étapes :

1. L'**app** appelle `purchasePackage`.
2. Le **store** affiche sa **feuille de paiement** (payment sheet native).
3. Le store renvoie un **reçu signé**.
4. **RevenueCat valide le reçu**.
5. L'**entitlement « pro »** est déterminé **actif ou non**, et l'information redescend jusqu'à l'app.

#### Anatomie d'un projet RevenueCat

La modélisation RevenueCat s'articule en quatre concepts en cascade :

- **Offering** : le paquet d'offres affiché à l'utilisateur (l'offre courante par défaut).
- **Packages** : les déclinaisons proposées, par exemple mensuel, annuel.
- **Products** : les produits réels déclarés dans les stores, par exemple `noteztout_pro_monthly`.
- **Entitlement** : le droit d'accès logique, par exemple « pro », qui est ce que l'application interroge pour savoir si l'utilisateur a payé.

La logique : `Offering → Packages → Products → Entitlement`. On vérifie toujours l'**entitlement** (et non le produit précis) pour débloquer les fonctionnalités, ce qui découple le code de la tarification.

### Prérequis (le vrai travail du jour J)

Avant de pouvoir coder l'achat, il faut réunir :

- Un **dev build** (build de développement) : RevenueCat est un module **natif**, il **ne fonctionne pas dans Expo Go**. On teste toujours sur un dev build.
- Le **produit créé chez Apple ET chez Google** (les deux stores).
- Un **projet RevenueCat** configuré avec ses entitlement, products, offering et clés d'API.
- Des **comptes développeurs payants** : Apple à **99 $/an**, Google à **25 $ une fois** (paiement unique).

#### Piège côté stores

Il y a une étape administrative côté stores sans laquelle rien ne marche : côté iOS, il faut **signer le contrat « Paid Applications »** ; côté Android, il faut **téléverser l'app sur une piste** (track de test/production). Sinon, `getOfferings()` renvoie une **offre vide** (aucun package disponible), même si le code est correct.

### Implémentation pas à pas

#### Étape 1 — Installer et configurer

Installation du SDK et configuration au démarrage de l'app, avec des clés d'API distinctes par plateforme via `Platform.select`. Les clés sont lues depuis des variables d'environnement Expo publiques.

```ts
// Installation
// npx expo install react-native-purchases

import { Platform } from "react-native";
import Purchases from "react-native-purchases";

Purchases.configure({
  apiKey: Platform.select({
    ios: process.env.EXPO_PUBLIC_RC_IOS_KEY!,
    android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY!,
  })!,
});
```

Points clés : chaque plateforme a sa propre clé publique RevenueCat, sélectionnée à l'exécution par `Platform.select`. La configuration se fait une fois au démarrage.

#### Étape 2 — Récupérer et afficher l'offre

On récupère l'offering courant et on en extrait les packages disponibles à afficher.

```ts
import Purchases, { PurchasesPackage } from "react-native-purchases";

async function loadOffering(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  // `current` = l'offering par défaut du dashboard RevenueCat
  return offerings.current?.availablePackages ?? [];
}
```

Points clés :
- `Purchases.getOfferings()` renvoie les offerings ; `offerings.current` correspond à l'offering marqué par défaut dans le dashboard RevenueCat.
- On lit `offerings.current?.availablePackages`, avec un repli sur `[]` (chaînage optionnel + coalescence nulle) pour gérer le cas d'offre vide.
- Chaque `package.product.priceString` est **déjà localisé** par le store (devise et format du pays de l'utilisateur), par exemple « 4,99 € ». Il ne faut donc jamais formater le prix soi-même.

#### Étape 3 — Encaisser un achat

L'achat se fait via `purchasePackage`, et on distingue une vraie erreur d'une simple annulation par l'utilisateur.

```ts
async function buy(pkg: PurchasesPackage) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active["pro"] !== undefined;
  } catch (e: any) {
    if (!e.userCancelled) {
      throw e; // une vraie erreur, pas une annulation
    }
    return false;
  }
}
```

Points clés :
- `Purchases.purchasePackage(pkg)` déclenche la feuille de paiement native et retourne un objet contenant `customerInfo`.
- Le succès de l'achat se vérifie en testant `customerInfo.entitlements.active["pro"] !== undefined` (l'entitlement « pro » est présent dans les entitlements actifs).
- **Piège important** : quand l'utilisateur annule, une exception est levée avec le flag `e.userCancelled`. Il faut la traiter comme un cas normal (retourner `false`) et **ne relancer (`throw`) que les vraies erreurs** (`!e.userCancelled`). Ne pas confondre annulation et échec.

#### Étape 4 — Débloquer Pro partout (hook `useIsPro`)

On centralise l'état « l'utilisateur est-il Pro ? » dans un hook custom qui écoute les mises à jour de RevenueCat.

```ts
export function useIsPro() {
  const [isPro, setIsPro] = useState(false);
  useEffect(() => {
    const update = (info: CustomerInfo) =>
      setIsPro(info.entitlements.active["pro"] !== undefined);

    Purchases.getCustomerInfo().then(update); // état initial
    Purchases.addCustomerInfoUpdateListener(update); // achats, expiration…

    // on retire le MÊME callback (sinon le retrait est ignoré)
    return () => Purchases.removeCustomerInfoUpdateListener(update);
  }, []);
  return isPro;
}
```

Points clés et patterns :
- `Purchases.getCustomerInfo()` fournit l'**état initial** (l'utilisateur est-il déjà Pro au montage ?).
- `Purchases.addCustomerInfoUpdateListener(update)` s'abonne aux **mises à jour** : nouveaux achats, **expirations** d'abonnement, restaurations, etc. C'est ce qui garde l'UI synchronisée en temps réel avec l'état d'abonnement.
- **Piège de nettoyage** : dans la fonction de cleanup du `useEffect`, on doit appeler `Purchases.removeCustomerInfoUpdateListener(update)` avec **exactement la même référence de callback** que celle passée à `addCustomerInfoUpdateListener`. Si la référence diffère, le retrait est ignoré et on crée une fuite (listener fantôme). D'où la définition d'une constante `update` unique réutilisée aux deux endroits.
- Le hook renvoie un booléen `isPro` réactif, utilisable dans n'importe quel composant.

#### Verrouiller une fonctionnalité Pro

On utilise le hook pour protéger l'accès à une fonctionnalité premium en affichant un paywall aux utilisateurs non-Pro.

```ts
const isPro = useIsPro();

if (!isPro) {
  return <PaywallScreen />; // sinon, on propose l'abonnement
}
// … fonctionnalité Pro : sync, thèmes, notes illimitées …
```

Point clé : le pattern de « feature gating » consiste à retourner tôt un écran de paywall (`PaywallScreen`) quand `isPro` est faux, et à ne rendre la fonctionnalité premium qu'ensuite.

#### Étape 5 — Restaurer les achats

La restauration réactive un abonnement déjà acheté sur un autre appareil ou après réinstallation.

```ts
async function restore() {
  const info = await Purchases.restorePurchases();
  return info.entitlements.active["pro"] !== undefined;
}
```

Points clés :
- `Purchases.restorePurchases()` interroge le store pour retrouver les achats de l'utilisateur et renvoie un `CustomerInfo` à jour.
- On vérifie ensuite l'entitlement « pro » comme ailleurs.
- **Obligation des stores** : réinstaller l'app ou changer de téléphone **ne doit pas faire perdre l'abonnement**. Un bouton « Restaurer mes achats » est donc requis (et attendu par les processus de validation Apple/Google).

### Tester sans vendre pour de vrai

- Les stores fournissent un **mode sandbox** dédié aux tests d'achat.
- On utilise des **comptes de test** qui simulent l'achat **sans débit** réel.
- Les tests d'achat se font **toujours sur un dev build**, **jamais dans Expo Go** (module natif requis).

### Choisir un modèle adapté à son app

L'objectif est de passer de « je connais les modèles » à « je choisis le bon » : aligner le modèle sur la **valeur** réelle de l'app, fixer un **prix crédible**, sans piéger l'utilisateur.

#### Aligner le modèle sur le rythme de la valeur

Le bon modèle dépend de la façon dont l'application délivre sa valeur dans le temps :

| Rythme de la valeur | Modèle naturel |
|---|---|
| Ponctuelle (un outil utilisé de loin en loin) | Achat unique ou IAP |
| Continue (contenu, sync, service vivant) | Abonnement |
| Large, conversion d'une minorité | Freemium |

#### Fixer un prix crédible

- **Ancrer par la valeur**, pas par le coût de développement : le prix reflète le bénéfice pour l'utilisateur, pas l'effort de production.
- **Peu d'options** : idéalement un mensuel et un annuel, l'annuel présenté comme « 2 mois offerts » (incitation à l'engagement long).
- L'**essai gratuit** lève le doute et **convertit** mieux.
- **Raisonner en net** : à cause de la commission des stores, sur un prix affiché de ~5 €, il vous reste environ **3,50 à 4,25 €** (selon commission à 15 % ou 30 %). Toujours calculer le revenu net réel.

#### Respecter les règles et l'utilisateur

- **Bien numérique in-app → IAP**, sinon la **mise à jour est rejetée** (rappel de la règle store).
- **Pas de dark patterns** : pas de faux comptes à rebours, pas de bouton de **désabonnement caché**.
- Le modèle « gratuit » qui **prélève en silence** (frais cachés, abonnement démarré à l'insu de l'utilisateur) **détruit la confiance**.
- En **freemium**, la version gratuite doit rester **réellement utile** (et non un simple appât mutilé).

#### Une méthode en quatre questions

Cadre de décision pour définir sa stratégie de monétisation :

1. **Quelle valeur ?** (que délivre l'app et à quel rythme)
2. **Qui paie ?** (le profil d'utilisateur prêt à payer)
3. **Combien ?** (le prix crédible, ancré sur la valeur, net de commission)
4. **Conforme ?** (respect des règles des stores et absence de dark patterns)

La cohérence de ces quatre réponses **définit la stratégie** de monétisation.

### Récapitulatif des APIs et concepts clés

- **SDK** : `react-native-purchases` (RevenueCat) — remplace `expo-in-app-purchases` (abandonné).
- **Configuration** : `Purchases.configure({ apiKey })` avec `Platform.select` pour les clés iOS/Android.
- **Lecture de l'offre** : `Purchases.getOfferings()` → `offerings.current.availablePackages` ; prix via `package.product.priceString` (déjà localisé).
- **Achat** : `Purchases.purchasePackage(pkg)` → `customerInfo.entitlements.active["pro"]` ; gérer `e.userCancelled`.
- **État d'abonnement** : `Purchases.getCustomerInfo()`, `Purchases.addCustomerInfoUpdateListener` / `Purchases.removeCustomerInfoUpdateListener` (même référence de callback).
- **Restauration** : `Purchases.restorePurchases()`.
- **Types TypeScript** : `PurchasesPackage`, `CustomerInfo`.
- **Modélisation RevenueCat** : Offering → Packages → Products → Entitlement.
- **Contraintes** : dev build obligatoire (module natif, pas Expo Go) ; comptes payants Apple 99 $/an et Google 25 $ ; contrat « Paid Applications » (iOS) et upload sur une piste (Android) sinon offre vide ; commission stores ~30 % (réduite à ~15 %) ; IAP obligatoire pour les biens numériques.
