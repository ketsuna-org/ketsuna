<script lang="ts">
    /**
     * KonvaCanvas - SSR-compatible wrapper for svelte-konva Stage
     *
     * This component handles the dynamic import of svelte-konva to prevent
     * SSR errors in SvelteKit. It only renders the canvas on the client side.
     *
     * @prop width - Canvas width in pixels
     * @prop height - Canvas height in pixels
     * @prop onWheel - Wheel event handler for zoom
     * @prop draggable - Enable stage dragging (pan)
     * @prop scaleX - Horizontal scale factor
     * @prop scaleY - Vertical scale factor
     * @prop x - Stage x offset
     * @prop y - Stage y offset
     */
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import type { Snippet } from "svelte";

    interface Props {
        width: number;
        height: number;
        draggable?: boolean;
        scaleX?: number;
        scaleY?: number;
        x?: number;
        y?: number;
        onWheel?: (e: any) => void;
        children?: Snippet;
    }

    let {
        width,
        height,
        draggable = true,
        scaleX = 1,
        scaleY = 1,
        x = 0,
        y = 0,
        onWheel,
        children,
    }: Props = $props();

    // Dynamic module loading for SSR compatibility
    let Stage: any = $state(null);
    let Layer: any = $state(null);
    let isReady = $state(false);

    onMount(async () => {
        if (browser) {
            try {
                const mod = await import("svelte-konva");
                Stage = mod.Stage;
                Layer = mod.Layer;
                isReady = true;
            } catch (err) {
                console.error("Failed to load svelte-konva:", err);
            }
        }
    });
</script>

{#if isReady && Stage && Layer}
    <svelte:component
        this={Stage}
        {width}
        {height}
        {draggable}
        {scaleX}
        {scaleY}
        {x}
        {y}
        onwheel={onWheel}
    >
        <svelte:component this={Layer}>
            {#if children}
                {@render children()}
            {/if}
        </svelte:component>
    </svelte:component>
{:else}
    <div class="konva-loading" style="width: {width}px; height: {height}px;">
        <div class="spinner"></div>
        <p>Chargement du canvas...</p>
    </div>
{/if}

<style>
    .konva-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #0f172a;
        border-radius: 8px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #334155;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .konva-loading p {
        margin-top: 12px;
        color: #94a3b8;
        font-size: 14px;
    }
</style>
