# Cadrage

> Cahier des charges du projet ReverseMacro. Définit précisément le MVP,
> le périmètre assumé, et la couverture de la grille de compétences.

---

##  Cahier des charges

- **Projet :** ReverseMacro

- **Problème :** changer d'objectif physique impose de d'adapter sa diète. Appliquer ces changements sans choquer l'organisme demande un ajustement progressif et calculée de sa diète. La plupart des gens ne le font pas ou approximativement, sans plan définis.

- **Utilisateur cible :** Athlète, pratiquant de musculation / fitness ou personne suivant un régime qui veut ajuster & planifier son changement de diète.

- **Fonctionnalité coeur:** à partir d'un point de départ (macros actuelles), d'une cible calorique et d'une durée, générer et afficher la montée semaine par semaine (calories + protéines / lipides / glucides).

- **Fonctionnalités secondaires :** plusieurs plans sauvegardés par compte : 
	- renommer un plan 
	- supprimer un plan
	- ajuster la répartition des macro-nutriments : 
		- protéines
		- glucides
		- lipides

- **Hors périmètre :** l'app ne journalise pas ce qui est mangé au quotidien, elle génère uniquement un plan.

- **Stack :** Expo (Expo Router) + Supabase (auth + données)

---

## Fonctionnalité primaire
Le cœur du MVP génère à partir de quelques informations un plan d'ajustement hebdomadaire progressif qui matérialise l'évolution de la reverse diet.

### Ce que l'utilisateur fournit
Trois informations suffisent :
- ses macro-nutriments journaliers actuels : 
	- protéines
	- glucides
	- lipides
- son objectif calorique
- la durée allouée à sa reverse diet

### Ce que l'app génère
À partir de ces entrées, l'app produit un plan hebdomadaire sous forme de
tableau. Pour chaque semaine, il indique les quotas journaliers à viser :
- le quota de calories (kcal)
- le quota de protéines (g)
- le quota de glucides (g)
- le quota de lipides (g)

### Le principe de progression
Les calories tendent graduellement du point de départ jusqu'à l'objectif, sur la durée choisie. Les protéines, glucides et lipides se répartissent selon les préférences réglables par l'utilisateur. C'est ce plan hebdomadaire qui constitue le cœur du MVP.

---

## Fonctionnalités secondaires
Une fois le MVP en place, l'app permet à l'utilisateur de gérer plusieurs plans et d'affiner ses réglages. Ces fonctions ne sont pas indispensables, mais enrichissent l'usage au quotidien.

### Gestion de plusieurs plans
Chaque utilisateur peut enregistrer plusieurs plans sous son compte. Typiquement
un plan par objectif ou par phase. Chaque plan porte un nom qui permet de les distinguer. L'utilisateur peut :
- renommer un plan
- supprimer un plan
- modifier un plan

### Réglage de la répartition des macro-nutriments
Au-delà de la répartition proposée par défaut, l'utilisateur peut ajuster
lui-même comment se répartissent ses macro-nutriments sur le plan :
- protéines
- glucides
- lipides

Cela lui permet de coller à ses préférences ou aux recommandations qu'il suit,
sans être enfermé dans un réglage imposé.

---

## Écrans & navigation
Deux zones via Expo Router :
- **Zone Auth (non connecté)** : 
	- **Connexion** : formulaire de connexion
	- **Inscription** : formulaire d'inscription
- **Zone App (connecté)** : 
  - **Mes plans** : liste des plans de l'utilisateur
  - **Nouveau plan** : formulaire de cadrage (macros de départ, cible, durée, règle protéines, ratio glucides/lipides)
  - **Détail** : tableau semaine par semaine
  - **Compte** : réglages utilisateur

---

## Données & persistance

- **Backend Supabase** : 
	- auth email/mot de passe
	- table `plans` : 
		- **nom** : nom du plan
		- **base_calories** : quota de calories journalier actuel
		- **base_proteine** : quota de protéine journalier actuel
		- **base_lipide** : quota de lipide journalier actuel
		- **base_glucide** : quota de glucide journalier actuel
		- **cible_calories** : quota de calories journalier ciblé
		- **ratio_proteine** : ratio en pourcentage d'influence des protéines sur le plan
		- **duree_semaines** : durée de la reverse diet, en semaines
- La table stocke uniquement les paramètres du plan. Le plan détaillé est recalculée côté client à l'ouverture.
- RLS activée : chaque utilisateur ne voit que ses propres plans.

---

## Couverture de la grille de compétences

| Domaine                 | Comment ReverseMacro le couvre                                                         |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Cadrage**             | Ce document : MVP clair, périmètre assumé (pas de journal quotidien)                   |
| **Navigation & écrans** | Zone Auth + 4 écrans app, navigation cohérente via Expo Router                         |
| **État & données**      | État géré (session + plans) et persistance backend via Supabase                        |
| **Une brique avancée**  | Auth + backend Supabase avec RLS                                                       |
| **Finition**            | UI cohérente + tests unitaires sur `generateReversePlan` (cas nominal, bornes, ratios) |
| **Livraison**           | Build de production `.aab` + voie A ou B                                               |
| **Monétisation**        | Gratuit (angle assumé : offre pro ultérieure = plans illimités)                        |
| **Présentation**        | README + fiche portfolio + pitch                                                       |

---

## Voie de validation
**Voie A retenue** : build `.aab` de production + plan de publication documenté.

Le build de production est généré et accompagné d'un plan de publication documenté décrivant les étapes qui mèneraient à une mise en ligne réelle sur le store.
