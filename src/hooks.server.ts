import type { Handle } from '@sveltejs/kit';

// Hook neutre: ne définit aucun en-tête de sécurité
export const handle: Handle = async ({ event, resolve }) => {
    return resolve(event);
};
