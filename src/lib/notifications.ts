import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

function createNotificationStore() {
    const { subscribe, update } = writable<Notification[]>([]);

    function send(message: string, type: NotificationType = 'info', duration = 5000) {
        const id = Math.random().toString(36).substring(2, 9);
        update(n => [...n, { id, type, message, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                remove(id);
            }, duration);
        }
    }

    function remove(id: string) {
        update(n => n.filter(i => i.id !== id));
    }

    return {
        subscribe,
        success: (msg: string, dur?: number) => send(msg, 'success', dur),
        error: (msg: string, dur?: number) => send(msg, 'error', dur),
        info: (msg: string, dur?: number) => send(msg, 'info', dur),
        warning: (msg: string, dur?: number) => send(msg, 'warning', dur),
        remove
    };
}

export const notifications = createNotificationStore();
