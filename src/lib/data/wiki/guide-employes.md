---
title: Guide des Employés
category: guides
excerpt: Tout savoir sur le recrutement et la gestion du personnel.
---

# Guide des Employés : Gérer ta Main-d'Œuvre

> _"Un employé bien géré vaut dix mal payés. Un employé mal géré te coûtera cent fois son salaire."_
> — Manuel du PDG, Chapitre 7

---

## Introduction : Le Capital Humain

Dans le Secteur Omni, les machines ne suffisent pas. Tes usines ont besoin de bras, de cerveaux, de sueur. Les employés sont le **capital humain** de ta corporation — une ressource à optimiser comme n'importe quelle autre.

Ce guide t'apprendra tout ce que tu dois savoir sur le recrutement, la gestion et l'optimisation de ta main-d'œuvre.

---

## Le Recrutement

### Le Processus d'Embauche

Quand tu recrutes un nouvel employé, le système génère automatiquement :

- Un **nom** aléatoire
- Un **poste** (Manutentionnaire, Opérateur, Ouvrier, Mineur, Explorateur)
- Une **rareté** (Commun, Peu commun, Rare, Légendaire)
- Des **statistiques** basées sur la rareté

### Les Postes Disponibles

| Poste            | Spécialité               |
| ---------------- | ------------------------ |
| Manutentionnaire | Transport et stockage    |
| Opérateur        | Gestion des machines     |
| Ouvrier          | Production manuelle      |
| Mineur           | Extraction de ressources |
| Explorateur      | Découverte de gisements  |

Chaque poste a ses forces, mais tous peuvent être assignés à n'importe quelle tâche.

---

## Le Système de Rareté

### Les Quatre Niveaux

| Rareté         | Probabilité | Efficacité Base | Salaire Base |
| -------------- | ----------- | --------------- | ------------ |
| Commun (0)     | 60%         | 1.05×           | 26₭          |
| Peu commun (1) | 30%         | 1.25×           | 65₭          |
| Rare (2)       | 9%          | 1.50×           | 130₭         |
| Légendaire (3) | 1%          | 2.00×           | 260₭         |

### L'Efficacité

L'efficacité finale d'un employé est calculée comme suit :

```
Efficacité = Base × (0.9 + Random × 0.2)
```

Cela signifie qu'un employé légendaire peut avoir une efficacité entre 1.80× et 2.20×.

### Le Salaire

Le salaire suit une formule similaire :

```
Salaire = Base × (0.9 + Random × 0.2)
```

Un employé légendaire peut donc coûter entre 234₭ et 286₭ par période.

---

## Les Statistiques

Chaque employé possède des statistiques qui affectent ses performances :

### Mining (Extraction)

Affecte la vitesse d'extraction des ressources dans les gisements. Plus c'est élevé, plus l'employé extrait vite.

**Formule d'impact** :

```
Bonus d'extraction = 1 + (Mining × 0.05)
```

Un employé avec Mining 6 extrait donc 30% plus vite qu'un avec Mining 1.

### Exploration Luck (Chance d'Exploration)

Affecte la qualité des découvertes lors des expéditions. Les employés avec une haute chance d'exploration trouvent des gisements plus riches.

### Energy (Énergie)

L'énergie représente l'endurance de l'employé. Elle diminue pendant le travail et se régénère pendant le repos.

**Cycle de travail** :

- 24 minutes de travail actif
- 24 minutes de repos

Pendant le repos, l'employé ne produit pas mais récupère son énergie.

### Maintenance

Affecte l'efficacité des réparations quand l'employé est assigné à la maintenance des machines.

---

## Les Coûts du Recrutement

### Frais d'Embauche

Quand tu recrutes un employé, tu dois payer des **frais d'embauche** :

```
Frais d'embauche = Salaire × 5
```

Un employé légendaire à 260₭ de salaire coûte donc 1 300₭ à l'embauche.

### Réserve Recommandée

Le système vérifie que tu as assez de fonds pour payer l'employé pendant une période :

```
Réserve recommandée = Salaire × 30
```

Si ton solde est inférieur à `Frais + Réserve`, l'embauche est refusée.

### Exemple Complet

Pour un employé légendaire (Salaire = 260₭) :

- Frais d'embauche : 1 300₭
- Réserve recommandée : 7 800₭
- **Total requis : 9 100₭**

---

## L'Assignation

### Les Postes de Travail

Un employé peut être assigné à :

- **Un gisement** : Pour l'extraction de ressources
- **Une machine** : Pour la production
- **La maintenance** : Pour réparer les machines usées
- **L'exploration** : Pour découvrir de nouveaux gisements

### Les Limites

Chaque gisement a une capacité maximale d'employés basée sur sa taille :

```
Employés max = Taille du gisement × 5
```

Un gisement de taille 3 peut donc accueillir jusqu'à 15 employés.

### L'Efficacité Collective

Quand plusieurs employés travaillent ensemble, leurs efficacités s'additionnent :

```
Production totale = Σ (Production de base × Efficacité de l'employé)
```

---

## La Gestion des Salaires

### Le Cycle de Paie

Les salaires sont déduits automatiquement à intervalles réguliers. Si ta trésorerie est insuffisante :

1. Les employés ne sont pas payés
2. Leur moral baisse
3. Leur efficacité diminue
4. Certains peuvent démissionner

### L'Optimisation Salariale

Le PDG avisé calcule son **ratio ROI par employé** :

```
ROI = (Production générée × Prix de vente) / Salaire
```

Si le ROI est inférieur à 1, l'employé te coûte plus qu'il ne rapporte.

---

## Le Licenciement

### Quand Licencier ?

- L'employé a un ROI négatif
- Tu dois réduire tes coûts fixes
- L'employé a de mauvaises statistiques comparé aux autres

### Les Conséquences

Le licenciement n'a pas de coût direct dans le Secteur Omni (pas d'indemnités). Mais il réduit ta capacité de production.

---

## Les Stratégies Avancées

### La Chasse aux Légendaires

Certains PDG recrutent en masse, gardent les légendaires, et licencient les communs. C'est coûteux mais efficace à long terme.

**Procédure** :

1. Recrute 10-20 employés
2. Garde ceux avec rareté 2-3
3. Licencie les autres
4. Répète jusqu'à avoir une équipe d'élite

### La Spécialisation

Assigne les employés aux tâches qui correspondent à leurs statistiques :

- Mining élevé → Gisements
- Maintenance élevée → Réparations
- Exploration élevée → Expéditions

### L'Équilibre Travail/Repos

Planifie les rotations pour que tes gisements ne soient jamais à l'arrêt :

- Équipe A travaille pendant que l'équipe B se repose
- Rotation toutes les 24 minutes

---

## Les Pièges à Éviter

### Trop d'Employés

Avoir plus d'employés que nécessaire gonfle ta masse salariale sans augmenter ta production.

### Pas Assez de Réserves

Si tu ne peux pas payer les salaires, tes employés partent. Garde toujours 30 jours de salaires en réserve.

### Ignorer les Statistiques

Un employé légendaire avec Mining 2 est moins utile dans une mine qu'un commun avec Mining 6.

---

## Conclusion

Les employés sont le cœur battant de ta corporation. Recrute judicieusement, assigne intelligemment, et optimise constamment. La main-d'œuvre bien gérée est ta plus grande force — la mal gérée sera ta chute.

> _"Le PDG qui ne connaît pas ses employés ne connaît pas son entreprise."_
> — Enseignement du Secteur Omni

---

## Pour Aller Plus Loin

- [Manuel du Joueur](/wiki/comment-jouer) — Les bases du jeu
- [Guide de l'Usine](/wiki/guide-usine) — Construire ta production
- [L'Architecte](/wiki/architecte) — La voie technologique
