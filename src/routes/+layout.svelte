<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { onMount } from "svelte";
	import { initFirebase } from "$lib/firebase";
	let { children } = $props();

	onMount(() => {
		// Initialise Firebase/Analytics au premier rendu client
		initFirebase();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
{@render children()}
