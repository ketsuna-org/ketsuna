import type { Handle } from '@sveltejs/kit';

const CSP = [
    "default-src 'self'",
    // GTM, GA, Cloudflare Insights, CMP (ConsentManager), gstatic (Firebase)
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://cdn.consentmanager.net https://www.gstatic.com",
    // API/collect & Firebase endpoints & backend
    "connect-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://region1.analytics.google.com https://cloudflareinsights.com https://static.cloudflareinsights.com https://*.firebasedatabase.app https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://api.ketsuna.com wss://api.ketsuna.com",
    "img-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    // GTM iframe + CMP au besoin
    "frame-src https://www.googletagmanager.com https://cdn.consentmanager.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
].join('; ');

export const handle: Handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // Applique la CSP et quelques en-têtes de sécurité utiles
    response.headers.set('Content-Security-Policy', CSP);
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;
};
