<script lang="ts">
    /**
     * KonvaMachineNode - Canvas-based machine node using svelte-konva
     *
     * Renders a machine node with icon, name, progress bar, and connection handles.
     * Supports dragging, selection, and click events.
     */
    import { browser } from "$app/environment";
    import { Group, Rect, Text } from "svelte-konva";

    interface MachineNodeData {
        id: string;
        name: string;
        icon: string;
        itemId?: string;
        progress?: number;
    }

    interface Props {
        nodeData: MachineNodeData;
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
    const HEIGHT = 180;
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

    // Colors - industrial palette
    let colors = $derived({
        bodyBg: "#334155", // Slate 700
        bodyBgDark: "#1e293b", // Slate 800
        border: selected ? "#fbbf24" : "#475569",
        borderWidth: selected ? 4 : 2,
        accent: "#3b82f6",
        text: "#f8fafc",
        progressBg: "#0f172a",
        progressFill: "#fbbf24",
        handleSource: "#3b82f6",
        handleTarget: "#ef4444",
    });

    // Progress bar width
    let progressWidth = $derived((nodeData.progress || 0) * (WIDTH - 40));
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
        <!-- Industrial Base / Plate -->
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

        <!-- Metal Plate Pattern (corners) -->
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

        <!-- Internal Machinery Area -->
        <Rect
            x={10}
            y={10}
            width={WIDTH - 20}
            height={HEIGHT - 20}
            fill={colors.bodyBg}
            cornerRadius={2}
        />

        <!-- Ventilator / Grill design -->
        {#each [0, 1, 2, 3] as i}
            <Rect
                x={20}
                y={25 + i * 10}
                width={WIDTH - 40}
                height={4}
                fill="rgba(0,0,0,0.2)"
                listening={false}
            />
        {/each}

        <!-- Icon / Status Area -->
        <Group x={WIDTH / 2} y={HEIGHT / 2 - 10} listening={false}>
            <Text
                text={nodeData.icon?.startsWith("/") ? "⚙️" : nodeData.icon || "⚙️"}
                fontSize={48}
                align="center"
                offsetX={24}
                offsetY={24}
            />
        </Group>

        <!-- Name Label -->
        <Text
            x={WIDTH / 2}
            y={HEIGHT - 65}
            text={nodeData.name || "Machine"}
            fontSize={12}
            fontStyle="bold"
            fill={colors.text}
            align="center"
            width={WIDTH - 20}
            offsetX={(WIDTH - 20) / 2}
        />

        <!-- Progress Bar Background -->
        {#if (nodeData.progress || 0) > 0}
            <Rect
                x={20}
                y={HEIGHT - 40}
                width={WIDTH - 40}
                height={12}
                fill={colors.progressBg}
                stroke="#1e293b"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
            />

            <!-- Progress Bar Fill -->
            <Rect
                x={20}
                y={HEIGHT - 40}
                width={progressWidth}
                height={12}
                fill={colors.progressFill}
                cornerRadius={1}
                listening={false}
            />
        {/if}

        <!-- Source Handle (right side - blue) -->
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

        <!-- Target Handle (left side - red) -->
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
    </Group>
{/if}
