<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { onMount } from "svelte";
	import { initFirebase } from "$lib/firebase";
	import Footer from "$lib/components/Footer.svelte";

	let { children } = $props();

	let navHubOpen = $state(false);

	onMount(async () => {
		// Initialise Firebase/Analytics
		initFirebase();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex flex-col min-h-screen">
	<div class="grow">
		{@render children()}
	</div>
	<Footer />
</div>
