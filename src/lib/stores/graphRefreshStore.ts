/**
 * Graph Refresh Store - Auto-refresh system for Graph Economy
 * Periodically calls /api/inventory/refresh to trigger lazy calculations
 */

import { writable, get } from 'svelte/store';
import pb from '$lib/pocketbase';
import { activeCompany } from '$lib/stores';

interface GraphRefreshState {
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  isRefreshing: boolean;
  error: string | null;
  producedItems: Record<string, number> | null;
}

// Auto-refresh interval: 30 seconds (adjustable)
const AUTO_REFRESH_INTERVAL = 30 * 1000;

function createGraphRefreshStore() {
  const { subscribe, set, update } = writable<GraphRefreshState>({
    lastRefresh: null,
    nextRefresh: null,
    isRefreshing: false,
    error: null,
    producedItems: null,
  });

  let intervalId: NodeJS.Timeout | null = null;
  let currentCompanyId: string | null = null;

  /**
   * Trigger a manual refresh of the Graph Economy
   */
  async function refresh(force = false): Promise<void> {
    const state = get({ subscribe });

    // Prevent concurrent refreshes
    if (state.isRefreshing && !force) {
      console.log('[GRAPH_REFRESH] Already refreshing, skipping');
      return;
    }

    const companyId = get(activeCompany)?.id;
    if (!companyId) {
      console.warn('[GRAPH_REFRESH] No active company, cannot refresh');
      return;
    }

    update((s) => ({ ...s, isRefreshing: true, error: null }));

    try {
      const response = await pb.send('/api/inventory/refresh', {
        method: 'POST',
      });

      const producedItems = response.producedItems || {};

      set({
        lastRefresh: new Date(),
        nextRefresh: new Date(Date.now() + AUTO_REFRESH_INTERVAL),
        isRefreshing: false,
        error: null,
        producedItems,
      });

      console.log('[GRAPH_REFRESH] Refresh successful', {
        producedCount: Object.keys(producedItems).length,
        items: producedItems,
      });
    } catch (err: any) {
      console.error('[GRAPH_REFRESH] Refresh failed:', err);
      update((s) => ({
        ...s,
        isRefreshing: false,
        error: err.message || 'Failed to refresh',
        nextRefresh: new Date(Date.now() + AUTO_REFRESH_INTERVAL),
      }));
    }
  }

  /**
   * Start the auto-refresh system
   */
  function start(): void {
    if (intervalId) {
      console.warn('[GRAPH_REFRESH] Already started');
      return;
    }

    const companyId = get(activeCompany)?.id;
    if (!companyId) {
      console.warn('[GRAPH_REFRESH] No active company, cannot start auto-refresh');
      return;
    }

    currentCompanyId = companyId;
    console.log('[GRAPH_REFRESH] Starting auto-refresh', {
      interval: AUTO_REFRESH_INTERVAL / 1000 + 's',
    });

    // Initial refresh
    refresh(true);

    // Setup periodic refresh
    intervalId = setInterval(() => {
      refresh();
    }, AUTO_REFRESH_INTERVAL);
  }

  /**
   * Stop the auto-refresh system
   */
  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('[GRAPH_REFRESH] Stopped auto-refresh');
    }
  }

  /**
   * Restart the auto-refresh (useful when switching companies)
   */
  function restart(): void {
    stop();
    start();
  }

  return {
    subscribe,
    refresh,
    start,
    stop,
    restart,
  };
}

export const graphRefreshStore = createGraphRefreshStore();

// Auto-start when activeCompany changes (only in browser)
if (typeof window !== 'undefined') {
  activeCompany.subscribe((company) => {
    if (company?.id) {
      // Company changed, restart auto-refresh
      graphRefreshStore.restart();
    } else {
      // No company, stop auto-refresh
      graphRefreshStore.stop();
    }
  });
}
