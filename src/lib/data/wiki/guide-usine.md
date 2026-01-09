---
title: Guide de l'Usine
category: guides
excerpt: Construire et optimiser ta chaîne de production.
---

# Guide de l'Usine : Maîtriser la Production

> _"Une usine bien conçue tourne toute seule. Une usine mal conçue te ruine en silence."_
> — Proverbe du Secteur Omni

---

## Introduction : L'Usine comme Organisme

Ton usine n'est pas un simple amas de machines. C'est un **organisme vivant** où les ressources coulent comme le sang, où l'énergie pulse comme un cœur, où les produits finis sont le fruit d'une symphonie industrielle.

Ce guide t'apprendra à construire, connecter et optimiser cet organisme.

---

## Les Composants de l'Usine

### 1. Les Gisements (Sources)

Les gisements sont les **sources** de matières premières. Ils contiennent du bois, du fer, du cuivre, du pétrole — les ingrédients de base de tout empire industriel.

**Caractéristiques des gisements** :

- **Type** : La ressource qu'ils contiennent
- **Quantité** : Combien de ressources restent
- **Taille** : La capacité d'exploitation (employés/machines max)

### 2. Les Machines (Transformateurs)

Les machines transforment les ressources. Il y a deux types :

**Extracteurs** :

- Se connectent aux gisements
- Tirent les ressources du sol
- Exemple : Exploitation Forestière, Pompe à Pétrole

**Transformateurs** :

- Prennent des ingrédients en entrée
- Produisent des produits en sortie
- Exemple : Scierie, Fonderie, Ligne d'Assemblage

### 3. Les Stockages (Tampons)

Les stockages sont des **tampons** entre les étapes de production :

- **Petit Entrepôt** : 1000 unités (solides)
- **Citerne Standard** : 1000 litres (liquides)

Ils permettent de lisser les flux et d'éviter les arrêts de production.

### 4. L'Entreprise (Destination)

L'entreprise (le nœud jaune) est la **destination finale**. Les ressources qui y arrivent sont prêtes à être vendues sur le marché.

---

## Les Connexions

### Le Principe

Dans le Secteur Omni, les ressources ne téléportent pas. Elles doivent **circuler** à travers des connexions :

```
Gisement → Machine → Stockage → Entreprise
```

Sans connexion, les ressources restent bloquées.

### Comment Connecter

1. Sélectionne un nœud source
2. Tire un câble vers la destination
3. Valide la connexion

Les connexions apparaissent comme des lignes entre les nœuds sur ta carte d'usine.

### Les Règles de Connexion

- Un gisement doit être connecté à une machine extractrice
- Une machine extractrice doit être connectée à un stockage ou à l'entreprise
- Une machine de transformation doit recevoir ses ingrédients d'un stockage en amont
- Tout le monde peut se connecter à l'entreprise

---

## Construire ta Première Chaîne

### Étape 1 : Acheter l'Extraction

Commence par une **Exploitation Forestière** — c'est la machine de base pour extraire du bois.

### Étape 2 : Placer le Gisement

Place un gisement de bois sur ta carte d'usine. C'est la source de matière première.

### Étape 3 : Connecter Gisement → Machine

Tire un lien du gisement vers l'exploitation forestière. La machine peut maintenant "voir" la ressource.

### Étape 4 : Connecter Machine → Entreprise

Tire un lien de l'exploitation forestière vers ton nœud entreprise (jaune). Le bois produit sera automatiquement transféré.

### Étape 5 : Assigner des Employés

Assigne des employés ou une machine au gisement. Sans main-d'œuvre, pas d'extraction !

**Félicitations !** Tu as construit ta première chaîne de production.

---

## L'Énergie

### Les Types d'Énergie

- **Manuelle** : Tes employés fournissent l'effort. Gratuit mais limité par le nombre d'employés.
- **Électrique** : Les générateurs produisent de l'énergie. Nécessite du carburant ou des panneaux.

### Les Générateurs

| Machine            | Production  | Consommation |
| ------------------ | ----------- | ------------ |
| Panneau Solaire    | Faible      | Aucune       |
| Centrale Thermique | Élevée      | Charbon      |
| Éolienne           | Très élevée | Aucune       |

### L'Équilibre Énergétique

Le système calcule en permanence :

```
Ratio Énergie = Disponible / Nécessaire
```

Si le ratio est inférieur à 1, tes machines tournent au ralenti :

- Ratio 0.5 = 50% de la production normale
- Ratio 0.1 = 10% de la production normale
- Ratio 0 = Arrêt complet

### Comment Gérer

1. **Surveille ta consommation** : Chaque machine a une demande
2. **Ajoute des générateurs** : Avant que ça devienne critique
3. **Priorise** : Les machines les plus rentables d'abord

---

## La Durabilité des Machines

### L'Usure

Chaque cycle de production use la machine :

```
Durabilité = Durabilité - Usure par cycle
```

Quand la durabilité atteint 0, la machine tombe en panne et doit être réparée.

### La Maintenance

Assigne des employés à la maintenance :

- Plus leur stat "Maintenance" est élevée, plus vite ils réparent
- Une machine bien entretenue ne tombe jamais en panne

### Le Remplacement

Si la maintenance coûte plus cher que le remplacement, laisse la machine casser et rachète-en une nouvelle.

---

## Les Flux de Production

### Le Calcul Lazy (Paresseux)

Le système utilise un calcul "lazy" : il ne calcule la production que quand c'est nécessaire (quand tu regardes, quand tu vends, etc.).

### Le Delta Temps

La production est calculée comme :

```
Production = Taux × Temps écoulé depuis dernière mise à jour
```

Si 10 minutes se sont écoulées et que ta machine produit 15 bois/2 minutes, tu auras 75 bois.

### Les Goulots d'Étranglement

Le goulot d'étranglement est le maillon le plus lent de ta chaîne :

- Si ton extraction est plus rapide que ta transformation : Stock qui s'accumule en amont
- Si ta transformation est plus rapide que ton extraction : Machines qui attendent

**L'objectif** : Équilibrer les flux pour qu'aucune machine ne soit jamais à l'arrêt.

---

## L'Optimisation Avancée

### La Règle des Multiples

Calcule les temps de production de chaque étape et ajoute des machines en multiples :

```
Si Extraction = 120s et Transformation = 20s
→ 1 extraction alimente 6 transformateurs
```

### Le Préchargement des Stockages

Garde toujours du stock tampon :

- 2-3 cycles de production minimum
- Permet d'absorber les variations

### L'Expansion Verticale vs Horizontale

- **Verticale** : Améliorer chaque machine (plus efficace)
- **Horizontale** : Ajouter des machines (plus de volume)

Le PDG avisé combine les deux.

---

## Les Erreurs Classiques

### Pas de Connexion à l'Entreprise

Tes produits s'accumulent mais ne génèrent pas d'argent. Vérifie que tout est connecté au nœud jaune !

### Déficit Énergétique Ignoré

Ta production tourne à 10% et tu te demandes pourquoi. **Regarde ton énergie !**

### Trop de Machines, Pas Assez d'Employés

Une machine sans opérateur est une machine morte. Équilibre ton personnel.

### Ignorer la Maintenance

Une machine en panne ne produit rien. La maintenance préventive coûte moins cher que les arrêts.

---

## Les Métriques à Surveiller

| Métrique             | Signification           | Objectif  |
| -------------------- | ----------------------- | --------- |
| Production/heure     | Volume de sortie        | Maximiser |
| Ratio énergétique    | Santé de l'alimentation | > 1.0     |
| Utilisation machines | % du temps productif    | > 90%     |
| Stock tampon         | Jours de réserve        | 2-3 jours |

---

## Conclusion

L'usine est le cœur de ton empire. Comprendre ses flux, ses besoins, ses goulots d'étranglement fera la différence entre le PDG qui prospère et celui qui stagne.

Construis intelligemment. Connecte méthodiquement. Optimise constamment.

> _"L'usine qui tourne sans toi dormir génère des profits pendant que tu dors."_
> — Axiome du PDG efficace

---

## Pour Aller Plus Loin

- [Manuel du Joueur](/wiki/comment-jouer) — Les bases du jeu
- [Guide des Employés](/wiki/guide-employes) — Gérer la main-d'œuvre
- [Guide des Technologies](/wiki/guide-technologies) — Débloquer de nouvelles machines
