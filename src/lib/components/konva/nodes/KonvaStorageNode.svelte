<script lang="ts">
    /**
     * KonvaStorageNode - Canvas-based storage node using svelte-konva
     *
     * Renders a storage/warehouse node for holding items.
     */
    import { browser } from "$app/environment";
    import { Group, Rect, Text } from "svelte-konva";

    interface StorageNodeData {
        id: string;
        name: string;
        icon?: string;
        capacity?: number;
        used?: number;
    }

    interface Props {
        nodeData: StorageNodeData;
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
    const WIDTH = 140;
    const HEIGHT = 140;
    const HANDLE_SIZE = 12;

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

    // Colors (cyan/teal theme) - reactive to selection
    let colors = $derived({
        bodyBg: "#0e7490", // Cyan 700
        bodyBgDark: "#083344", // Cyan 900
        border: selected ? "#22d3ee" : "#155e75",
        borderWidth: selected ? 4 : 2,
        accent: "#22d3ee",
        text: "#f1f5f9",
        textSubtle: "#94a3b8",
        handleSource: "#3b82f6",
        handleTarget: "#ef4444",
    });

    // Capacity usage
    let usagePercent = $derived(
        nodeData.capacity && nodeData.used
            ? Math.min(100, (nodeData.used / nodeData.capacity) * 100)
            : 0,
    );
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
        <!-- Industrial Base -->
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

        <!-- Rivets / Bolts -->
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

        <!-- Storage Bin Area -->
        <Rect
            x={10}
            y={10}
            width={WIDTH - 20}
            height={HEIGHT - 20}
            fill={colors.bodyBg}
            cornerRadius={2}
        />

        <!-- Storage Icon -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT / 2 - 25}
            text={nodeData.icon || "📦"}
            fontSize={44}
            align="center"
            offsetX={22}
            listening={false}
        />

        <!-- Name -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT - 55}
            text={nodeData.name || "Stockage"}
            fontSize={12}
            fontStyle="bold"
            fill={colors.text}
            align="center"
            width={WIDTH - 16}
            offsetX={(WIDTH - 16) / 2}
        />

        <!-- Capacity info -->
        {#if nodeData.capacity}
            <Text
                x={WIDTH / 2}
                y={HEIGHT - 40}
                text={`${nodeData.used || 0}/${nodeData.capacity}`}
                fontSize={10}
                fill={colors.textSubtle}
                align="center"
                width={WIDTH - 16}
                offsetX={(WIDTH - 16) / 2}
                listening={false}
            />

            <!-- Usage bar background -->
            <Rect
                x={20}
                y={HEIGHT - 25}
                width={WIDTH - 40}
                height={10}
                fill="#0c4a6e"
                stroke="#1e293b"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
            />

            <!-- Usage bar fill -->
            <Rect
                x={20}
                y={HEIGHT - 25}
                width={(WIDTH - 40) * (usagePercent / 100)}
                height={10}
                fill="#22d3ee"
                cornerRadius={1}
                listening={false}
            />
        {/if}

        <!-- Target Handle (left - input) -->
        <Rect
            x={-HANDLE_SIZE}
            y={HEIGHT / 2 - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={colors.handleTarget}
            cornerRadius={2}
            stroke="#991b1b"
            strokeWidth={2}
        />

        <!-- Source Handle (right - output) -->
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