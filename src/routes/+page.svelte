<script lang="ts">
	import { mission } from '$lib/content/hive';
	import HiveWorld from '$lib/HiveWorld.svelte';
</script>

<svelte:head>
	<title>Ketsuna | La ruche des outils ouverts pour les communautés</title>
	<meta name="description" content={mission.statement} />
	<meta property="og:title" content="Ketsuna, la ruche" />
	<meta property="og:description" content={mission.headline} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://ketsuna.com" />
</svelte:head>

<HiveWorld />

<style>
	@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');

	:global(body) {
		margin: 0;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		background: #0b0e10;
		line-height: 1.6;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>
