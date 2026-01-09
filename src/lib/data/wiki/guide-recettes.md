---
title: Guide des Recettes
category: guides
excerpt: Comprendre et maîtriser les procédés de fabrication.
---

# Guide des Recettes : L'Art de la Transformation

> _"Le fer n'est rien. L'acier est quelque chose. Mais le moteur ? Le moteur est tout."_
> — Premier Enseignement de l'Architecte

---

## Introduction : La Valeur Ajoutée

Une ressource brute a une valeur. Une ressource transformée en a une autre, bien plus élevée. Cette différence — la **valeur ajoutée** — est le cœur de la profitabilité industrielle.

La recette est le mode d'emploi de cette transformation. Maîtrise les recettes, et tu maîtrises le profit.

---

## Anatomie d'une Recette

### Les Composants

Chaque recette contient :

- **ID** : Identifiant unique (ex: `steel_recipe`)
- **Nom** : Nom lisible (ex: "Fabrication d'Acier")
- **Entrées** : Liste d'ingrédients requis
- **Sortie** : Produit fabriqué
- **Temps de production** : Durée en secondes
- **Machine requise** : Type de machine nécessaire
- **Technologie requise** : Recherche à débloquer d'abord

### Exemple Concret

```yaml
steel_recipe:
  nom: "Fabrication d'Acier"
  entrées:
    - Lingot de Fer × 2
    - Charbon × 1
  sortie: Acier × 1
  temps: 120 secondes
  machine: Presse à Acier
  tech: steel_production
```

---

## Les Catégories de Recettes

### Composants de Base

Les premiers produits que tu fabriqueras :

**Planches de Bois**

- Entrée : Bois × 5
- Sortie : Planches × 2
- Machine : Scierie
- Temps : 20s

**Lingot de Fer**

- Entrée : Minerai de Fer × 3
- Sortie : Lingot × 1
- Machine : Fonderie Simple
- Temps : 40s

**Lingot de Cuivre**

- Entrée : Minerai de Cuivre × 3
- Sortie : Lingot × 1
- Machine : Fonderie Cuivre
- Temps : 40s

### Composants Intermédiaires

Pour les produits plus avancés :

**Acier**

- Entrée : Lingot de Fer × 2, Charbon × 1
- Sortie : Acier × 1
- Machine : Presse à Acier
- Temps : 120s

**Verre**

- Entrée : Silice × 10
- Sortie : Verre × 1
- Machine : Four à Verre
- Temps : 60s

**Plastique**

- Entrée : Pétrole Brut × 5
- Sortie : Plastique × 1
- Machine : Raffinerie
- Temps : 120s

### Composants Avancés

Le domaine de l'électronique :

**Câble Électrique**

- Entrée : Lingot de Cuivre × 2, Plastique × 1
- Sortie : Câble × 1
- Machine : Ligne d'Assemblage
- Temps : 60s

**Engrenage**

- Entrée : Acier × 1
- Sortie : Engrenage × 2
- Machine : Presse à Acier
- Temps : 30s

**Circuit Simple**

- Entrée : Cuivre × 1, Verre × 1
- Sortie : Circuit × 1
- Machine : Ligne d'Assemblage
- Temps : 90s

### Produits Finis

Les articles les plus rentables :

**Moteur Électrique**

- Entrée : Câble × 5, Engrenage × 3, Acier × 2
- Sortie : Moteur × 1
- Machine : Ligne d'Assemblage
- Temps : 360s

**Smartphone**

- Entrée : Processeur × 1, Verre × 2, Plastique × 2, Circuit × 3
- Sortie : Smartphone × 1
- Machine : Usine High-Tech
- Temps : 480s

**Ordinateur**

- Entrée : Processeur × 2, Circuit × 10, Plastique × 15, Acier × 5
- Sortie : Ordinateur × 1
- Machine : Usine High-Tech
- Temps : 600s

---

## Le Craft Manuel

### Le Principe

Certaines recettes peuvent être réalisées **manuellement** — sans machine — par toi-même, le PDG.

**Avantages** :

- Pas besoin de machine
- Production instantanée
- Idéal pour les petites quantités

**Inconvénients** :

- Tu dois être présent
- Pas d'automatisation possible
- Limité aux recettes marquées "Manual Craftable"

### Comment Faire

1. Ouvre l'atelier (Workshop)
2. Sélectionne une recette manuelle
3. Vérifie que tu as les ingrédients
4. Clique sur "Fabriquer"

La production est instantanée.

---

## L'Optimisation des Recettes

### Le Ratio Temps/Valeur

Calcule la valeur ajoutée par seconde :

```
Valeur/seconde = (Valeur sortie - Valeur entrées) / Temps de production
```

**Exemple : Acier**

- Valeur Acier : 60₭
- Valeur Fer×2 : 60₭
- Valeur Charbon×1 : 8₭
- Temps : 120s

```
Valeur/s = (60 - 68) / 120 = -0.07₭/s (PERTE !)
```

Cet exemple montre que parfois, le craft n'est profitable que si tu extrais toi-même les matières premières.

### Le Coût d'Opportunité

Pendant que ta machine fait une recette, elle ne peut pas en faire une autre. Choisis la recette qui maximise ton profit par heure.

### La Chaîne de Valeur

Certaines recettes sont des **intermédiaires** — elles ne sont pas rentables seules, mais nécessaires pour des recettes finales plus lucratives.

---

## Les Machines de Production

### La Correspondance

Chaque recette nécessite un type de machine spécifique :

| Machine            | Recettes                  |
| ------------------ | ------------------------- |
| Scierie            | Planches de Bois          |
| Fonderie Simple    | Lingot de Fer             |
| Fonderie Cuivre    | Lingot de Cuivre          |
| Presse à Acier     | Acier, Engrenage          |
| Four à Verre       | Verre                     |
| Raffinerie         | Plastique                 |
| Ligne d'Assemblage | Câbles, Circuits, Moteurs |
| Usine High-Tech    | Smartphones, Ordinateurs  |

### La Capacité

Une machine ne peut exécuter qu'une recette à la fois. Pour augmenter le volume, ajoute des machines.

---

## Les Arbres de Dépendance

### Le Principe

Les produits complexes dépendent de produits simples, qui dépendent de ressources brutes :

```
Smartphone
├── Processeur
│   ├── Circuit Simple
│   │   ├── Cuivre
│   │   └── Verre
│   │       └── Silice
│   └── Plastique
│       └── Pétrole
├── Verre
└── Plastique
```

### L'Implication

Pour produire des smartphones, tu dois avoir toutes les machines et ressources de l'arbre entier. Planifie en conséquence !

---

## Les Erreurs Classiques

### Ignorer les Entrées

Tu veux produire de l'acier, mais tu n'as pas de charbon. Vérifie toujours ta chaîne d'approvisionnement !

### Goulot d'Entrée

Ta machine est prête, mais les entrées arrivent trop lentement. Augmente la production en amont.

### Goulot de Sortie

La sortie s'accumule mais n'est pas évacuée. Connecte la machine à un stockage ou à l'entreprise !

---

## Les Recettes Spéciales

### Les Constructions (Machines Craftables)

Certaines machines ne s'achètent pas — elles se fabriquent :

**Plateforme Offshore**

- Entrée : Acier × 50, Plastique × 20, Moteur × 10
- Temps : 3600s (1 heure)

Ces recettes nécessitent une chaîne de production mature.

### L'Acier Renforcé

Pour les projets les plus ambitieux :

**Acier Renforcé**

- Entrée : Acier × 10, Lingot de Fer × 5
- Sortie : Acier Renforcé × 1
- Machine : Presse à Acier

---

## Conclusion

Les recettes sont le langage de la transformation. Chaque recette est une opportunité — de profit, d'efficacité, de domination. Comprends-les, optimise-les, maîtrise-les.

> _"Celui qui ne sait pas transformer reste un extracteur. Celui qui transforme devient un industriel."_
> — Proverbe du Secteur Omni

---

## Pour Aller Plus Loin

- [Manuel du Joueur](/wiki/comment-jouer) — Les bases du jeu
- [Guide de l'Usine](/wiki/guide-usine) — La production industrielle
- [Guide des Technologies](/wiki/guide-technologies) — Débloquer de nouvelles recettes
