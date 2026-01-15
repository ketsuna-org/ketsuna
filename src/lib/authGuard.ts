/**
 * Auth Guard Utility
 * Handles authentication errors (401/token expired) globally
 * Clears localStorage and redirects to login page
 */

import pb from '$lib/pocketbase';
import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { browser } from '$app/environment';
import { notifications } from '$lib/notifications';

/**
 * Check if an error is an authentication error (401 or token expired)
 */
export function isAuthError(error: unknown): boolean {
    if (!error) return false;

    // PocketBase ClientResponseError
    if (typeof error === 'object' && error !== null) {
        const err = error as { status?: number; message?: string };

        // Check for 401 status
        if (err.status === 401) return true;

        // Check for token-related messages
        const message = err.message?.toLowerCase() || '';
        if (
            message.includes('token') ||
            message.includes('expired') ||
            message.includes('unauthorized') ||
            message.includes('not authenticated')
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Handle authentication failure
 * Clears auth store and redirects to login
 */
export function handleAuthFailure(reason: string = 'Session expirée'): void {
    if (!browser) return;

    console.warn('[AUTH] Authentication failure:', reason);

    // Clear the auth store (this also clears localStorage)
    pb.authStore.clear();

    // Show notification
    notifications.warning(`${reason}. Veuillez vous reconnecter.`);

    // Redirect to login
    goto(resolve('/login'));
}

/**
 * Wrapper for API calls that automatically handles auth errors
 * @param apiCall - The async API function to execute
 * @returns The result of the API call
 * @throws Re-throws non-auth errors
 */
export async function withAuthGuard<T>(apiCall: () => Promise<T>): Promise<T> {
    try {
        return await apiCall();
    } catch (error) {
        if (isAuthError(error)) {
            handleAuthFailure('Session expirée');
            throw error; // Still throw so caller knows it failed
        }
        throw error;
    }
}

/**
 * Initialize global auth error handling
 * Call this once at app startup
 */
export function initAuthGuard(): void {
    if (!browser) return;

    // Listen for auth store changes
    pb.authStore.onChange((token, model) => {
        // If token becomes invalid/null while we thought we were logged in
        if (!token && !model) {
            console.log('[AUTH] Auth store cleared');
        }
    });

    // Optionally: intercept all fetch requests to detect 401s
    // This is a more aggressive approach but catches all API errors
    const originalSend = pb.send.bind(pb);
    pb.send = async function <T>(path: string, options?: object): Promise<T> {
        try {
            return await originalSend(path, options);
        } catch (error) {
            if (isAuthError(error)) {
                handleAuthFailure('Session expirée');
            }
            throw error;
        }
    };
}
