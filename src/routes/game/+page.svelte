<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Game } from "$lib/game/Game";

  let canvas: HTMLCanvasElement;
  let game: Game;

  onMount(() => {
    if (canvas) {
        game = new Game(canvas);
        game.init();
    }
  });

  onDestroy(() => {
    if (game) {
        game.destroy();
    }
  });

</script>

<svelte:head>
  <title>Ketsuna Game</title>
</svelte:head>

<div class="fixed inset-0 z-50 bg-slate-950 overflow-hidden">
    <canvas bind:this={canvas} class="block w-full h-full"></canvas>
</div>
