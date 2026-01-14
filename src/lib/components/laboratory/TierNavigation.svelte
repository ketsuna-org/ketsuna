<script lang="ts">
  type TierData = {
    level: number;
    isUnlocked: boolean;
    isComplete: boolean;
    isCurrent: boolean;
  };

  let { tiers, currentTier, onTierSelect } = $props<{
    tiers: TierData[];
    currentTier: number;
    onTierSelect?: (tier: number) => void;
  }>();

  function handlePrev() {
    if (currentTier > 0) {
      onTierSelect?.(currentTier - 1);
    }
  }

  function handleNext() {
    if (currentTier < tiers.length - 1) {
      onTierSelect?.(currentTier + 1);
    }
  }
</script>

<div class="tier-navigation">
  <!-- Prev button -->
  <button
    type="button"
    class="nav-btn"
    onclick={handlePrev}
    disabled={currentTier === 0}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  </button>

  <!-- Tier timeline -->
  <div class="timeline">
    {#each tiers as tier, i}
      <div class="tier-group">
        <!-- Node -->
        <button
          type="button"
          class="tier-node"
          class:unlocked={tier.isUnlocked}
          class:complete={tier.isComplete}
          class:current={tier.isCurrent}
          onclick={() => onTierSelect?.(tier.level)}
        >
          <span class="tier-label">{tier.level}</span>
        </button>

        <!-- Connector line -->
        {#if i < tiers.length - 1}
          <div class="connector">
            <div
              class="connector-fill"
              class:filled={tiers[i + 1]?.isUnlocked ||
                tiers[i + 1]?.isComplete}
            ></div>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Next button -->
  <button
    type="button"
    class="nav-btn"
    onclick={handleNext}
    disabled={currentTier === tiers.length - 1}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  </button>
</div>

<style>
  .tier-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 0;
    background: #0f0f1a;
    border-bottom: 2px solid #2d2d44;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #6666aa;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-btn:hover:not(:disabled) {
    color: #00ff88;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .timeline {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    overflow-x: auto;
    padding: 0.5rem;
    scrollbar-width: none; /* Firefox */
  }

  .timeline::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
  }

  .tier-group {
    display: flex;
    align-items: center;
  }

  .tier-node {
    width: 36px;
    height: 36px;
    background: #1a1a2e;
    border: 3px solid #3d3d5c;
    transform: rotate(45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    z-index: 2;
  }

  .tier-node:hover {
    border-color: #6666aa;
  }

  .tier-node.current {
    border-color: #00ff88;
    background: #0a2a1a;
  }

  .tier-node.complete {
    border-color: #00ff88;
    background: #00ff88;
  }

  .tier-node.unlocked:not(.complete) {
    border-color: #4d4d6c;
  }

  .tier-label {
    transform: rotate(-45deg);
    font-size: 0.875rem;
    font-weight: 700;
    color: #8888aa;
    font-family: monospace;
  }

  .tier-node.current .tier-label {
    color: #00ff88;
  }

  .tier-node.complete .tier-label {
    color: #0a2a1a;
  }

  .connector {
    width: 60px;
    height: 4px;
    background: #2d2d44;
    position: relative;
    z-index: 1;
  }

  .connector-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 0;
    background: #00ff88;
    transition: width 0.3s ease;
  }

  .connector-fill.filled {
    width: 100%;
  }
</style>
