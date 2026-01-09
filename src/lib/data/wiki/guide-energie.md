---
title: Guide de l'Énergie
category: guides
excerpt: Alimenter ton empire industriel sans interruption.
---

# Guide de l'Énergie : Le Sang des Machines

> _"Une usine sans énergie est un cadavre. L'énergie est le souffle de vie de l'industrie."_
> — Ingénieur en Chef, Central Thermique Omni-7

---

## Introduction : Le Pouvoir Invisible

Tu peux avoir les meilleures machines, les employés les plus efficaces, les gisements les plus riches. Sans **énergie**, tout ça ne vaut rien.

L'énergie est le multiplicateur silencieux — quand elle est là, tu l'oublies. Quand elle manque, tout s'arrête.

---

## Les Types d'Énergie

### Énergie Manuelle

La forme la plus basique :

- **Source** : Les employés (ou toi-même)
- **Coût direct** : Aucun
- **Coût indirect** : Salaires
- **Capacité** : Limitée par le nombre de bras

Idéal pour démarrer, insuffisant pour l'échelle industrielle.

### Énergie Thermique

La puissance du feu :

- **Source** : Centrale Thermique
- **Carburant** : Charbon
- **Production** : Élevée
- **Pollution** : Conceptuelle (pas implémentée)

Le choix classique pour l'industrie lourde.

### Énergie Solaire

La lumière des étoiles :

- **Source** : Panneaux Solaires
- **Carburant** : Aucun
- **Production** : Faible
- **Avantage** : Gratuit une fois installé

Bon complément, rarement suffisant seul.

### Énergie Éolienne

La force du vent :

- **Source** : Éoliennes
- **Carburant** : Aucun
- **Production** : Très élevée (4 MW)
- **Coût** : Très élevé

L'option premium pour les grands empires.

---

## L'Équilibre Énergétique

### Le Calcul Fondamental

À chaque instant, le système compare :

```
Énergie Disponible = Σ (Production de chaque générateur)
Énergie Nécessaire = Σ (Consommation de chaque machine active)
```

### Le Ratio

```
Ratio = Disponible / Nécessaire
```

| Ratio | Effet              |
| ----- | ------------------ |
| ≥ 1.0 | Production normale |
| 0.5   | Production à 50%   |
| 0.1   | Production à 10%   |
| 0     | Arrêt total        |

### L'Alerte Critique

Quand le ratio tombe sous 0.8, ton système te prévient. À 0.5, c'est l'urgence.

---

## Les Générateurs

### Centrale Thermique

```
Production : Élevée
Consommation : ~10 charbon/cycle
Employés : 4 max
Tech requise : Énergie Thermique (Niveau 5)
Prix : 20 000₭
```

**Le choix de l'industriel**. Puissant, fiable, consomme du charbon.

### Panneau Solaire

```
Production : Faible
Consommation : Aucune
Employés : 0
Tech requise : Automatisation de Base
Prix : 2 500₭
```

**Le choix du débutant**. Simple, gratuit à opérer, mais limité.

### Éolienne

```
Production : 4 MW
Consommation : Aucune
Employés : 0
Tech requise : Énergie Verte (Niveau 20)
Prix : 250 000₭
```

**Le choix du titan**. Investissement massif, rendement maximal.

---

## La Consommation

### Machines Manuelles

Les machines à énergie "Manuelle" sont alimentées par le travail humain :

```
Consommation = 0 (énergie externe)
Coût réel = Salaires des opérateurs
```

### Machines Électriques

Certaines machines (haut niveau) nécessitent de l'électricité :

```
need_energy : valeur en MW
```

L'Usine High-Tech, par exemple, consomme 200 MW.

---

## La Planification Énergétique

### Étape 1 : Inventaire

Liste toutes tes machines et leur consommation :

```
Machine A : 50 MW
Machine B : 50 MW
Machine C : 100 MW
---
Total : 200 MW
```

### Étape 2 : Production

Liste tous tes générateurs et leur production :

```
Centrale 1 : 150 MW
Panneau 1 : 10 MW
Panneau 2 : 10 MW
---
Total : 170 MW
```

### Étape 3 : Analyse

```
Ratio = 170 / 200 = 0.85
```

Tu es en déficit ! Tes machines tournent à 85%.

### Étape 4 : Action

Ajoute des générateurs jusqu'à :

```
Cible = Consommation × 1.2 (marge de sécurité)
= 200 × 1.2 = 240 MW
```

---

## L'Optimisation Énergétique

### Priorisation

Si tu es en déficit, certaines machines sont plus critiques :

1. Identifie les machines les plus rentables
2. Alloue l'énergie disponible en priorité à elles
3. Les moins critiques tournent au ralenti

_Note : Le jeu gère automatiquement la distribution, mais connaître cette logique aide à planifier._

### Efficacité des Sources

Compare le coût par MW :

| Source    | Coût Installation | Production | Coût Opérationnel | Coût/MW (long terme)             |
| --------- | ----------------- | ---------- | ----------------- | -------------------------------- |
| Thermique | 20 000₭           | 100 MW     | Charbon           | Moyen                            |
| Solaire   | 2 500₭            | 10 MW      | 0                 | Faible                           |
| Éolienne  | 250 000₭          | 4 MW       | 0                 | Faible (mais coût initial élevé) |

### Le Mix Optimal

Le PDG avisé combine les sources :

- **Base** : Thermiques pour le gros de la production
- **Complément** : Solaires pour le gratuit
- **Premium** : Éoliennes quand le budget le permet

---

## Les Crises Énergétiques

### Causes

- Installation de nouvelles machines sans nouveaux générateurs
- Panne d'un générateur
- Rupture de stock de charbon
- Croissance mal planifiée

### Symptômes

- Production en chute
- Alertes système
- Revenus qui baissent

### Réponse d'Urgence

1. **Réduire la consommation** : Arrête les machines non-essentielles
2. **Augmenter la production** : Ajoute des générateurs d'urgence
3. **Approvisionner** : Achète du charbon si c'est le problème
4. **Planifier** : Pour que ça n'arrive plus

---

## La Transition Énergétique

### Du Manuel au Thermique

Quand tes employés ne suffisent plus, passe aux centrales :

1. Recherche "Énergie Thermique"
2. Construis une Centrale
3. Assure l'approvisionnement en charbon
4. Libère des employés pour d'autres tâches

### Du Thermique au Vert

Quand ta production de charbon est un goulot :

1. Recherche "Énergie Verte"
2. Investis dans les éoliennes
3. Réduis progressivement ta dépendance au charbon
4. Réalloue la production de charbon à la vente

---

## Métriques à Surveiller

| Métrique          | Description      | Seuil d'Alerte      |
| ----------------- | ---------------- | ------------------- |
| Ratio énergétique | Dispo/Nécessaire | < 1.0               |
| Stock charbon     | Jours de réserve | < 3 jours           |
| Coût énergétique  | ₭/période        | Croissance anormale |
| Marge de sécurité | Surplus %        | < 20%               |

---

## Conclusion

L'énergie est invisible quand elle fonctionne, catastrophique quand elle manque. Le PDG qui maîtrise son mix énergétique a un empire stable. Celui qui l'ignore verra tout s'effondrer au pire moment.

Planifie. Surveille. Anticipe.

> _"L'énergie ne pardonne pas l'improvisation."_
> — Enseignement des Ingénieurs Omni

---

## Pour Aller Plus Loin

- [Manuel du Joueur](/wiki/comment-jouer) — Les bases du jeu
- [Guide de l'Usine](/wiki/guide-usine) — La production industrielle
- [Guide des Technologies](/wiki/guide-technologies) — Débloquer les générateurs
