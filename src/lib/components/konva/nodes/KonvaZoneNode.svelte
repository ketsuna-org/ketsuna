<script lang="ts">
    /**
     * KonvaZoneNode - Canvas-based zone/boundary node
     *
     * Renders the production zone boundary that contains all other nodes.
     */
    import { browser } from "$app/environment";
    import { Group, Rect, Text } from "svelte-konva";

    interface Props {
        width: number;
        height: number;
        level?: number;
    }

    let { width, height, level = 1 }: Props = $props();

    // Colors
    const colors = {
        fill: "#0f172a", // Darker Slate 900
        stroke: "#1e293b",
        gridLine: "rgba(30, 41, 59, 0.5)",
        gridLineMajor: "rgba(51, 65, 85, 0.3)",
        cornerAccent: "#334155",
        labelBg: "#020617",
        labelText: "#475569",
    };

    // Grid spacing
    const GRID_SIZE = 50;
</script>

{#if browser}
    <Group x={0} y={0}>
        <!-- Industrial Floor -->
        <Rect
            x={0}
            y={0}
            {width}
            {height}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={4}
            cornerRadius={4}
            listening={false}
        />

        <!-- Grid Lines (Optimized) -->
        <!-- We use much fewer lines by only drawing major lines or using a pattern if possible -->
        <!-- For now, we use single Lines which are faster than many Rects -->
        {#each Array(Math.floor(height / (GRID_SIZE * 5)) + 1) as _, i}
            {@const y = i * GRID_SIZE * 5}
            <Line
                points={[0, y, width, y]}
                stroke={colors.gridLineMajor}
                strokeWidth={1}
                listening={false}
            />
        {/each}

        {#each Array(Math.floor(width / (GRID_SIZE * 5)) + 1) as _, i}
            {@const x = i * GRID_SIZE * 5}
            <Line
                points={[x, 0, x, height]}
                stroke={colors.gridLineMajor}
                strokeWidth={1}
                listening={false}
            />
        {/each}

        <!-- Technical Corner Marks -->
        {#each [[0,0,0], [width,0,90], [width,height,180], [0,height,270]] as [cx, cy, rot]}
            <Group x={cx} y={cy} rotation={rot} listening={false}>
                <Rect x={0} y={0} width={40} height={2} fill={colors.cornerAccent} />
                <Rect x={0} y={0} width={2} height={40} fill={colors.cornerAccent} />
                <Rect x={10} y={10} width={4} height={4} fill={colors.cornerAccent} cornerRadius={2} />
            </Group>
        {/each}

        <!-- Zone label / Coordinate system -->
        <Group x={width / 2} y={height - 40} listening={false}>
            <Rect
                x={-100}
                y={0}
                width={200}
                height={20}
                fill={colors.labelBg}
                cornerRadius={10}
                stroke={colors.stroke}
                strokeWidth={1}
            />
            <Text
                x={0}
                y={5}
                text={`PRODUCTION SECTOR LVL.${level} [${width}x${height}]`}
                fontSize={9}
                fontStyle="bold"
                fill={colors.labelText}
                align="center"
                width={200}
                offsetX={100}
            />
        </Group>
    </Group>
{/if}
