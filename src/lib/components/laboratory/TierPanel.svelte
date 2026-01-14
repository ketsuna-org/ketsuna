<script lang="ts">
  import type { Technology } from "$lib/pocketbase";
  import { unlockTechnology } from "$lib/services/tech";
  import { notifications } from "$lib/notifications";
  import { activeCompany } from "$lib/stores";
  import { getItem } from "$lib/data/game-static";
  import pb from "$lib/pocketbase";
  import type { Company } from "$lib/pocketbase";

  type TechWithStatus = Technology & {
    isOwned: boolean;
    isPending?: boolean;
    completedAt?: string | null;
    unlock_time?: number;
    required_items?: Array<{ item_id: string; quantity: number }>;
    item_unlocked?: string[];
  };

  let {
    technologies,
    companyLevel = 1,
    companyId = "",
    availableBalance = 0,
    inventory = [],
    onUnlock = null,
  } = $props<{
    technologies: TechWithStatus[];
    companyLevel?: number;
    companyId?: string;
    availableBalance?: number;
    inventory?: Array<{ item_id: string; quantity: number }>;
    onUnlock?: (() => void) | null;
  }>();

  let isLoading = $state(false);

  // Check all conditions for unlocking
  let conditions = $derived.by(() => {
    const result: Array<{
      label: string;
      met: boolean;
      current?: string;
      required?: string;
    }> = [];

    // Check cost for each tech
    technologies.forEach((tech) => {
      if (!tech.isOwned) {
        result.push({
          label: `${tech.cost.toLocaleString("fr-FR")} € pour "${tech.name}"`,
          met: availableBalance >= tech.cost,
        });
      }
    });

    // Check level for each technology
    const maxLevel = Math.max(
      ...technologies.map((t) => t.required_level || 0)
    );
    if (maxLevel > 0 && maxLevel > companyLevel) {
      result.push({
        label: `Niveau ${maxLevel} requis (actuel: ${companyLevel})`,
        met: companyLevel >= maxLevel,
      });
    }

    // Check required items
    technologies.forEach((tech) => {
      if (tech.required_items?.length && !tech.isOwned) {
        tech.required_items.forEach((req) => {
          const inv = inventory.find((i) => i.item_id === req.item_id);
          const has = inv?.quantity || 0;
          result.push({
            label: `${req.quantity}x ${req.item_id} (possédé: ${has})`,
            met: has >= req.quantity,
          });
        });
      }
    });

    return result;
  });

  // Rewards from technologies - grouped by type using item_unlocked IDs
  let rewards = $derived.by(() => {
    const machines: string[] = [];
    const items: string[] = [];
    const recipes: string[] = [];

    technologies.forEach((tech) => {
      // Use item_unlocked which is an array of item IDs
      if (tech.item_unlocked && tech.item_unlocked.length > 0) {
        tech.item_unlocked.forEach((itemId: string) => {
          const item = getItem(itemId);
          if (!item) return;

          if (item.type === "Machine" || item.type === "Stockage") {
            if (!machines.includes(item.name)) machines.push(item.name);
          } else if (
            item.type === "Composant" ||
            item.type === "Produit Fini"
          ) {
            if (!recipes.includes(item.name)) recipes.push(item.name);
          } else {
            if (!items.includes(item.name)) items.push(item.name);
          }
        });
      }
    });
    return { machines, items, recipes };
  });

  let canUnlock = $derived(
    conditions.every((c) => c.met) &&
      technologies.some((t) => !t.isOwned && !t.isPending)
  );

  let allUnlocked = $derived(technologies.every((t) => t.isOwned));

  let pendingTech = $derived(technologies.find((t) => t.isPending));

  async function handleUnlock() {
    if (!canUnlock || !companyId) return;

    isLoading = true;
    try {
      for (const tech of technologies) {
        if (!tech.isOwned && !tech.isPending) {
          await unlockTechnology(companyId, tech);
        }
      }
      const updated = await pb.collection("companies").getOne(companyId);
      activeCompany.set(updated as unknown as Company);
      notifications.success("Technologies débloquées !");
      onUnlock?.();
    } catch (error: any) {
      notifications.error(`Erreur: ${error.message}`);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="tier-panel">
  <!-- Technologies List -->
  <div class="panel techs-panel">
    <h3 class="panel-title">Recherches de ce palier</h3>
    <div class="tech-list">
      {#each technologies as tech}
        <div
          class="tech-item"
          class:owned={tech.isOwned}
          class:pending={tech.isPending}
        >
          <div class="tech-icon">{tech.icon || "🔬"}</div>
          <div class="tech-info">
            <span class="tech-name">{tech.name}</span>
            <span class="tech-desc">{tech.description}</span>
          </div>
          <div class="tech-status">
            {#if tech.isOwned}
              <span class="status-badge owned">✓ Débloqué</span>
            {:else if tech.isPending}
              <span class="status-badge pending">⏳ En cours</span>
            {:else}
              <span class="status-badge locked">🔒 Verrouillé</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Two Column Layout -->
  <div class="two-columns">
    <!-- Conditions Panel -->
    <div class="panel conditions">
      <h3 class="panel-title">Conditions à remplir</h3>
      <div class="panel-content">
        {#if allUnlocked}
          <div class="all-complete">
            <span class="check-icon">✓</span>
            <span>Toutes les recherches débloquées</span>
          </div>
        {:else if conditions.length === 0}
          <p class="empty-text">Aucune condition requise</p>
        {:else}
          {#each conditions as condition}
            <div class="condition-row">
              <span class="condition-label">{condition.label}</span>
              <div class="condition-checkbox" class:checked={condition.met}>
                {#if condition.met}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Rewards Panel -->
    <div class="panel rewards">
      <h3 class="panel-title">Récompenses de palier</h3>
      <div class="panel-content">
        {#if rewards.machines.length === 0 && rewards.items.length === 0 && rewards.recipes.length === 0}
          <p class="empty-text">Aucune récompense</p>
        {:else}
          {#if rewards.machines.length > 0}
            <div class="reward-category">
              <span class="category-label">🏭 Machines</span>
              <div class="reward-items">
                {#each rewards.machines as machine}
                  <span class="reward-tag machine">{machine}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if rewards.recipes.length > 0}
            <div class="reward-category">
              <span class="category-label">🔧 Composants & Produits</span>
              <div class="reward-items">
                {#each rewards.recipes as recipe}
                  <span class="reward-tag recipe">{recipe}</span>
                {/each}
              </div>
            </div>
          {/if}
          {#if rewards.items.length > 0}
            <div class="reward-category">
              <span class="category-label">📦 Ressources</span>
              <div class="reward-items">
                {#each rewards.items as item}
                  <span class="reward-tag item">{item}</span>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<!-- Action Button -->
<div class="action-section">
  {#if allUnlocked}
    <div class="status-bar complete">
      <span>✓ Palier complété</span>
    </div>
  {:else if pendingTech}
    <div class="status-bar pending">
      <span>⏳ Recherche en cours: {pendingTech.name}</span>
    </div>
  {:else if canUnlock}
    <button
      type="button"
      class="unlock-btn"
      onclick={handleUnlock}
      disabled={isLoading}
    >
      {#if isLoading}
        <span class="spinner"></span>
        Déverrouillage...
      {:else}
        Démarrer la recherche
      {/if}
    </button>
  {:else}
    <div class="status-bar locked">
      <span>Conditions non remplies pour démarrer la recherche</span>
    </div>
  {/if}
</div>

<style>
  .tier-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
  }

  .two-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .panel {
    background: linear-gradient(
      180deg,
      rgba(30, 41, 59, 0.8) 0%,
      rgba(15, 23, 42, 0.9) 100%
    );
    border: 1px solid rgba(100, 116, 139, 0.3);
    border-radius: 1rem;
    padding: 1.25rem;
    backdrop-filter: blur(4px);
  }

  .panel-title {
    font-size: 0.75rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 1rem;
  }

  .panel-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty-text {
    color: #64748b;
    font-size: 0.875rem;
    font-style: italic;
  }

  /* Tech List */
  .techs-panel {
    background: linear-gradient(
      180deg,
      rgba(15, 23, 42, 0.9) 0%,
      rgba(0, 0, 0, 0.8) 100%
    );
  }

  .tech-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tech-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(30, 41, 59, 0.5);
    border: 1px solid rgba(100, 116, 139, 0.2);
    border-radius: 0.75rem;
    transition: all 0.2s;
  }

  @media (max-width: 480px) {
    .tech-item {
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
    }

    .tech-icon {
      margin-bottom: 0.5rem;
    }

    .tech-status {
      align-self: flex-start;
      margin-top: 0.5rem;
    }
  }

  .tech-item:hover {
    background: rgba(51, 65, 85, 0.5);
    border-color: rgba(99, 102, 241, 0.3);
  }

  .tech-item.owned {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.1);
  }

  .tech-item.pending {
    border-color: rgba(234, 179, 8, 0.3);
    background: rgba(234, 179, 8, 0.1);
  }

  .tech-icon {
    font-size: 1.5rem;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 0.5rem;
  }

  .tech-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .tech-name {
    font-weight: 600;
    color: #f1f5f9;
    font-size: 0.9375rem;
  }

  .tech-desc {
    font-size: 0.75rem;
    color: #64748b;
    line-height: 1.4;
  }

  .tech-status {
    flex-shrink: 0;
  }

  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .status-badge.owned {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .status-badge.pending {
    background: rgba(234, 179, 8, 0.2);
    color: #facc15;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }

  .status-badge.locked {
    background: rgba(100, 116, 139, 0.2);
    color: #94a3b8;
    border: 1px solid rgba(100, 116, 139, 0.3);
  }

  /* Conditions */
  .condition-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .condition-label {
    color: #cbd5e1;
    font-size: 0.8125rem;
  }

  .condition-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid #475569;
    border-radius: 4px;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .condition-checkbox.checked {
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .all-complete {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #4ade80;
    font-weight: 500;
  }

  .check-icon {
    font-size: 1.25rem;
  }

  /* Rewards */
  .reward-category {
    margin-bottom: 0.75rem;
  }

  .category-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.5rem;
  }

  .reward-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .reward-tag {
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
  }

  .reward-tag.machine {
    background: rgba(99, 102, 241, 0.2);
    color: #a5b4fc;
    border: 1px solid rgba(99, 102, 241, 0.3);
  }

  .reward-tag.recipe {
    background: rgba(168, 85, 247, 0.2);
    color: #c4b5fd;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }

  .reward-tag.item {
    background: rgba(245, 158, 11, 0.2);
    color: #fcd34d;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  /* Action */
  .action-section {
    padding: 0 1.5rem 1.5rem;
  }

  .status-bar {
    width: 100%;
    padding: 1rem 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: 0.75rem;
  }

  .status-bar.locked {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
  }

  .status-bar.complete {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #4ade80;
  }

  .status-bar.pending {
    background: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    color: #facc15;
  }

  .unlock-btn {
    width: 100%;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none;
    border-radius: 0.75rem;
    color: white;
    font-size: 0.9375rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
  }

  .unlock-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }

  .unlock-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 768px) {
    .two-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
