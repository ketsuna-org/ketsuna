<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { onDestroy } from "svelte";
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
  let timeLeft = $state("");
  let timerInterval: any;

  $effect(() => {
    if (pendingResearch?.completedAt) {
      startTimer();
    } else {
      stopTimer();
      timeLeft = "";
    }
  });

  function startTimer() {
    stopTimer();
    updateTime();
    timerInterval = setInterval(updateTime, 1000);
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function updateTime() {
    if (!pendingResearch?.completedAt) return;

    const end = new Date(pendingResearch.completedAt).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) {
      timeLeft = "Finalisation...";
      stopTimer();
      // Optionally trigger reload if it hangs too long
      if (diff < -5000 && !loading) loadData();
      return;
    }

    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timeLeft = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  onDestroy(() => {
    stopTimer();
  });

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
      <div class="panel research-status-panel">
        <div class="panel-glow"></div>
        <div class="panel-inner">
          <div class="panel-header">
            <div class="status-indicator" class:active={pendingResearch}>
              <span class="pulse-ring"></span>
              <span class="pulse-dot"></span>
            </div>
            <h3 class="panel-title">
              {#if pendingResearch}
                RECHERCHE EN COURS
              {:else}
                AUCUNE RECHERCHE
              {/if}
            </h3>
          </div>

          {#if pendingResearch}
            <div class="research-active">
              <div class="research-icon">🔬</div>
              <div class="research-details">
                <span class="research-name">{pendingResearch.name}</span>
                <div class="research-progress">
                  <div class="progress-bar">
                    <div class="progress-fill animate-pulse"></div>
                  </div>
                  <span class="progress-label">
                    {#if timeLeft}
                      Temps restant : {timeLeft}
                    {:else}
                      Traitement en cours...
                    {/if}
                  </span>
                </div>
              </div>
              <span class="research-badge">EN COURS</span>
            </div>
          {:else}
            <div class="research-idle">
              <div class="idle-icon">⏳</div>
              <p class="idle-text">
                Sélectionnez une technologie pour lancer une recherche
              </p>
            </div>
          {/if}
        </div>
      </div>

      <!-- Help Section -->
      <div class="panel help-panel">
        <div class="panel-glow help-glow"></div>
        <div class="panel-inner">
          <div class="panel-header">
            <div class="help-icon">💡</div>
            <h3 class="panel-title">CENTRE D'AIDE</h3>
          </div>
          <p class="help-text">
            La recherche et développement vise à élever le niveau de ton
            entreprise dans chaque domaine, débloquant ainsi de nouveaux outils
            pour optimiser ta production.
          </p>
          <div class="help-features">
            <div class="feature">
              <span class="feature-icon">🔓</span>
              <span>Débloque machines & recettes</span>
            </div>
            <div class="feature">
              <span class="feature-icon">📈</span>
              <span>Augmente ta compétitivité</span>
            </div>
            <div class="feature">
              <span class="feature-icon">⚡</span>
              <span>Accède aux technologies avancées</span>
            </div>
          </div>
        </div>
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

  /* Bottom Section - Premium Layout */
  .bottom-section {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1.5rem;
    padding: 2rem;
    max-width: 1000px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .bottom-section {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
  }

  /* Panel Base - Glassmorphism */
  .panel {
    position: relative;
    border-radius: 1.5rem;
    overflow: hidden;
    background: linear-gradient(
      180deg,
      rgba(30, 41, 59, 0.6) 0%,
      rgba(15, 23, 42, 0.8) 100%
    );
    border: 1px solid rgba(100, 116, 139, 0.2);
    backdrop-filter: blur(10px);
  }

  .panel-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at top,
      rgba(99, 102, 241, 0.12) 0%,
      transparent 70%
    );
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .panel:hover .panel-glow {
    opacity: 1;
  }

  .panel-inner {
    position: relative;
    padding: 1.5rem;
    z-index: 1;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .panel-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #e2e8f0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }

  /* Status Indicator */
  .status-indicator {
    position: relative;
    width: 12px;
    height: 12px;
  }

  .pulse-dot {
    position: absolute;
    inset: 2px;
    background: #64748b;
    border-radius: 50%;
    transition: background 0.3s ease;
  }

  .pulse-ring {
    position: absolute;
    inset: 0;
    border: 2px solid #64748b;
    border-radius: 50%;
    opacity: 0;
  }

  .status-indicator.active .pulse-dot {
    background: #10b981;
  }

  .status-indicator.active .pulse-ring {
    border-color: #10b981;
    animation: pulse-expand 1.5s ease-out infinite;
  }

  @keyframes pulse-expand {
    0% {
      transform: scale(1);
      opacity: 0.8;
    }
    100% {
      transform: scale(2.5);
      opacity: 0;
    }
  }

  /* Research Status Panel */
  .research-status-panel {
    border-color: rgba(99, 102, 241, 0.25);
  }

  .research-status-panel:hover {
    border-color: rgba(99, 102, 241, 0.45);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.15);
  }

  /* Research Active State */
  .research-active {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.08) 0%,
      rgba(99, 102, 241, 0.08) 100%
    );
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 0.75rem;
  }

  .research-icon {
    font-size: 2rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .research-details {
    flex: 1;
    min-width: 0;
  }

  .research-name {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .research-progress {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .research-progress .progress-bar {
    height: 4px;
    background: rgba(51, 65, 85, 0.6);
    border-radius: 2px;
    overflow: hidden;
  }

  .research-progress .progress-fill {
    width: 70%;
    height: 100%;
    background: linear-gradient(90deg, #10b981 0%, #6366f1 100%);
    border-radius: 2px;
  }

  .progress-label {
    font-size: 0.6875rem;
    color: #64748b;
    font-family: ui-monospace, monospace;
  }

  .research-badge {
    padding: 0.375rem 0.75rem;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: #fff;
    font-size: 0.6875rem;
    font-weight: 700;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  /* Research Idle State */
  .research-idle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    text-align: center;
  }

  .idle-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    opacity: 0.6;
  }

  .idle-text {
    color: #64748b;
    font-size: 0.875rem;
    line-height: 1.5;
    max-width: 200px;
    margin: 0;
  }

  /* Help Panel */
  .help-panel {
    border-color: rgba(139, 92, 246, 0.2);
  }

  .help-panel:hover {
    border-color: rgba(139, 92, 246, 0.4);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.12);
  }

  .help-glow {
    background: radial-gradient(
      ellipse at top,
      rgba(139, 92, 246, 0.12) 0%,
      transparent 70%
    );
  }

  .help-icon {
    font-size: 1.25rem;
  }

  .help-text {
    color: #94a3b8;
    font-size: 0.875rem;
    line-height: 1.7;
    margin: 0 0 1.25rem 0;
  }

  .help-features {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .feature {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    background: rgba(51, 65, 85, 0.25);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: #cbd5e1;
    transition: all 0.2s ease;
  }

  .feature:hover {
    background: rgba(99, 102, 241, 0.12);
    transform: translateX(4px);
  }

  .feature-icon {
    font-size: 1rem;
  }

  /* Animate pulse for progress bar */
  @keyframes animate-width {
    0%,
    100% {
      width: 60%;
    }
    50% {
      width: 85%;
    }
  }

  .animate-pulse {
    animation: animate-width 2s ease-in-out infinite;
  }
</style>
