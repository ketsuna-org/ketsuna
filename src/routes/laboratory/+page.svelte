<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { fetchTechTree } from "$lib/services/tech";
  import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
  import { activeCompany } from "$lib/stores";
  import pb from "$lib/pocketbase";
  import type { Technology } from "$lib/pocketbase";
  import { notifications } from "$lib/notifications";

  import CategoryCard from "$lib/components/laboratory/CategoryCard.svelte";
  import TierNavigation from "$lib/components/laboratory/TierNavigation.svelte";
  import TierPanel from "$lib/components/laboratory/TierPanel.svelte";

  type TechWithStatus = Technology & {
    isOwned: boolean;
    isPending?: boolean;
    completedAt?: string | null;
    unlock_time?: number;
    required_items?: Array<{ item_id: string; quantity: number }>;
  };

  let technologies: Array<TechWithStatus> = $state([]);
  let inventory: Array<{ item_id: string; quantity: number }> = $state([]);
  let dashboardData: DashboardData | null = $state(null);
  let loading = $state(true);
  let error = $state("");

  // Category definitions with icons
  const categoryDefs: Record<string, { name: string; icon: string }> = {
    general: { name: "GÉNÉRAL", icon: "⚙️" },
    resource: { name: "RESSOURCE", icon: "⛏️" },
    industry: { name: "INDUSTRIE", icon: "🏭" },
    tech: { name: "TECHNOLOGIE", icon: "💻" },
  };

  // Current view state from URL
  let currentCategory = $derived($page.url.searchParams.get("category"));
  let currentTier = $derived(
    parseInt($page.url.searchParams.get("tier") || "1")
  );

  // Categories with counts
  let categories = $derived.by(() => {
    const cats = Object.entries(categoryDefs).map(([id, def]) => {
      const techsInCat = technologies.filter((t) => t.category === id);
      return {
        id,
        name: def.name,
        icon: def.icon,
        total: techsInCat.length,
        unlocked: techsInCat.filter((t) => t.isOwned).length,
      };
    });
    return cats.filter((c) => c.total > 0);
  });

  // Technologies for current category
  let categoryTechs = $derived(
    technologies.filter((t) => t.category === currentCategory)
  );

  // Tiers for current category
  let tiers = $derived.by(() => {
    if (!currentCategory) return [];
    const levels = [
      ...new Set(categoryTechs.map((t) => t.required_level || 1)),
    ].sort((a, b) => a - b);
    return levels.map((level) => {
      const techsAtLevel = categoryTechs.filter(
        (t) => (t.required_level || 1) === level
      );
      const allOwned = techsAtLevel.every((t) => t.isOwned);
      const someOwned = techsAtLevel.some((t) => t.isOwned);
      return {
        level,
        isUnlocked: someOwned || (dashboardData?.company.level || 1) >= level,
        isComplete: allOwned,
        isCurrent: level === currentTier,
      };
    });
  });

  // Technologies for current tier
  let tierTechs = $derived(
    categoryTechs.filter((t) => (t.required_level || 1) === currentTier)
  );

  // Current category data
  let currentCategoryData = $derived(
    categories.find((c) => c.id === currentCategory)
  );

  // Research in progress
  let pendingResearch = $derived(technologies.find((t) => t.isPending));

  $effect(() => {
    if ($activeCompany) {
      loadData();
    }
  });

  async function loadData() {
    loading = true;
    error = "";
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) throw new Error("Non connecté");
      if (!$activeCompany?.id) throw new Error("Pas d'entreprise active");

      const [techData, dashData, invRecords, machineRecords] =
        await Promise.all([
          fetchTechTree($activeCompany.id),
          fetchDashboardData(userId),
          pb.collection("inventory").getFullList({
            filter: `company = "${$activeCompany.id}"`,
          }),
          pb.collection("machines").getFullList({
            filter: `company = "${$activeCompany.id}"`,
          }),
        ]);

      technologies = techData;
      dashboardData = dashData;

      const invItems = invRecords.map((r: any) => ({
        item_id: r.item_id,
        quantity: r.quantity,
      }));

      const machineCountMap = new Map<string, number>();
      machineRecords.forEach((m: any) => {
        const machineId = m.machine_id;
        machineCountMap.set(
          machineId,
          (machineCountMap.get(machineId) || 0) + 1
        );
      });

      machineCountMap.forEach((count, machineId) => {
        invItems.push({ item_id: machineId, quantity: count });
      });

      inventory = invItems;
    } catch (err: any) {
      error = err.message;
      notifications.error(error);
    } finally {
      loading = false;
    }
  }

  function handleCategoryClick(categoryId: string) {
    const firstTier =
      technologies
        .filter((t) => t.category === categoryId)
        .map((t) => t.required_level || 1)
        .sort((a, b) => a - b)[0] || 1;
    goto(`/laboratory?category=${categoryId}&tier=${firstTier}`);
  }

  function handleTierSelect(tier: number) {
    goto(`/laboratory?category=${currentCategory}&tier=${tier}`);
  }

  function handleBack() {
    goto("/laboratory");
  }

  function handleTechUnlock() {
    loadData();
  }
</script>

<svelte:head>
  <title>Laboratoire | Ketsuna: Iron Symphony</title>
</svelte:head>

<div class="laboratory-page">
  <!-- Header -->
  <header class="page-header">
    {#if currentCategory}
      <button type="button" class="back-btn" onclick={handleBack}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
    {/if}
    <h1 class="breadcrumb">
      <span class="company-name">{$activeCompany?.name || "ENTREPRISE"}</span>
      <span class="separator">›</span>
      {#if currentCategory && currentCategoryData}
        <span>RECHERCHE {currentCategoryData.name}</span>
      {:else}
        <span>RECHERCHE & DÉVELOPPEMENT</span>
      {/if}
    </h1>
  </header>

  {#if error}
    <div transition:fade={{ duration: 200 }} class="error-banner">
      <span>❌</span>
      <p>{error}</p>
    </div>
  {/if}

  {#if loading}
    <div class="loading-container">
      <div class="spinner-ring"></div>
      <p>Chargement des données...</p>
    </div>
  {:else if !currentCategory}
    <!-- Overview Mode: Category Cards -->
    <div class="categories-grid">
      {#each categories as category (category.id)}
        <CategoryCard
          {category}
          onclick={() => handleCategoryClick(category.id)}
        />
      {/each}
    </div>

    <!-- Bottom Section -->
    <div class="bottom-section">
      <!-- Research Status -->
      <div class="panel research-status">
        <h3 class="panel-subtitle">AUCUNE RECHERCHE EN COURS</h3>
        {#if pendingResearch}
          <div class="research-info">
            <span class="research-name">{pendingResearch.name}</span>
            <span class="research-badge">En cours</span>
          </div>
        {:else}
          <div class="waiting-badge">En attente</div>
        {/if}
      </div>

      <!-- Help Section -->
      <div class="panel help-section">
        <h3 class="panel-subtitle">BESOIN D'AIDE ?</h3>
        <p class="help-text">
          La recherche et développement vise à élever le niveau de ton
          entreprise dans chaque domaine, débloquant ainsi de nouveaux outils
          pour optimiser ta production. En investissant dans la recherche, tu
          renforces la compétitivité de ton entreprise et ouvre la voie à des
          technologies avancées...
        </p>
      </div>
    </div>
  {:else}
    <!-- Category Detail Mode -->
    <TierNavigation {tiers} {currentTier} onTierSelect={handleTierSelect} />

    <TierPanel
      technologies={tierTechs}
      companyLevel={dashboardData?.company.level || 1}
      companyId={$activeCompany?.id || ""}
      availableBalance={dashboardData?.financials.cash || 0}
      {inventory}
      onUnlock={handleTechUnlock}
    />
  {/if}
</div>

<style>
  :global(body) {
    background-color: #0a0a14;
  }

  .laboratory-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #0f0f1a 0%, #0a0a14 100%);
    color: #e0e0f0;
    font-family: "Segoe UI", system-ui, sans-serif;
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: #0f0f1a;
    border-bottom: 2px solid #2d2d44;
  }

  .back-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 2px solid #3d3d5c;
    color: #8888aa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .back-btn:hover {
    border-color: #00ff88;
    color: #00ff88;
  }

  .breadcrumb {
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-family: "Courier New", monospace;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .company-name {
    color: #6666aa;
  }

  .separator {
    color: #3d3d5c;
  }

  /* Error */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    background: rgba(255, 68, 136, 0.1);
    border-bottom: 2px solid #ff4488;
    color: #ff4488;
  }

  /* Loading */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem;
    gap: 1rem;
  }

  .spinner-ring {
    width: 48px;
    height: 48px;
    border: 3px solid #2d2d44;
    border-top-color: #00ff88;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-container p {
    color: #6666aa;
    font-family: monospace;
  }

  /* Categories Grid */
  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .categories-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  /* Bottom Section */
  .bottom-section {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .bottom-section {
      grid-template-columns: 1fr;
    }
  }

  .panel {
    background: #0a0a14;
    border: 2px solid #2d2d44;
    padding: 1.25rem;
  }

  .panel-subtitle {
    font-size: 0.75rem;
    font-weight: 800;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
    font-family: "Courier New", monospace;
  }

  .research-status {
    display: flex;
    flex-direction: column;
  }

  .waiting-badge {
    margin-top: auto;
    padding: 0.75rem 1.5rem;
    background: #1a1a2e;
    border: 2px solid #3d3d5c;
    text-align: center;
    color: #6666aa;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .research-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
    padding: 0.75rem 1rem;
    background: #1a1a2e;
    border: 2px solid #00ff88;
  }

  .research-name {
    color: #00ff88;
    font-weight: 600;
  }

  .research-badge {
    background: #00ff88;
    color: #0a0a14;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .help-text {
    color: #8888aa;
    font-size: 0.875rem;
    line-height: 1.6;
  }
</style>
