---
title: Guide des Gisements
category: guides
excerpt: Comprendre, exploiter et optimiser les sources de ressources.
---

# Guide des Gisements : Les Sources de Richesse

> _"La matière ne se crée pas. Elle s'extrait. Et celui qui contrôle les gisements contrôle le commencement de tout."_
> — Le Baron de la Matière

---

## Introduction : La Base de Tout

Avant les usines, avant les produits finis, avant l'argent — il y a les **gisements**. Ces sources de matières premières sont le fondement de tout empire industriel.

Ce guide t'apprendra à trouver, exploiter et optimiser ces trésors enfouis.

---

## Types de Gisements

### Gisements Forestiers

- **Ressource** : Bois
- **Abondance** : Très commun
- **Machine d'extraction** : Exploitation Forestière

Le bois est la ressource de départ par excellence. Facile à trouver, facile à exploiter.

### Gisements Miniers

- **Ressource** : Pierre, Fer, Cuivre, Charbon
- **Abondance** : Commun à Rare
- **Machine d'extraction** : Extraction Minière

Les minerais sont plus précieux que le bois, mais nécessitent des technologies plus avancées.

### Gisements Pétroliers

- **Ressource** : Pétrole Brut
- **Abondance** : Rare
- **Machine d'extraction** : Pompe à Pétrole, Plateforme Offshore

Le pétrole est l'or noir du Secteur Omni. Celui qui le contrôle a un avantage stratégique majeur.

### Gisements de Silice

- **Ressource** : Silice (Sable)
- **Abondance** : Commun
- **Usage** : Fabrication du verre

Souvent négligé, le sable devient crucial quand tu développes ton industrie du verre.

---

## Caractéristiques des Gisements

### La Taille

La taille d'un gisement détermine sa **capacité d'exploitation** :

```
Employés max = Taille × 5
Machines max = Taille × 1
```

**Exemple** :

- Gisement Taille 2 : 10 employés OU 2 machines max
- Gisement Taille 5 : 25 employés OU 5 machines max

### La Quantité

Chaque gisement a une **quantité** de ressources disponibles. Quand la quantité atteint 0, le gisement est épuisé.

```
Production consomme Quantité au fil du temps
```

### Les Coordonnées

Les gisements ont une position sur la carte. La distance peut affecter la logistique.

---

## L'Exploitation

### Connexion Machine-Gisement

Une machine d'extraction doit être **connectée** au gisement pour l'exploiter :

1. Place la machine (ex: Exploitation Forestière)
2. Place le gisement sur la carte
3. Connecte le gisement à la machine
4. La machine peut maintenant extraire

### Assignation du Personnel

L'extraction nécessite de la main-d'œuvre :

- Assigne des employés au gisement
- OU connecte une machine au gisement

**Équivalence** : 1 machine = 5 travailleurs

### Le Taux d'Extraction

Le taux dépend de :

```
Taux = (Base machine) × (Σ Efficacité travailleurs) × (Ratio énergie)
```

Plus d'employés efficaces + énergie suffisante = extraction plus rapide.

---

## La Capacité de Travail

### Calcul

La capacité totale de "travailleurs équivalents" sur un gisement :

```
Capacité = Employés + (Machines × 5)
```

### Limites

La capacité ne peut pas dépasser :

```
Limite Employés = Taille × 5
Limite Machines = Taille × 1
```

**Exemple** : Gisement Taille 3

- Max 15 employés
- OU Max 3 machines
- OU Combinaison (ex: 1 machine + 10 employés)

---

## L'Épuisement

### Le Processus

Chaque extraction consomme une partie de la quantité du gisement :

```
Quantité restante = Quantité initiale - Σ(Ressources extraites)
```

### Les Signes Avant-Coureurs

- Quantité qui diminue
- Rendement qui baisse (quand le gisement est presque vide)
- Alertes système

### Que Faire ?

1. **Planifie** : Estime la durée de vie du gisement
2. **Diversifie** : Aie toujours des gisements de remplacement
3. **Explore** : Envoie des expéditions découvrir de nouveaux gisements

---

## L'Exploration

### Le Principe

L'exploration envoie des employés découvrir de **nouveaux gisements** :

1. Sélectionne un employé avec bonne stat "Exploration Luck"
2. Lance une expédition
3. Attends le résultat

### Les Résultats Possibles

- **Rien** : Zone vide
- **Gisement pauvre** : Petite taille, faible quantité
- **Gisement riche** : Grande taille, grande quantité
- **Gisement rare** : Ressource uncommon (Lithium, Or...)

### Les Facteurs de Succès

```
Probabilité = Base × (1 + exploration_luck × 0.1)
Qualité = Random × (1 + exploration_luck × 0.05)
```

Les employés avec haute "exploration_luck" trouvent plus souvent et mieux.

---

## Stratégies d'Exploitation

### L'Exploitation Intensive

Extraire le plus vite possible :

**Avantages** :

- Revenus immédiats
- Retour sur investissement rapide

**Inconvénients** :

- Épuisement rapide
- Dépendance aux nouvelles découvertes

### L'Exploitation Durable

Contrôler le rythme d'extraction :

**Avantages** :

- Réserves longue durée
- Moins de pression sur l'exploration

**Inconvénients** :

- Revenus plus lents
- Immobilisation de capital

### Le Mix Optimal

Exploite intensivement les gisements communs, durablement les rares.

---

## La Défense des Gisements

### Les Menaces

Dans le Secteur Omni, tes gisements peuvent être :

- Volés par des concurrents
- Sabotés
- Revendiqués par force

### La Protection

- **Contrats légaux** : Droits d'exploitation officiels
- **Présence physique** : Employés sur place = dissuasion
- **Alliances** : Protections mutuelles

---

## Les Gisements Stratégiques

### Le Pétrole

Contrôler le pétrole, c'est contrôler l'énergie et le plastique. C'est le gisement stratégique par excellence.

### Le Lithium

Pour les batteries avancées. Rare et précieux.

### L'Or

Pour les composants électroniques de pointe. Stable et très rentable.

---

## Les Erreurs à Éviter

### Ignorer l'Épuisement

Un gisement vide = plus de production. Surveille toujours les quantités restantes !

### Surexploitation

Mettre plus de travailleurs que la capacité le permet = inefficacité.

### Négliger l'Exploration

Sans nouveaux gisements, ton avenir est limité. Explore constamment !

---

## Métriques Clés

| Métrique              | Description    | Action                 |
| --------------------- | -------------- | ---------------------- |
| Quantité restante     | Réserves       | Prévoir remplacement   |
| Taux d'extraction     | Vitesse        | Optimiser              |
| Rendement/travailleur | Efficacité     | Améliorer assignations |
| Durée de vie estimée  | Jours restants | Planifier              |

---

## Conclusion

Les gisements sont la fondation. Sans eux, rien n'est possible. Avec eux, tout est possible.

Trouve-les. Exploite-les intelligemment. Protège-les férocement.

> _"Le PDG sans gisements est un PDG sans avenir."_
> — Vérité du Baron de la Matière

---

## Pour Aller Plus Loin

- [Manuel du Joueur](/wiki/comment-jouer) — Les bases du jeu
- [Guide de l'Usine](/wiki/guide-usine) — Connecter les gisements
- [Le Baron de la Matière](/wiki/baron-matiere) — La philosophie des ressources
