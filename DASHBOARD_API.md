# Dashboard API - Documentation

## 📋 Vue d'ensemble

La fonction `fetchDashboardData()` agrège toutes les données vitales d'une entreprise de joueur en **minimisant le nombre de requêtes API** grâce à l'utilisation stratégique de `expand` et `Promise.all`.

## 🚀 Utilisation

```typescript
import { fetchDashboardData } from "$lib/dashboard";

// Dans un composant Svelte
let dashboardData = await fetchDashboardData(userId);
```

## 📊 Structure de retour

```typescript
interface DashboardData {
    company: {
        name: string;           // Nom de l'entreprise
        level: number;          // Niveau de l'entreprise
        prestige: number;       // Points de prestige du joueur
        ceo: string;            // Username du PDG
    };
    financials: {
        cash: number;           // Trésorerie actuelle
        valuation: number;      // Valorisation (prix action × total actions)
        daily_payroll: number;  // Coût total des salaires
        stock_ticker: string;   // Symbole boursier (ex: "KTS")
        stock_price: number;    // Prix actuel de l'action
    };
    resources: {
        inventory_count: number;        // Nombre total d'items
        top_items: Array<{              // Top 5 items par quantité
            name: string;               // Nom de l'item
            qty: number;                // Quantité totale
            value: number;              // Valeur totale (qté × prix)
        }>;
    };
    staff: {
        total_employees: number;        // Nombre total d'employés
        average_efficiency: number;     // Efficacité moyenne (%)
    };
}
```

## ⚡ Optimisations implémentées

### 1. Expand stratégique
```typescript
// Au lieu de 2 requêtes séparées:
const user = await pb.collection("users").getOne(userId);
const company = await pb.collection("companies").getOne(user.active_company);

// On fait 1 seule requête avec expand:
const user = await pb.collection("users").getOne(userId, {
    expand: "active_company"
});
```

### 2. Promise.all pour parallélisation
```typescript
// Les 3 requêtes s'exécutent en parallèle au lieu de séquentiellement
const [stockData, employeesData, inventoryData] = await Promise.all([
    pb.collection("stocks").getFirstListItem(`company="${companyId}"`),
    pb.collection("employees").getFullList({ filter: `company="${companyId}"` }),
    pb.collection("inventory").getFullList({ 
        filter: `company="${companyId}"`,
        expand: "item" 
    }),
]);
```

### 3. Expand imbriqué pour l'inventaire
```typescript
// Au lieu de boucler et faire N requêtes pour les items:
for (const inv of inventory) {
    const item = await pb.collection("items").getOne(inv.item); // ❌ N requêtes
}

// On expand directement lors de la récupération:
pb.collection("inventory").getFullList({
    expand: "item"  // ✅ 1 seule requête
});
```

## 📈 Performance

| Approche | Nombre de requêtes | Temps estimé (200ms/req) |
|----------|-------------------|--------------------------|
| **Naïve** | ~10-15 requêtes | ~2-3 secondes |
| **Optimisée** | **3 requêtes** | **~600ms** |

**Gain: 70-80% de réduction du temps de chargement** 🚀

## 🛡️ Gestion d'erreurs

### Cas d'absence de données
```typescript
// Stocks pas encore créés
const stockData = await pb.collection("stocks")
    .getFirstListItem(`company="${companyId}"`)
    .catch(() => null);  // Retourne null au lieu de throw

// Plus tard dans le code:
const stockPrice = stockData?.current_price || 0;
```

### Pas d'entreprise active
```typescript
if (!user.active_company || !user.expand?.active_company) {
    throw new Error("L'utilisateur n'a pas d'entreprise active");
}
```

## 💡 Fonction bonus: fetchFinancialsOnly()

Pour les mises à jour fréquentes (ex: ticker en temps réel), utilisez la version allégée:

```typescript
import { fetchFinancialsOnly } from "$lib/dashboard";

// Récupère uniquement les données financières
const financials = await fetchFinancialsOnly(companyId);
```

## 🔧 Schéma PocketBase attendu

### Collections

**users**
- `active_company` (Relation → companies)
- `username` (Text)
- `prestige` (Number)

**companies**
- `name` (Text)
- `balance` (Number)
- `level` (Number)

**stocks**
- `company` (Relation → companies)
- `ticker` (Text)
- `current_price` (Number)
- `total_shares` (Number)

**employees**
- `company` (Relation → companies)
- `salary` (Number)
- `efficiency` (Number, optionnel, défaut: 100)

**inventory**
- `company` (Relation → companies)
- `item` (Relation → items)
- `quantity` (Number)

**items**
- `name` (Text)
- `base_price` (Number)

## 📝 Exemple d'intégration complète

```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
    import pb from "$lib/pocketbase";

    let data: DashboardData | null = null;
    let loading = true;
    let error = "";

    onMount(async () => {
        const userId = pb.authStore.model?.id;
        if (!userId) return;

        try {
            data = await fetchDashboardData(userId);
        } catch (err: any) {
            error = err.message;
        } finally {
            loading = false;
        }
    });
</script>

{#if loading}
    <p>Chargement...</p>
{:else if error}
    <p class="error">{error}</p>
{:else if data}
    <h1>{data.company.name}</h1>
    <p>Cash: ${data.financials.cash}</p>
    <p>Employés: {data.staff.total_employees}</p>
{/if}
```

## 🎯 Tips & Best Practices

1. **Utilisez `requestKey: null`** pour éviter la déduplication automatique de PocketBase lors des requêtes parallèles
2. **Agrégez côté client** quand possible (sommes, moyennes) pour éviter des requêtes supplémentaires
3. **Mettez en cache** les données si elles changent rarement (ex: avec un store Svelte)
4. **Considérez le polling** avec `fetchFinancialsOnly()` pour des mises à jour en temps réel sans surcharger

---

**Auteur:** Senior Frontend Developer  
**Stack:** SvelteKit + PocketBase  
**Version:** 1.0.0
