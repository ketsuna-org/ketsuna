<script lang="ts">
	import { mission, cells, links } from '$lib/content/hive';
</script>

<svelte:head>
	<title>Ketsuna | La ruche des outils ouverts pour les communautés</title>
	<meta name="description" content={mission.statement} />
	<meta property="og:title" content="Ketsuna, la ruche" />
	<meta property="og:description" content={mission.headline} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://ketsuna.com" />
</svelte:head>

<header class="nav">
	<div class="container nav-inner">
		<a class="brand" href="/">Ketsuna</a>
		<nav aria-label="Navigation principale">
			<a href="#mission">Mission</a>
			<a href="#projets">Projets</a>
		</nav>
	</div>
</header>

<main>
	<section class="hero container">
		<p class="eyebrow">{mission.eyebrow}</p>
		<h1>{mission.headline}</h1>
		<p class="lead">{mission.statement}</p>
		<div class="actions">
			<a class="button" href="#projets">Découvrir les projets</a>
			<a class="button ghost" href="https://discord.gg/gyEGNBUZdA" target="_blank" rel="noreferrer"
				>Rejoindre la communauté</a
			>
		</div>
	</section>

	<section id="mission" class="container section">
		<h2>Notre mission</h2>
		<div class="grid three">
			{#each mission.principles as p, i}
				<article class="card">
					<p class="num">0{i + 1}</p>
					<h3>{p.title}</h3>
					<p>{p.text}</p>
				</article>
			{/each}
		</div>
	</section>

	<section id="projets" class="container section">
		<h2>Les cellules de la ruche</h2>
		<div class="grid two">
			{#each cells as c}
				<article class="card cell">
					<header>
						<span class="tag">{c.tag}</span>
						<span class="status">{c.status}</span>
					</header>
					<h3>{c.name}</h3>
					<p>{c.description}</p>
					<a class="link" href={c.href} target="_blank" rel="noreferrer">{c.cta} →</a>
				</article>
			{/each}
		</div>
	</section>
</main>

<footer class="container footer">
	<p>© {new Date().getFullYear()} Ketsuna</p>
	<ul>
		{#each links as l}
			<li><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>
		{/each}
	</ul>
</footer>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');

	:global(:root) {
		--bg: #0f1214;
		--surface: #171b1e;
		--border: #262c30;
		--text: #e8edef;
		--muted: #9aa5ab;
		--jade: #2fd49b;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(html) {
		scroll-behavior: smooth;
	}

	:global(body) {
		margin: 0;
		font-family: 'Space Grotesk', system-ui, sans-serif;
		color: var(--text);
		background: var(--bg);
		min-height: 100vh;
		line-height: 1.6;
	}

	a {
		color: inherit;
	}

	.container {
		width: min(1080px, 100%);
		margin: 0 auto;
		padding-inline: 1.25rem;
	}

	.nav {
		position: sticky;
		top: 0;
		z-index: 10;
		background: rgba(15, 18, 20, 0.85);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--border);
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 3.5rem;
	}

	.brand {
		font-weight: 700;
		text-decoration: none;
		color: var(--jade);
		letter-spacing: 0.04em;
	}

	nav a {
		margin-left: 1.5rem;
		color: var(--muted);
		text-decoration: none;
	}

	nav a:hover {
		color: var(--text);
	}

	.hero {
		padding-block: clamp(3.5rem, 9vw, 7rem) 3rem;
	}

	.eyebrow {
		margin: 0 0 1rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--jade);
	}

	h1,
	h2,
	h3 {
		line-height: 1.15;
		margin: 0;
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3.5rem);
		max-width: 20ch;
	}

	h2 {
		font-size: clamp(1.5rem, 3vw, 2rem);
		margin-bottom: 1.5rem;
	}

	h3 {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.lead {
		margin: 1.5rem 0 0;
		max-width: 62ch;
		color: var(--muted);
		font-size: 1.15rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.button {
		display: inline-block;
		padding: 0.7rem 1.2rem;
		border-radius: 0.5rem;
		background: var(--jade);
		color: #06231a;
		font-weight: 700;
		text-decoration: none;
		border: 1px solid var(--jade);
	}

	.button.ghost {
		background: transparent;
		color: var(--text);
		border-color: var(--border);
	}

	.button:hover {
		filter: brightness(1.1);
	}

	.section {
		padding-block: 2.5rem;
	}

	.grid {
		display: grid;
		gap: 1rem;
	}

	.grid.three {
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	}

	.grid.two {
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	}

	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.card p {
		margin: 0;
		color: var(--muted);
	}

	.num {
		color: var(--jade) !important;
		font-weight: 700;
		margin-bottom: 0.5rem !important;
	}

	.cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cell:hover {
		border-color: var(--jade);
	}

	.cell header {
		display: flex;
		justify-content: space-between;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 0.75rem;
	}

	.tag {
		color: var(--jade);
	}

	.status {
		color: var(--muted);
	}

	.link {
		margin-top: auto;
		padding-top: 1rem;
		color: var(--jade);
		font-weight: 700;
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}

	.footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 2.5rem;
		margin-top: 2rem;
		border-top: 1px solid var(--border);
		color: var(--muted);
	}

	.footer p {
		margin: 0;
	}

	.footer ul {
		display: flex;
		gap: 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.footer a {
		text-decoration: none;
	}

	.footer a:hover {
		color: var(--text);
	}
</style>
