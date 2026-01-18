<script lang="ts">
    /**
     * KonvaCompanyNode - Canvas-based company headquarters node
     *
     * Renders the company HQ with name, level, balance, and upgrade button.
     */
    import { browser } from "$app/environment";
    import { Group, Rect, Text } from "svelte-konva";

    interface CompanyNodeData {
        id: string;
        name: string;
        level: number;
        balance: number;
        isOwn?: boolean;
    }

    interface Props {
        nodeData: CompanyNodeData;
        x: number;
        y: number;
        selected?: boolean;
        draggable?: boolean;
        onDragEnd?: (id: string, x: number, y: number) => void;
        onDragMove?: (id: string, x: number, y: number) => void;
        onClick?: (id: string) => void;
        onUpgrade?: () => void;
    }

    let {
        nodeData,
        x,
        y,
        selected = false,
        draggable = false,
        onDragEnd,
        onDragMove,
        onClick,
        onUpgrade,
    }: Props = $props();

    // Node dimensions (larger than other nodes)
    const WIDTH = 220;
    const HEIGHT = 280;
    const HANDLE_SIZE = 12;
    const NUM_HANDLES = 5;

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

    // Colors - reactive to selection
    let colors = $derived({
        bodyBg: "#1e293b", // Slate 800
        bodyBgDark: "#0f172a", // Slate 900
        border: selected ? "#fbbf24" : "#334155",
        borderWidth: selected ? 4 : 2,
        accent: "#3b82f6",
        text: "#f8fafc",
        textSubtle: "#94a3b8",
        levelBar: "#3b82f6",
        levelBarBg: "#020617",
        handleTarget: "#ef4444",
        upgradeBg: "#10b981",
        foundationBg: "#020617",
    });

    // Level bars
    let maxLevelBars = 10;
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
        <!-- Heavy Foundation -->
        <Rect
            x={-10}
            y={0}
            width={WIDTH + 20}
            height={HEIGHT}
            fill={colors.foundationBg}
            cornerRadius={4}
            shadowColor="black"
            shadowBlur={15}
            shadowOpacity={0.5}
        />

        <!-- Main Building Structure -->
        <Rect
            x={0}
            y={10}
            width={WIDTH}
            height={HEIGHT - 20}
            fill={colors.bodyBgDark}
            stroke={colors.border}
            strokeWidth={colors.borderWidth}
            cornerRadius={2}
        />

        <!-- Industrial Details / Windows -->
        {#each [0, 1, 2] as row}
            {#each [0, 1, 2, 3] as col}
                <Rect
                    x={25 + col * 45}
                    y={40 + row * 45}
                    width={35}
                    height={35}
                    fill={colors.bodyBg}
                    stroke="rgba(0,0,0,0.3)"
                    strokeWidth={1}
                    cornerRadius={1}
                />
            {/each}
        {/each}

        <!-- Icon Area (Centralized) -->
        <Group x={WIDTH / 2} y={100}>
            <Rect
                x={-35}
                y={-35}
                width={70}
                height={70}
                fill="#0f172a"
                stroke={colors.accent}
                strokeWidth={2}
                cornerRadius={8}
            />
            <Text
                text="🏢"
                fontSize={44}
                align="center"
                offsetX={22}
                offsetY={22}
            />
        </Group>

        <!-- Header / Name -->
        <Text
            x={WIDTH / 2}
            y={180}
            text={nodeData.name || "SIÈGE SOCIAL"}
            fontSize={14}
            fontStyle="bold"
            fill={colors.text}
            align="center"
            width={WIDTH - 30}
            offsetX={(WIDTH - 30) / 2}
        />

        <!-- Level Display -->
        <Text
            x={WIDTH / 2}
            y={205}
            text={`CENTRE DE COMMANDE - NIV.${nodeData.level || 1}`}
            fontSize={10}
            fontStyle="bold"
            fill={colors.accent}
            align="center"
            width={WIDTH - 20}
            offsetX={(WIDTH - 20) / 2}
        />

        <!-- Level Progress Bar -->
        <Rect
            x={30}
            y={225}
            width={WIDTH - 60}
            height={10}
            fill={colors.levelBarBg}
            cornerRadius={5}
        />
        {#each Array(Math.min(nodeData.level || 1, maxLevelBars)) as _, i}
            <Rect
                x={33 + i * ((WIDTH - 66) / maxLevelBars)}
                y={227}
                width={(WIDTH - 66) / maxLevelBars - 2}
                height={6}
                fill={colors.levelBar}
                cornerRadius={1}
            />
        {/each}

        <!-- Balance Info Area -->
        <Rect
            x={20}
            y={HEIGHT - 85}
            width={WIDTH - 40}
            height={30}
            fill="rgba(16, 185, 129, 0.1)"
            stroke="rgba(16, 185, 129, 0.3)"
            strokeWidth={1}
            cornerRadius={4}
        />
        <Text
            x={WIDTH / 2}
            y={HEIGHT - 75}
            text={`💰 ${(nodeData.balance || 0).toLocaleString()} $`}
            fontSize={14}
            fontStyle="bold"
            fill="#10b981"
            align="center"
            width={WIDTH - 40}
            offsetX={(WIDTH - 40) / 2}
        />

        <!-- Input Handles (left side) -->
        {#each Array(NUM_HANDLES) as _, i}
            {@const handleY = 60 + i * ((HEIGHT - 120) / (NUM_HANDLES - 1))}
            <Rect
                x={-HANDLE_SIZE}
                y={handleY - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                fill={colors.handleTarget}
                cornerRadius={2}
                stroke="#991b1b"
                strokeWidth={2}
            />
        {/each}
    </Group>
{/if}