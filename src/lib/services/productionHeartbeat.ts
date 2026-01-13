import { writable } from 'svelte/store';
import pb from '$lib/pocketbase';
import { browser } from '$app/environment';

// Store that notifies when a production cycle completes
// Components can subscribe to this to know when to fetch fresh data
export const lastProductionTick = writable<number>(0);

let heartbeatInterval: any = null;
const HEARTBEAT_DELAY = 30000; // 30 seconds

/**
 * Starts the production heartbeat.
 * Calls the API to process factory calculations (Lazy Calculation).
 * On success, updates the store to notify components.
 */
export function startProductionHeartbeat() {
  if (!browser || heartbeatInterval) return;

  console.log('[HEARTBEAT] Starting production cycle heartbeat (30s)');

  // Initial call immediately logic handled by components or explicit call if needed.
  // We start interval directly to avoid double-load on entry if components load themselves.

  heartbeatInterval = setInterval(async () => {
    try {
      // Trigger lazy calculation on server
      await pb.send('/api/factory/process', { method: 'POST' });
      
      // Notify components that production has advanced
      lastProductionTick.set(Date.now());
      console.log('[HEARTBEAT] Cycle completed, notifying components');
      
    } catch (e) {
      console.error('[HEARTBEAT] Failed to process factory cycle', e);
    }
  }, HEARTBEAT_DELAY);
}

/**
 * Stops the heartbeat (e.g. on logout)
 */
export function stopProductionHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('[HEARTBEAT] Stopped');
  }
}
