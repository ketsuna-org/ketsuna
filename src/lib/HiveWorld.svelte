<script lang="ts">
	import { onMount } from 'svelte';
	import type * as THREE from 'three';
	import { mission, cells } from '$lib/content/hive';

	// Station 0 = la mission (vue d'ensemble), 1..n = les cellules.
	let station = $state(0);
	let ready = $state(false);
	let canvasHost: HTMLDivElement;
	let pins: HTMLButtonElement[] = [];
	let goTo: (i: number) => void = () => {};

	const stations = ['Mission', ...cells.map((c) => c.name)];
	const total = stations.length;
	const next = () => go((station + 1) % total);
	const prev = () => go((station + total - 1) % total);
	function go(i: number) {
		station = i;
		goTo(i);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
	}

	onMount(() => {
		let disposed = false;
		let raf = 0;
		let cleanup = () => {};

		(async () => {
			const T = await import('three');
			if (disposed) return;

			const JADE = 0x2fd49b;
			let renderer: THREE.WebGLRenderer;
			try {
				renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
			} catch {
				// Sans WebGL : fond uni, le panneau et la navigation restent utilisables.
				ready = true;
				return;
			}
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
			renderer.setClearColor(0x0b0e10);
			// eslint-disable-next-line svelte/no-dom-manipulating
			canvasHost.appendChild(renderer.domElement);
			renderer.domElement.setAttribute('aria-hidden', 'true');

			const scene = new T.Scene();
			scene.fog = new T.FogExp2(0x0b0e10, 0.035);
			const camera = new T.PerspectiveCamera(48, 1, 0.1, 120);

			scene.add(new T.HemisphereLight(0x5b7f78, 0x0b0e10, 0.9));
			const sun = new T.DirectionalLight(0xffffff, 0.8);
			sun.position.set(6, 12, 8);
			scene.add(sun);

			// --- Géométrie en nid d'abeille (axial -> monde, hexagones « pointe en haut »)
			const SIZE = 1;
			const toWorld = (q: number, r: number) =>
				new T.Vector3(SIZE * Math.sqrt(3) * (q + r / 2), 0, SIZE * 1.5 * r);
			const hash = (q: number, r: number) => {
				const s = Math.sin(q * 127.1 + r * 311.7) * 43758.5453;
				return s - Math.floor(s);
			};

			const RADIUS = 9;
			const tiles: { q: number; r: number; pos: THREE.Vector3; h: number }[] = [];
			for (let q = -RADIUS; q <= RADIUS; q++) {
				for (let r = Math.max(-RADIUS, -q - RADIUS); r <= Math.min(RADIUS, -q + RADIUS); r++) {
					const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
					if (d === 0) continue;
					tiles.push({ q, r, pos: toWorld(q, r), h: 0.25 + hash(q, r) * 0.55 });
				}
			}

			const tileGeo = new T.CylinderGeometry(SIZE * 0.93, SIZE * 0.93, 1, 6);
			const tileMat = new T.MeshStandardMaterial({
				color: 0x1a2024,
				roughness: 0.75,
				metalness: 0.2,
				emissive: 0x0a3a2b,
				emissiveIntensity: 0.4
			});
			const mesh = new T.InstancedMesh(tileGeo, tileMat, tiles.length);
			scene.add(mesh);
			const dummy = new T.Object3D();

			// --- Cellules : positions sur l'anneau
			const ring: [number, number][] = [
				[3, -3],
				[3, 0],
				[-3, 3],
				[-3, 0]
			];
			const cellPos = ring.map(([q, r]) => toWorld(q, r));
			const specials = [new T.Vector3(0, 0, 0), ...cellPos];
			const hits: THREE.Object3D[] = [];
			const spinners: THREE.Object3D[] = [];

			const baseMat = () =>
				new T.MeshStandardMaterial({
					color: 0x20272b,
					roughness: 0.5,
					metalness: 0.3,
					emissive: JADE,
					emissiveIntensity: 0.18
				});
			const glowMat = () =>
				new T.MeshStandardMaterial({
					color: 0x0f3a2c,
					roughness: 0.3,
					metalness: 0.4,
					emissive: JADE,
					emissiveIntensity: 0.9
				});

			const ICON_Y = 2.3;
			const makeIcon = (i: number): THREE.Object3D => {
				const g = new T.Group();
				const m = glowMat();
				if (i === 0) {
					// Nid central : icosaèdre fil de fer
					const ico = new T.Mesh(
						new T.IcosahedronGeometry(0.9, 1),
						new T.MeshBasicMaterial({ color: JADE, wireframe: true })
					);
					g.add(ico, new T.Mesh(new T.IcosahedronGeometry(0.45, 0), m));
				} else if (i === 1) {
					// Bot-Creator : blocs du builder
					const a = new T.Mesh(new T.BoxGeometry(0.8, 0.8, 0.8), m);
					const b = new T.Mesh(new T.BoxGeometry(0.4, 0.4, 0.4), m);
					b.position.set(0.7, 0.5, 0);
					const c = new T.Mesh(new T.BoxGeometry(0.3, 0.3, 0.3), m);
					c.position.set(-0.6, -0.4, 0.3);
					g.add(a, b, c);
				} else if (i === 2) {
					// Sovrabase : disques empilés (base de données)
					for (let k = 0; k < 3; k++) {
						const d = new T.Mesh(new T.CylinderGeometry(0.6, 0.6, 0.28, 24), m);
						d.position.y = (k - 1) * 0.42;
						g.add(d);
					}
				} else if (i === 3) {
					// KexaManager : cube de stockage 2x2
					for (const x of [-0.25, 0.25])
						for (const y of [-0.25, 0.25])
							for (const z of [-0.25, 0.25]) {
								const s = new T.Mesh(new T.BoxGeometry(0.42, 0.42, 0.42), m);
								s.position.set(x, y, z);
								g.add(s);
							}
				} else {
					// Chessy : pion
					const pts = [
						[0, -0.7],
						[0.55, -0.7],
						[0.5, -0.5],
						[0.25, -0.3],
						[0.2, 0.1],
						[0.4, 0.2],
						[0.3, 0.3],
						[0, 0.35]
					].map(([x, y]) => new T.Vector2(x, y));
					const pawn = new T.Mesh(new T.LatheGeometry(pts, 24), m);
					const head = new T.Mesh(new T.SphereGeometry(0.28, 20, 16), m);
					head.position.y = 0.55;
					g.add(pawn, head);
				}
				return g;
			};

			const platforms: THREE.Mesh[] = [];
			specials.forEach((p, i) => {
				const H = 1.4;
				const platform = new T.Mesh(
					new T.CylinderGeometry(SIZE * 0.97, SIZE * 0.97, H, 6),
					baseMat()
				);
				platform.position.set(p.x, H / 2, p.z);
				platform.userData.index = i;
				scene.add(platform);
				platforms.push(platform);
				hits.push(platform);

				const outline = new T.LineSegments(
					new T.EdgesGeometry(new T.CylinderGeometry(SIZE * 1.12, SIZE * 1.12, 0.04, 6)),
					new T.LineBasicMaterial({ color: JADE, transparent: true, opacity: 0.9 })
				);
				outline.position.set(p.x, H + 0.05, p.z);
				scene.add(outline);
				spinners.push(outline);

				const icon = makeIcon(i);
				icon.position.set(p.x, H + ICON_Y - 0.6, p.z);
				icon.userData.base = icon.position.y;
				icon.userData.index = i;
				scene.add(icon);
				spinners.push(icon);

				const light = new T.PointLight(JADE, i === 0 ? 14 : 9, 7, 2);
				light.position.set(p.x, H + 1.6, p.z);
				scene.add(light);
			});

			// --- Lucioles
			const N = 260;
			const arr = new Float32Array(N * 3);
			for (let i = 0; i < N; i++) {
				arr[i * 3] = (Math.random() - 0.5) * 26;
				arr[i * 3 + 1] = Math.random() * 9 + 0.5;
				arr[i * 3 + 2] = (Math.random() - 0.5) * 26;
			}
			const pGeo = new T.BufferGeometry();
			pGeo.setAttribute('position', new T.BufferAttribute(arr, 3));
			const pts = new T.Points(
				pGeo,
				new T.PointsMaterial({
					color: JADE,
					size: 0.07,
					transparent: true,
					opacity: 0.75,
					depthWrite: false,
					blending: T.AdditiveBlending
				})
			);
			scene.add(pts);

			// --- Caméra : stations
			const stationPose = (i: number) => {
				if (i === 0)
					return { pos: new T.Vector3(0, 12, 16), look: new T.Vector3(0, 0.5, 0) };
				const c = specials[i];
				const dir = c.clone().setY(0).normalize();
				return {
					pos: c.clone().addScaledVector(dir, 7.5).add(new T.Vector3(0, 5.2, 0)),
					look: c.clone().add(new T.Vector3(0, 2.6, 0))
				};
			};
			let target = stationPose(0);
			const camPos = target.pos.clone();
			const camLook = target.look.clone();
			camera.position.copy(camPos);
			goTo = (i) => (target = stationPose(i));

			// --- Interaction
			const mouse = new T.Vector2();
			const pointer = { x: 0, y: 0 };
			const ray = new T.Raycaster();
			let hovered = -1;

			const el = renderer.domElement;
			const onMove = (e: PointerEvent) => {
				const r = el.getBoundingClientRect();
				mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
				pointer.x = mouse.x;
				pointer.y = mouse.y;
			};
			const pick = () => {
				ray.setFromCamera(mouse, camera);
				const h = ray.intersectObjects(hits, false)[0];
				return h ? (h.object.userData.index as number) : -1;
			};
			const onClick = (e: PointerEvent) => {
				onMove(e);
				const i = pick();
				if (i >= 0) go(i);
			};
			el.addEventListener('pointermove', onMove);
			el.addEventListener('click', onClick as unknown as EventListener);

			const resize = () => {
				const w = canvasHost.clientWidth;
				const h = canvasHost.clientHeight;
				renderer.setSize(w, h);
				camera.aspect = w / h;
				// décale la scène vers la droite pour laisser la place au panneau
				if (w >= 900) camera.setViewOffset(w, h, -w * 0.14, 0, w, h);
				else camera.clearViewOffset();
				camera.updateProjectionMatrix();
			};
			resize();
			const ro = new ResizeObserver(resize);
			ro.observe(canvasHost);

			// --- Boucle
			const clock = new T.Clock();
			const tmp = new T.Vector3();
			const tick = () => {
				raf = requestAnimationFrame(tick);
				const dt = Math.min(clock.getDelta(), 0.1);
				const t = clock.elapsedTime;

				// pulsation des tuiles autour de la cible regardée
				for (let i = 0; i < tiles.length; i++) {
					const tl = tiles[i];
					const d = tl.pos.distanceTo(camLook);
					const wave = Math.sin(t * 1.2 - d * 0.7) * 0.5 + 0.5;
					const h = tl.h + wave * 0.18 * Math.exp(-d * 0.12);
					dummy.position.set(tl.pos.x, h / 2 - 0.5, tl.pos.z);
					dummy.scale.set(1, h + 0.5, 1);
					dummy.updateMatrix();
					mesh.setMatrixAt(i, dummy.matrix);
				}
				mesh.instanceMatrix.needsUpdate = true;

				for (const s of spinners) {
					s.rotation.y = t * 0.6;
					if (s.userData.base !== undefined) s.position.y = s.userData.base + Math.sin(t * 1.4 + s.userData.index) * 0.15;
				}
				const pa = pGeo.attributes.position as THREE.BufferAttribute;
				for (let i = 0; i < N; i++) {
					pa.setY(i, ((arr[i * 3 + 1] + t * 0.15 * (0.4 + (i % 5) * 0.2)) % 9.5) + 0.3);
				}
				pa.needsUpdate = true;

				// caméra : interpolation + parallaxe souris
				camPos.lerp(target.pos, 1 - Math.exp(-dt * 2.6));
				camLook.lerp(target.look, 1 - Math.exp(-dt * 3));
				tmp.copy(camPos);
				tmp.x += pointer.x * 0.8;
				tmp.y += pointer.y * 0.4;
				camera.position.copy(tmp);
				camera.lookAt(camLook);

				const idx = pick();
				if (idx !== hovered) {
					hovered = idx;
					el.style.cursor = idx >= 0 ? 'pointer' : 'grab';
				}
				platforms.forEach((p, i) => {
					const m = p.material as THREE.MeshStandardMaterial;
					const on = i === station || i === hovered;
					m.emissiveIntensity += ((on ? 0.7 : 0.18) - m.emissiveIntensity) * 0.1;
				});

				// repères HTML projetés sur les cellules
				cells.forEach((_, i) => {
					const pin = pins[i];
					if (!pin) return;
					const p = specials[i + 1];
					tmp.set(p.x, 1.4 + ICON_Y + 0.9, p.z).project(camera);
					const vis = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
					pin.style.opacity = vis && station !== i + 1 ? '1' : '0';
					pin.style.pointerEvents = vis && station !== i + 1 ? 'auto' : 'none';
					pin.style.transform = `translate(-50%,-50%) translate(${((tmp.x + 1) / 2) * canvasHost.clientWidth}px, ${((1 - tmp.y) / 2) * canvasHost.clientHeight}px)`;
				});

				renderer.render(scene, camera);
			};
			tick();
			ready = true;

			cleanup = () => {
				cancelAnimationFrame(raf);
				ro.disconnect();
				el.removeEventListener('pointermove', onMove);
				el.removeEventListener('click', onClick as unknown as EventListener);
				scene.traverse((o) => {
					const m = o as THREE.Mesh;
					m.geometry?.dispose?.();
					const mat = m.material as THREE.Material | THREE.Material[] | undefined;
					if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
					else mat?.dispose?.();
				});
				renderer.dispose();
				// eslint-disable-next-line svelte/no-dom-manipulating
				renderer.domElement.remove();
			};
		})();

		return () => {
			disposed = true;
			cancelAnimationFrame(raf);
			cleanup();
		};
	});

	const current = $derived(station === 0 ? null : cells[station - 1]);
</script>

<svelte:window onkeydown={onKey} />

<div class="world" role="region" aria-label="Exploration 3D de la ruche Ketsuna">
	<div class="canvas" bind:this={canvasHost}></div>

	{#each cells as c, i (c.name)}
		<button
			class="pin"
			bind:this={pins[i]}
			onclick={() => go(i + 1)}
			aria-label={`Aller à ${c.name}`}>{c.name}</button
		>
	{/each}

	{#if !ready}<p class="loading">Chargement de la ruche…</p>{/if}

	<header class="top">
		<a class="brand" href="/">Ketsuna</a>
	</header>

	<section class="panel" aria-live="polite">
		{#if current}
			<p class="tag">{current.tag} · {current.status}</p>
			<h2>{current.name}</h2>
			<p class="desc">{current.description}</p>
			<a class="cta" href={current.href} target="_blank" rel="noreferrer">{current.cta} →</a>
		{:else}
			<p class="tag">{mission.eyebrow}</p>
			<h2>{mission.headline}</h2>
			<p class="desc">{mission.statement}</p>
			<ul class="principles">
				{#each mission.principles as p (p.title)}
					<li><strong>{p.title}.</strong> {p.text}</li>
				{/each}
			</ul>
			<p class="hint">Cliquez sur une cellule, ou utilisez les flèches pour explorer.</p>
		{/if}
	</section>

	<nav class="controls" aria-label="Navigation de l'exploration">
		<button onclick={prev} aria-label="Précédent">←</button>
		<div class="dots">
			{#each stations as label, i (label)}
				<button
					class:on={i === station}
					onclick={() => go(i)}
					aria-label={label}
				></button>
			{/each}
		</div>
		<button onclick={next} aria-label="Suivant">→</button>
	</nav>
</div>

<style>
	.world {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: #0b0e10;
		color: #e8edef;
		overflow: hidden;
	}

	.canvas {
		position: absolute;
		inset: 0;
	}

	.loading {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		margin: 0;
		color: #9aa5ab;
	}

	.top {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
	}

	.brand {
		color: #2fd49b;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-decoration: none;
	}

	.controls button,
	.pin {
		font: inherit;
		color: inherit;
		cursor: pointer;
	}

	.pin {
		position: absolute;
		left: 0;
		top: 0;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		border: 1px solid #2fd49b;
		background: rgba(11, 14, 16, 0.75);
		font-size: 0.8rem;
		font-weight: 700;
		white-space: nowrap;
		transition: opacity 0.3s;
		opacity: 0;
		will-change: transform;
	}

	.panel {
		position: absolute;
		left: 1.25rem;
		bottom: 5.5rem;
		width: min(27rem, calc(100% - 2.5rem));
		padding: 1.25rem 1.5rem;
		max-height: 55vh;
		overflow-y: auto;
		border-radius: 0.9rem;
		background: rgba(18, 22, 25, 0.78);
		border: 1px solid #262c30;
		backdrop-filter: blur(10px);
	}

	.panel h2 {
		margin: 0.25rem 0 0.75rem;
		font-size: clamp(1.25rem, 2.6vw, 1.75rem);
		line-height: 1.2;
	}

	.tag {
		margin: 0;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		color: #2fd49b;
		font-weight: 700;
	}

	.desc {
		margin: 0;
		color: #b3bdc2;
		line-height: 1.6;
	}

	.principles {
		margin: 1rem 0 0;
		padding-left: 1.1rem;
		color: #9aa5ab;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.principles strong {
		color: #e8edef;
	}

	.hint {
		margin: 1rem 0 0;
		font-size: 0.8rem;
		color: #6d7a81;
	}

	.cta {
		display: inline-block;
		margin-top: 1rem;
		color: #2fd49b;
		font-weight: 700;
		text-decoration: none;
	}

	.cta:hover {
		text-decoration: underline;
	}

	.controls {
		position: absolute;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		background: rgba(18, 22, 25, 0.78);
		border: 1px solid #262c30;
		backdrop-filter: blur(10px);
	}

	.controls > button {
		background: none;
		border: 0;
		font-size: 1.1rem;
		padding: 0.2rem 0.5rem;
	}

	.dots {
		display: flex;
		gap: 0.5rem;
	}

	.dots button {
		width: 0.65rem;
		height: 0.65rem;
		padding: 0;
		border-radius: 50%;
		border: 1px solid #2fd49b;
		background: transparent;
	}

	.dots button.on {
		background: #2fd49b;
	}

	@media (max-width: 700px) {
		.panel {
			bottom: 5rem;
		}
	}
</style>
