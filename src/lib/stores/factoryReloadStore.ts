/**
 * Factory Reload Store
 * Simple event store to trigger factory graph reloads from node components
 */

import { writable } from 'svelte/store';

interface FactoryReloadState {
  lastReload: Date | null;
  reason: string | null;
}

function createFactoryReloadStore() {
  const { subscribe, set } = writable<FactoryReloadState>({
    lastReload: null,
    reason: null,
  });

  /**
   * Trigger a factory graph reload
   * @param reason - Reason for the reload (for debugging)
   */
  function triggerReload(reason: string = 'manual'): void {
    console.log('[FACTORY_RELOAD] Triggered:', reason);
    set({
      lastReload: new Date(),
      reason,
    });
  }

  return {
    subscribe,
    triggerReload,
  };
}

export const factoryReloadStore = createFactoryReloadStore();
