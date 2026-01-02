<script lang="ts">
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { fade, fly } from "svelte/transition";

  // --- Game State (Runes) ---
  let recoveredData = $state(0);
  let clickPower = $state(1);
  let autoClickerCount = $state(0);

  // Floating Text State
  let clicks = $state<{ id: number; x: number; y: number; text: string }[]>([]);

  // Costs
  let patchCost = $state(100); // +1 Click
  let botCost = $state(50); // +1 Auto
  let overclockCost = $state(500); // +5 Click
  let neuralCost = $state(1000); // +10 Auto
  let gridCost = $state(5000); // +50 Auto

  let consoleLogs: string[] = $state([]);
  let isExpanded = $state(false);

  // --- Constants (Base Costs) ---
  const BASE = {
    PATCH: 100,
    BOT: 50,
    OVERCLOCK: 500,
    NEURAL: 1000,
    GRID: 5000,
  };

  // --- Timer ---
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    addLog("SYSTEM_MALFUNCTION_DETECTED: 404");
    addLog("INITIATING_DIAGNOSTIC_PROTOCOL...");

    interval = setInterval(() => {
      if (autoClickerCount > 0) {
        recoveredData += autoClickerCount;
      }
    }, 1000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  // --- Actions ---
  function handleClick(event: MouseEvent) {
    recoveredData += clickPower;

    const target = event.target as HTMLElement;
    target.style.transform = `scale(0.95)`;
    setTimeout(() => (target.style.transform = "scale(1)"), 50);

    // Spawn floating text
    spawnClickEffect(event.clientX, event.clientY, clickPower);

    if (Math.random() > 0.8) {
      addLog(`Recovered packet: +${clickPower} bytes`);
    }
  }

  function spawnClickEffect(x: number, y: number, amount: number) {
    const id = Date.now() + Math.random();
    clicks.push({ id, x, y, text: `+${amount}` });
    setTimeout(() => {
      clicks = clicks.filter((c) => c.id !== id);
    }, 800);
  }

  // --- Upgrades ---

  // 1. Manual Patch (+1 Click)
  function buyPatch() {
    if (recoveredData >= patchCost) {
      recoveredData -= patchCost;
      clickPower++;
      patchCost = Math.floor(BASE.PATCH * Math.pow(1.5, clickPower - 1));
      addLog(`UPGRADE: Manual Patch v${clickPower}.0`);
    }
  }

  // 2. Recovery Bot (+1 Auto)
  function buyBot() {
    if (recoveredData >= botCost) {
      recoveredData -= botCost;
      autoClickerCount += 1;
      botCost = Math.floor(BASE.BOT * Math.pow(1.15, autoClickerCount));
      addLog(`DEPLOYED: Recovery Bot`);
    }
  }

  // 3. Overclock (+5 Click)
  function buyOverclock() {
    if (recoveredData >= overclockCost) {
      recoveredData -= overclockCost;
      clickPower += 5;
      overclockCost = Math.floor(overclockCost * 1.6);
      addLog(`SYSTEM: CPU Overclocked`);
    }
  }

  // 4. Neural Net (+10 Auto)
  function buyNeural() {
    if (recoveredData >= neuralCost) {
      recoveredData -= neuralCost;
      autoClickerCount += 10;
      neuralCost = Math.floor(neuralCost * 1.4);
      addLog(`MODULE: Neural Net Synced`);
    }
  }

  // 5. Grid Alignment (+50 Auto)
  function buyGrid() {
    if (recoveredData >= gridCost) {
      recoveredData -= gridCost;
      autoClickerCount += 50;
      gridCost = Math.floor(gridCost * 1.5);
      addLog(`PROTOCOL: Grid Aligned`);
    }
  }

  function addLog(msg: string) {
    consoleLogs = [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...consoleLogs,
    ].slice(0, 5);
  }

  function toggleDiagnostic() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      addLog("MANUAL_OVERRIDE_ENGAGED");
    }
  }
</script>

<svelte:head>
  <title>404 - Not Found</title>
</svelte:head>

<div
  class="min-h-screen flex flex-col items-center justify-center p-4 relative bg-[var(--color-background)]"
>
  <!-- Main Error Content -->
  <div class="z-10 w-full max-w-2xl text-center space-y-8 mb-16">
    <div class="relative inline-block">
      <h1
        class="text-8xl font-black text-[var(--color-content-primary)] tracking-tight"
      >
        404
      </h1>
      <div
        class="absolute -top-4 -right-12 px-3 py-1 bg-[var(--color-status-danger)] text-white text-xs font-mono rounded rotate-12"
      >
        CRITICAL_ERROR
      </div>
    </div>

    <div class="space-y-4">
      <h2 class="text-3xl font-bold text-[var(--color-content-secondary)]">
        Page Introuvable
      </h2>
      <p
        class="text-[var(--color-content-tertiary)] max-w-lg mx-auto leading-relaxed"
      >
        La ressource que vous tentez d'atteindre n'existe pas ou a été déplacée.
        Il est conseillé de retourner en lieu sûr.
      </p>
    </div>

    <div class="flex gap-4 justify-center">
      <a
        href="/"
        class="px-8 py-3 rounded-lg bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] text-white font-semibold transition-all shadow-lg hover:shadow-[var(--color-primary-500)]/30"
      >
        Retour à l'Accueil
      </a>
      <button
        onclick={toggleDiagnostic}
        class="px-8 py-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-highlight)] text-[var(--color-content-secondary)] font-medium transition-colors font-mono text-sm"
      >
        {isExpanded ? "Masquer Diagnostic" : "Lancer Diagnostic Système"}
      </button>
    </div>
  </div>

  <!-- Diagnostic Terminal -->
  {#if isExpanded}
    <div
      transition:fade
      class="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 relative"
    >
      <!-- Terminal Header -->
      <div
        class="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] px-4 py-2 flex items-center justify-between"
      >
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div class="font-mono text-xs text-[var(--color-content-tertiary)]">
          SYS_DIAG_TOOL_v0.9.5 [ROOT_ACCESS]
        </div>
      </div>

      <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-sm">
        <!-- Left: Console Log -->
        <div class="md:col-span-2 space-y-4 flex flex-col h-full">
          <div
            class="bg-[var(--color-background)] rounded p-4 flex-grow overflow-hidden border border-[var(--color-border-light)] font-mono text-xs text-green-400 min-h-[150px]"
          >
            {#each consoleLogs as log}
              <div class="mb-1 opacity-80">> {log}</div>
            {/each}
          </div>

          <div
            class="flex items-center gap-4 bg-[var(--color-surface-highlight)] p-4 rounded border border-[var(--color-border)]"
          >
            <button
              class="w-20 h-20 bg-red-500/10 border-2 border-red-500/50 hover:bg-red-500/20 active:scale-95 transition-all rounded flex items-center justify-center group cursor-crosshair flex-shrink-0"
              onclick={handleClick}
              title="Repair Sector"
            >
              <svg
                class="w-10 h-10 text-red-500 animate-pulse group-hover:animate-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </button>
            <div>
              <div
                class="text-[var(--color-content-secondary)] text-xs uppercase tracking-wide"
              >
                Données Récupérées
              </div>
              <div class="text-3xl font-bold text-[var(--color-primary-400)]">
                {Math.floor(recoveredData)}
                <span
                  class="text-sm font-normal text-[var(--color-content-tertiary)]"
                  >BYTES</span
                >
              </div>
              <div class="text-xs text-[var(--color-status-success)] mt-1">
                Flux actuel: {autoClickerCount} B/s
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Upgrades List - Scrollable if needed -->
        <div
          class="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
        >
          <div
            class="text-xs uppercase tracking-wide text-[var(--color-content-tertiary)] mb-2 sticky top-0 bg-[var(--color-surface)] py-1"
          >
            Available Patches
          </div>

          <!-- 1. Bot -->
          <button
            class="w-full text-left p-3 rounded border bg-[var(--color-surface-alt)] hover:border-[var(--color-primary-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-highlight)] disabled:hover:bg-[var(--color-surface-alt)]"
            class:border-[var(--color-border)]={recoveredData < botCost}
            class:border-[var(--color-primary-500)]={recoveredData >= botCost}
            onclick={buyBot}
            disabled={recoveredData < botCost}
          >
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[var(--color-content-primary)]"
                >Auto-Fix Daemon</span
              >
              <span class="text-[var(--color-status-success)] text-xs"
                >+1/s</span
              >
            </div>
            <div class="text-[var(--color-primary-300)] text-xs">
              Cost: {botCost} B
            </div>
          </button>

          <!-- 2. Patch -->
          <button
            class="w-full text-left p-3 rounded border bg-[var(--color-surface-alt)] hover:border-[var(--color-primary-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-highlight)] disabled:hover:bg-[var(--color-surface-alt)]"
            class:border-[var(--color-border)]={recoveredData < patchCost}
            class:border-[var(--color-primary-500)]={recoveredData >= patchCost}
            onclick={buyPatch}
            disabled={recoveredData < patchCost}
          >
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[var(--color-content-primary)]"
                >Code Patch</span
              >
              <span class="text-[var(--color-status-success)] text-xs"
                >+1/click</span
              >
            </div>
            <div class="text-[var(--color-primary-300)] text-xs">
              Cost: {patchCost} B
            </div>
          </button>

          <!-- 3. Overclock -->
          <button
            class="w-full text-left p-3 rounded border bg-[var(--color-surface-alt)] hover:border-[var(--color-primary-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-highlight)] disabled:hover:bg-[var(--color-surface-alt)]"
            class:border-[var(--color-border)]={recoveredData < overclockCost}
            class:border-[var(--color-primary-500)]={recoveredData >=
              overclockCost}
            onclick={buyOverclock}
            disabled={recoveredData < overclockCost}
          >
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[var(--color-content-primary)]"
                >CPU Overclock</span
              >
              <span class="text-[var(--color-status-success)] text-xs"
                >+5/click</span
              >
            </div>
            <div class="text-[var(--color-primary-300)] text-xs">
              Cost: {overclockCost} B
            </div>
          </button>

          <!-- 4. Neural -->
          <button
            class="w-full text-left p-3 rounded border bg-[var(--color-surface-alt)] hover:border-[var(--color-primary-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-highlight)] disabled:hover:bg-[var(--color-surface-alt)]"
            class:border-[var(--color-border)]={recoveredData < neuralCost}
            class:border-[var(--color-primary-500)]={recoveredData >=
              neuralCost}
            onclick={buyNeural}
            disabled={recoveredData < neuralCost}
          >
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[var(--color-content-primary)]"
                >Neural Net</span
              >
              <span class="text-[var(--color-status-success)] text-xs"
                >+10/s</span
              >
            </div>
            <div class="text-[var(--color-primary-300)] text-xs">
              Cost: {neuralCost} B
            </div>
          </button>

          <!-- 5. Grid -->
          <button
            class="w-full text-left p-3 rounded border bg-[var(--color-surface-alt)] hover:border-[var(--color-primary-500)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-surface-highlight)] disabled:hover:bg-[var(--color-surface-alt)]"
            class:border-[var(--color-border)]={recoveredData < gridCost}
            class:border-[var(--color-primary-500)]={recoveredData >= gridCost}
            onclick={buyGrid}
            disabled={recoveredData < gridCost}
          >
            <div class="flex justify-between items-center mb-1">
              <span class="font-bold text-[var(--color-content-primary)]"
                >Grid Alignment</span
              >
              <span class="text-[var(--color-status-success)] text-xs"
                >+50/s</span
              >
            </div>
            <div class="text-[var(--color-primary-300)] text-xs">
              Cost: {gridCost} B
            </div>
          </button>
        </div>
      </div>

      <!-- Floating Click Effects Container (Global to viewport but properly z-indexed) -->
      {#each clicks as click (click.id)}
        <div
          class="fixed pointer-events-none text-[var(--color-primary-400)] font-mono font-bold z-[100] select-none text-xl shadow-black drop-shadow-md"
          style="left: {click.x}px; top: {click.y}px;"
          out:fade={{ duration: 500 }}
        >
          {click.text}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Optional scrollbar styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-border-light);
    border-radius: 4px;
  }
</style>
