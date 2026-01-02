import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Static adapter for Cloudflare Pages (pure static HTML/JS/CSS)
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html', // Fallback for dynamic/SPA routes
			precompress: false,
			strict: true
		})
	}
};

export default config;
