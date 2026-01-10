<script lang="ts">
  import { Handle, Position, type Node, type NodeProps } from "@xyflow/svelte";
  import { activeCompany, refreshActiveCompany } from "$lib/stores";
  import { levelUpCompany } from "$lib/services/company";

  type CompanyNode = Node<
    {
      name: string;
      icon: string;
      placed: boolean;
      // Extended data from loadFactory
      balance?: number;
      level?: number;
    },
    "company"
  >;

  let { data, id }: NodeProps<CompanyNode> = $props();

  // Check if this is the user's own company (for upgrade button)
  let isOwnCompany = $derived($activeCompany?.id === id);
  let company = $derived(isOwnCompany ? $activeCompany : null);

  let isUpgrading = $state(false);
  let displayLevel = $derived(data.level || company?.level || 1);
  let displayBalance = $derived(data.balance ?? company?.balance ?? 0);
  let displayName = $derived(data.name || company?.name || "SIÈGE SOCIAL");

  let upgradeCost = $derived(Math.floor(1000 * Math.pow(displayLevel, 1.5)));
  let canUpgrade = $derived(isOwnCompany && displayBalance >= upgradeCost);

  async function handleUpgrade(event: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }

    if (!company || isUpgrading || !canUpgrade) return;

    isUpgrading = true;
    try {
      await levelUpCompany(company, upgradeCost);
      await refreshActiveCompany();
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'amélioration");
    } finally {
      isUpgrading = false;
    }
  }
</script>

<div class="company-node">
  <Handle type="target" position={Position.Left} class="handle" />

  <!-- Building structure with isometric depth -->
  <div class="building-container">
    <!-- Foundation/Base -->
    <div class="foundation"></div>

    <!-- Main building body -->
    <div class="building-body">
      <!-- Left face (darker) -->
      <div class="face-left"></div>

      <!-- Right face (darkest) -->
      <div class="face-right"></div>

      <!-- Front face (main content) -->
      <div class="face-front">
        <!-- Riveted border -->
        <div class="rivet top-left"></div>
        <div class="rivet top-right"></div>
        <div class="rivet bottom-left"></div>
        <div class="rivet bottom-right"></div>

        <!-- Metal plates background -->
        <div class="metal-plates">
          <div class="plate"></div>
          <div class="plate"></div>
          <div class="plate"></div>
        </div>

        <!-- Content area -->
        <div class="node-content">
          <!-- Company icon with industrial frame -->
          <div class="icon-frame">
            <div class="frame-border"></div>
            <span class="icon">🏢</span>
          </div>

          <!-- Company name plate -->
          <div class="name-plate">
            <div class="name">{displayName}</div>
            <div class="name-underline"></div>
          </div>

          <!-- Stats display (industrial gauges style) -->
          <div class="stats-panel">
            <div class="stat-display balance-display">
              <div class="stat-label">CAPITAL</div>
              <div class="stat-value">
                {displayBalance.toLocaleString()} $
              </div>
              <div class="stat-indicator"></div>
            </div>

            <div class="stat-display level-display">
              <div class="stat-label">NIVEAU</div>
              <div class="stat-value">{displayLevel}</div>
              <div class="level-bars">
                {#each Array(5).fill(0) as _, i}
                  <div class="level-bar" class:active={i < displayLevel}></div>
                {/each}
              </div>
            </div>
          </div>

          <!-- Industrial upgrade button (only for own company) -->
          {#if isOwnCompany}
            <button
              class="upgrade-btn nodrag"
              class:disabled={!canUpgrade}
              class:upgrading={isUpgrading}
              onclick={handleUpgrade}
              disabled={!canUpgrade || isUpgrading}
              title="Cliquer pour améliorer"
            >
              <div class="btn-plate">
                <div class="btn-rivets">
                  <span class="btn-rivet"></span>
                  <span class="btn-rivet"></span>
                </div>
                <div class="btn-content">
                  {#if isUpgrading}
                    <div class="loading-gear">⚙</div>
                  {:else}
                    <span class="btn-icon">⬆</span>
                    <span class="btn-text"
                      >{upgradeCost.toLocaleString()} $</span
                    >
                  {/if}
                </div>
              </div>
            </button>
          {/if}
        </div>
      </div>

      <!-- Top face -->
      <div class="face-top"></div>
    </div>

    <!-- Smoke stack / chimney -->
    <div class="chimney">
      <div class="chimney-body"></div>
      <div class="chimney-top"></div>
      {#if isOwnCompany && displayLevel > 0}
        <div class="smoke"></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .company-node {
    position: relative;
    width: 280px;
    height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
  }

  .building-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* Foundation */
  .foundation {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 240px;
    height: 20px;
    background: linear-gradient(to bottom, #2a2b2f, #1a1b1f);
    border: 2px solid #3a3b3f;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.6);
  }

  /* Main building structure */
  .building-body {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 380px;
  }

  /* Isometric faces */
  .face-left {
    position: absolute;
    top: 12px;
    left: -15px;
    width: 20px;
    height: 380px;
    background: linear-gradient(to right, #4a4c52, #5a5c63);
    border: 1px solid #3a3b3f;
    transform: skewY(-5deg);
    z-index: 1;
  }

  .face-right {
    position: absolute;
    top: 12px;
    right: -15px;
    width: 20px;
    height: 380px;
    background: linear-gradient(to left, #2a2b2f, #3a3b3f);
    border: 1px solid #1a1b1f;
    transform: skewY(5deg);
    z-index: 1;
  }

  .face-top {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    height: 20px;
    background: linear-gradient(to bottom, #8b8d94, #6e7078);
    border: 2px solid #5a5c63;
    border-radius: 4px 4px 0 0;
    z-index: 3;
  }

  .face-front {
    position: absolute;
    top: 20px;
    left: 0;
    width: 220px;
    height: 380px;
    background: linear-gradient(135deg, #5a5c63 0%, #4a4c52 50%, #3a3b3f 100%);
    border: 3px solid #2a2b2f;
    border-radius: 4px;
    z-index: 2;
    overflow: hidden;
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
  }

  /* Rivets on corners */
  .rivet {
    position: absolute;
    width: 8px;
    height: 8px;
    background: radial-gradient(circle, #9a9ca3, #6e7078);
    border: 1px solid #2a2b2f;
    border-radius: 50%;
    z-index: 5;
  }

  .rivet.top-left {
    top: 8px;
    left: 8px;
  }
  .rivet.top-right {
    top: 8px;
    right: 8px;
  }
  .rivet.bottom-left {
    bottom: 8px;
    left: 8px;
  }
  .rivet.bottom-right {
    bottom: 8px;
    right: 8px;
  }

  /* Metal plates background */
  .metal-plates {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px;
    opacity: 0.3;
  }

  .plate {
    flex: 1;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(0, 0, 0, 0.3);
  }

  /* Content area */
  .node-content {
    position: relative;
    z-index: 2;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    height: 100%;
  }

  /* Icon frame */
  .icon-frame {
    position: relative;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle, #fbbf24, #f59e0b);
    border: 3px solid #2a2b2f;
    border-radius: 50%;
    box-shadow:
      0 0 20px rgba(251, 191, 36, 0.5),
      inset 0 -4px 8px rgba(0, 0, 0, 0.3);
  }

  .frame-border {
    position: absolute;
    inset: -8px;
    border: 2px solid #6e7078;
    border-radius: 50%;
    opacity: 0.6;
  }

  .icon {
    font-size: 32px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }

  /* Name plate */
  .name-plate {
    background: linear-gradient(to bottom, #3a3b3f, #2a2b2f);
    border: 2px solid #f59e0b;
    border-radius: 4px;
    padding: 8px 16px;
    min-width: 160px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .name {
    font-size: 13px;
    font-weight: 900;
    color: #fbbf24;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  }

  .name-underline {
    height: 2px;
    background: linear-gradient(to right, transparent, #f59e0b, transparent);
    margin-top: 4px;
  }

  /* Stats panel */
  .stats-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .stat-display {
    background: linear-gradient(to bottom, #1a1b1f, #0a0a0c);
    border: 2px solid #3a3b3f;
    border-radius: 4px;
    padding: 6px 12px;
    position: relative;
    overflow: hidden;
  }

  .stat-label {
    font-size: 9px;
    font-weight: 700;
    color: #6e7078;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  .stat-value {
    font-size: 16px;
    font-weight: 800;
    color: #fbbf24;
    text-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
    font-family: "Courier New", monospace;
  }

  .stat-indicator {
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 100%;
    background: linear-gradient(to bottom, #22c55e, #16a34a);
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
    animation: pulse 2s ease-in-out infinite;
  }

  .level-display .stat-value {
    color: #60a5fa;
    text-shadow: 0 0 10px rgba(96, 165, 250, 0.5);
  }

  .level-bars {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .level-bar {
    flex: 1;
    height: 4px;
    background: #2a2b2f;
    border: 1px solid #3a3b3f;
    border-radius: 2px;
    transition: all 0.3s;
  }

  .level-bar.active {
    background: linear-gradient(to right, #60a5fa, #3b82f6);
    box-shadow: 0 0 6px rgba(96, 165, 250, 0.6);
  }

  /* Upgrade button */
  .upgrade-btn {
    width: 100%;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-top: auto;
    transition: transform 0.2s;
  }

  .upgrade-btn:hover:not(.disabled) {
    transform: scale(1.05);
  }

  .upgrade-btn.disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .btn-plate {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: 3px solid #2a2b2f;
    border-radius: 6px;
    padding: 10px;
    position: relative;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.2);
    transition: all 0.2s;
  }

  .upgrade-btn:hover:not(.disabled) .btn-plate {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    box-shadow:
      0 4px 12px rgba(251, 191, 36, 0.6),
      inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }

  .upgrade-btn.disabled .btn-plate {
    background: linear-gradient(135deg, #4a4c52 0%, #3a3b3f 100%);
  }

  .btn-rivets {
    display: flex;
    justify-content: space-between;
    position: absolute;
    top: 4px;
    left: 8px;
    right: 8px;
  }

  .btn-rivet {
    width: 6px;
    height: 6px;
    background: radial-gradient(circle, #2a2b2f, #1a1b1f);
    border: 1px solid #0a0a0c;
    border-radius: 50%;
  }

  .btn-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: #1a1b1f;
    font-weight: 900;
    font-size: 14px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .btn-icon {
    font-size: 18px;
  }

  .loading-gear {
    font-size: 20px;
    animation: rotate 1s linear infinite;
  }

  /* Chimney */
  .chimney {
    position: absolute;
    top: -30px;
    right: 30px;
    z-index: 4;
  }

  .chimney-body {
    width: 16px;
    height: 40px;
    background: linear-gradient(to right, #4a4c52, #3a3b3f, #2a2b2f);
    border: 2px solid #1a1b1f;
    border-radius: 2px;
    box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  }

  .chimney-top {
    width: 20px;
    height: 8px;
    background: linear-gradient(to bottom, #6e7078, #5a5c63);
    border: 2px solid #2a2b2f;
    border-radius: 2px 2px 0 0;
    position: relative;
    top: -2px;
    left: -4px;
  }

  .smoke {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    background: radial-gradient(circle, rgba(156, 163, 175, 0.6), transparent);
    border-radius: 50%;
    animation: smoke 3s ease-in-out infinite;
  }

  /* Handle styling */
  :global(.handle) {
    background: #3a3b3f;
    border: 2px solid #6e7078;
    width: 12px;
    height: 12px;
  }

  /* Animations */
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes smoke {
    0% {
      opacity: 0.6;
      transform: translateX(-50%) translateY(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateX(-50%) translateY(-30px) scale(1.5);
    }
  }
</style>
