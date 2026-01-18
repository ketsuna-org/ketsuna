<script lang="ts">
    /**
     * KonvaEdge - Canvas-based pipe/connection edge using svelte-konva
     *
     * Renders a curved pipe connecting two nodes.
     */
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { Group, Line, Rect } from "svelte-konva";

    interface Props {
        id: string;
        sourceX: number;
        sourceY: number;
        targetX: number;
        targetY: number;
        selected?: boolean;
        resourceColor?: string;
        animOffset?: number;
        onClick?: (id: string) => void;
    }

    let {
        id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        selected = false,
        resourceColor = "#fbbf24",
        animOffset = 0,
        onClick,
    }: Props = $props();

    function handleClick() {
        onClick?.(id);
    }

    // Manhattan Routing (Orthogonal)
    // We create a path that goes: Start -> Mid-X -> Target-Y -> End
    let points = $derived.by(() => {
        const midX = sourceX + (targetX - sourceX) / 2;
        return [
            sourceX, sourceY,          // Start
            midX, sourceY,             // Horizontal to mid
            midX, targetY,             // Vertical to target Y
            targetX, targetY           // Horizontal to target
        ];
    });

    // Calculate total length for item positioning
    let segments = $derived.by(() => {
        const midX = sourceX + (targetX - sourceX) / 2;
        return [
            { x1: sourceX, y1: sourceY, x2: midX, y2: sourceY, len: Math.abs(midX - sourceX) },
            { x1: midX, y1: sourceY, x2: midX, y2: targetY, len: Math.abs(targetY - sourceY) },
            { x1: midX, y1: targetY, x2: targetX, y2: targetY, len: Math.abs(targetX - midX) }
        ];
    });
    
    let totalLength = $derived(segments.reduce((sum, s) => sum + s.len, 0));

    // Get point at distance 'd' along the path
    function getPointAt(d: number) {
        let currentD = d % (totalLength || 1);
        if (currentD < 0) currentD += totalLength;
        
        for (const s of segments) {
            if (currentD <= s.len) {
                const ratio = s.len === 0 ? 0 : currentD / s.len;
                return {
                    x: s.x1 + (s.x2 - s.x1) * ratio,
                    y: s.y1 + (s.y2 - s.y1) * ratio
                };
            }
            currentD -= s.len;
        }
        return { x: targetX, y: targetY };
    }

    // Items to animate
    let itemPositions = $derived.by(() => {
        if (totalLength < 1) return [];
        const count = Math.max(1, Math.floor(totalLength / 40));
        const items = [];
        for (let i = 0; i < count; i++) {
            const d = (i * 40 + animOffset) % totalLength;
            items.push(getPointAt(d));
        }
        return items;
    });

    // Colors
    const colors = {
        belt: "#2d3340",
        beltRail: "#1c1f26",
        selection: "#3b82f6",
    };
</script>

{#if browser}
    <Group onpointerclick={handleClick}>
        <!-- Outer Rail / Border -->
        <Line
            {points}
            stroke={colors.beltRail}
            strokeWidth={14}
            lineCap="round"
            lineJoin="round"
        />

        <!-- Main Belt -->
        <Line
            {points}
            stroke={colors.belt}
            strokeWidth={10}
            lineCap="butt"
            lineJoin="round"
            dash={[5, 5]}
            dashOffset={-animOffset}
        />

        <!-- Selection highlight -->
        {#if selected}
            <Line
                {points}
                stroke={colors.selection}
                strokeWidth={18}
                lineCap="round"
                lineJoin="round"
                opacity={0.3}
            />
        {/if}

        <!-- Animated Items -->
        {#each itemPositions as pos}
            <Rect
                x={pos.x - 4}
                y={pos.y - 4}
                width={8}
                height={8}
                fill={resourceColor}
                cornerRadius={2}
                shadowColor="black"
                shadowBlur={2}
                shadowOpacity={0.5}
            />
        {/each}

        <!-- Hitbox -->
        <Line
            {points}
            stroke="transparent"
            strokeWidth={24}
            lineCap="round"
            lineJoin="round"
        />
    </Group>
{/if}
