<script lang="ts">
    /**
     * KonvaDepositNode - Canvas-based deposit/resource node using svelte-konva
     *
     * Renders a deposit node with resource icon, name, quantity, and gauge bar.
     */
    import { browser } from "$app/environment";
    import { Group, Rect, Text } from "svelte-konva";

    interface DepositNodeData {
        id: string;
        resourceId: string;
        name: string;
        icon: string;
        quantity: number;
        size?: number;
    }

    interface Props {
        nodeData: DepositNodeData;
        x: number;
        y: number;
        selected?: boolean;
        draggable?: boolean;
        onDragEnd?: (id: string, x: number, y: number) => void;
        onDragMove?: (id: string, x: number, y: number) => void;
        onClick?: (id: string) => void;
    }

    let {
        nodeData,
        x,
        y,
        selected = false,
        draggable = true,
        onDragEnd,
        onDragMove,
        onClick,
    }: Props = $props();

    // Node dimensions
    const WIDTH = 160;
    const HEIGHT = 200;
    const HANDLE_SIZE = 12;
    const CORNER_RADIUS = 8;

    function handleDragEnd(e: any) {
        e.cancelBubble = true;
        if (!onDragEnd) return;
        const pos = e.target.position();
        onDragEnd(nodeData.id, pos.x, pos.y);
    }

    function handleDragMove(e: any) {
        e.cancelBubble = true;
        if (!onDragMove) return;
        const pos = e.target.position();
        onDragMove(nodeData.id, pos.x, pos.y);
    }

    function handleClick() {
        onClick?.(nodeData.id);
    }

    // Colors for deposit (green theme) - reactive to selection
    let colors = $derived({
        bodyBg: "#065f46", // Emerald 800
        bodyBgDark: "#064e3b", // Emerald 900
        border: selected ? "#10b981" : "#065f46",
        borderWidth: selected ? 4 : 2,
        accent: "#10b981",
        text: "#e2e8f0",
        textSubtle: "#9ca3af",
        gaugeBg: "#0f172a",
        gaugeFill: "#10b981",
        handleSource: "#3b82f6",
    });

    // Quantity as percentage (max 10000 for gauge)
    let gaugePercent = $derived(
        Math.min(100, (nodeData.quantity / 10000) * 100),
    );
    let gaugeWidth = $derived((gaugePercent / 100) * (WIDTH - 40));
</script>

{#if browser}
    <Group
        {x}
        {y}
        {draggable}
        ondragend={handleDragEnd}
        ondragmove={handleDragMove}
        onpointerclick={handleClick}
    >
        <!-- Industrial Base Plate -->
        <Rect
            x={0}
            y={0}
            {WIDTH}
            {HEIGHT}
            fill={colors.bodyBgDark}
            stroke={colors.border}
            strokeWidth={colors.borderWidth}
            cornerRadius={4}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.3}
        />

        <!-- Metal Plate Pattern -->
        {#each [[6, 6], [WIDTH - 12, 6], [6, HEIGHT - 12], [WIDTH - 12, HEIGHT - 12]] as [rx, ry]}
            <Rect
                x={rx}
                y={ry}
                width={6}
                height={6}
                fill={colors.border}
                cornerRadius={3}
                listening={false}
            />
        {/each}

        <!-- Extraction Area -->
        <Rect
            x={10}
            y={10}
            width={WIDTH - 20}
            height={HEIGHT - 20}
            fill={colors.bodyBg}
            cornerRadius={2}
        />

        <!-- Hazard Stripes Pattern (Industrial feel) -->
        {#each [0, 1, 2, 3, 4] as i}
            <Rect
                x={10 + i * 30}
                y={10}
                width={15}
                height={HEIGHT - 20}
                fill="rgba(0,0,0,0.1)"
                rotation={15}
                listening={false}
            />
        {/each}

        <!-- Icon Area -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT / 2 - 35}
            text={nodeData.icon?.startsWith("/") ? "⛏️" : nodeData.icon || "⛏️"}
            fontSize={44}
            align="center"
            offsetX={22}
            listening={false}
        />

        <!-- Name Label -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT - 75}
            text={nodeData.name || "Gisement"}
            fontSize={12}
            fontStyle="bold"
            fill={colors.text}
            align="center"
            width={WIDTH - 20}
            offsetX={(WIDTH - 20) / 2}
        />

        <!-- Quantity Display -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT - 60}
            text={`Qté: ${nodeData.quantity?.toLocaleString() || 0}`}
            fontSize={10}
            fill={colors.textSubtle}
            align="center"
            width={WIDTH - 20}
            offsetX={(WIDTH - 20) / 2}
            listening={false}
        />

        <!-- Size Badge -->
        {#if nodeData.size}
            <Rect
                x={WIDTH - 50}
                y={15}
                width={35}
                height={18}
                fill="#0f172a"
                stroke="#10b981"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
            />
            <Text
                x={WIDTH - 32}
                y={19}
                text={`L.${nodeData.size}`}
                fontSize={9}
                fontStyle="bold"
                fill="#10b981"
                align="center"
                offsetX={15}
                listening={false}
            />
        {/if}

        <!-- Quantity Gauge Background -->
        <Rect
            x={20}
            y={HEIGHT - 40}
            width={WIDTH - 40}
            height={12}
            fill={colors.gaugeBg}
            stroke="#1e293b"
            strokeWidth={1}
            cornerRadius={2}
            listening={false}
        />

        <!-- Quantity Gauge Fill -->
        <Rect
            x={20}
            y={HEIGHT - 40}
            width={gaugeWidth}
            height={12}
            fill={colors.gaugeFill}
            cornerRadius={1}
            listening={false}
        />

        <!-- Source Handle (right side) -->
        <Rect
            x={WIDTH}
            y={HEIGHT / 2 - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={colors.handleSource}
            cornerRadius={2}
            stroke="#1e3a8a"
            strokeWidth={2}
        />
    </Group>
{/if}