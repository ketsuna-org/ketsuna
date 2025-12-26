import type { Handle } from '@sveltejs/kit';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://region1.analytics.google.com https://www.googletagmanager.com https://*.firebasedatabase.app https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "frame-src https://www.googletagmanager.com",
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
