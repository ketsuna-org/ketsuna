export default {
    async fetch(request, env, ctx) {
        // Servez les fichiers statiques générés par SvelteKit (adapter-static)
        // via la binding ASSETS fournie par Wrangler.
        return env.ASSETS.fetch(request);
    }
};