/**
 * Machine Refresh Store
 * Used to notify components when machines list needs to be refreshed
 * (e.g., after a purchase in the market)
 */

import { writable } from 'svelte/store';

interface MachineRefreshEvent {
    timestamp: Date;
    reason: 'purchase' | 'delete' | 'update';
}

function createMachineRefreshStore() {
    const { subscribe, set } = writable<MachineRefreshEvent | null>(null);

    return {
        subscribe,
        /**
         * Trigger a refresh of the machines list
         */
        refresh: (reason: MachineRefreshEvent['reason'] = 'update') => {
            set({ timestamp: new Date(), reason });
        },
        /**
         * Clear the refresh event
         */
        clear: () => {
            set(null);
        }
    };
}

export const machineRefreshStore = createMachineRefreshStore();
