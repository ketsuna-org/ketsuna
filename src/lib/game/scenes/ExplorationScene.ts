import { Scene } from "./Scene";
import pb from "$lib/pocketbase";

interface Deposit {
    id: string;
    x: number;
    y: number; // Normalized 0-1
    type: string;
    quality: string;
    abundance: string;
    analyzed: boolean;
}

export class ExplorationScene extends Scene {
    deposits: Deposit[] = [];
    selectedDeposit: Deposit | null = null;

    async load() {
        // Fetch deposits
        // Assuming 'deposits' collection exists. If not, mocked for now.
        // Actually, user wants "my gisement".
        // Let's try to fetch real data or mock if failing.
        try {
            const records = await pb.collection("deposits").getFullList({
                sort: '-created',
            });
            // Map records to visual deposits
            // If records don't have x/y, randomize them based on ID hash
            this.deposits = records.map((r: any) => ({
                id: r.id,
                x: this.pseudoRandom(r.id + "x"),
                y: this.pseudoRandom(r.id + "y"),
                type: r.type || "Unknown",
                quality: r.quality || "Unknown",
                abundance: r.abundance || "Unknown",
                analyzed: r.analyzed || false
            }));
        } catch (e) {
            console.warn("Failed to load deposits, using mock", e);
            this.deposits = Array.from({ length: 10 }).map((_, i) => ({
                id: `mock-${i}`,
                x: Math.random(),
                y: Math.random(),
                type: ["Iron", "Copper", "Gold"][Math.floor(Math.random()*3)],
                quality: ["Low", "Medium", "High"][Math.floor(Math.random()*3)],
                abundance: "Medium",
                analyzed: Math.random() > 0.5
            }));
        }
    }

    pseudoRandom(seed: string) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        return (Math.abs(hash) % 1000) / 1000;
    }

    update() {
        // Animation?
    }

    draw() {
        const { renderer, width, height, input } = this.game;

        renderer.drawText("EXPLORATION MAP", 80, 30, { size: 20, color: "#a5b4fc" });

        // Draw Deposits
        const margin = 100;
        const mapW = width - margin * 2;
        const mapH = height - margin * 2;

        this.deposits.forEach(d => {
            const dx = margin + d.x * mapW;
            const dy = margin + d.y * mapH;
            const radius = 10;

            // Interaction
            const dist = Math.hypot(input.mouse.x - dx, input.mouse.y - dy);
            const hovered = dist < radius + 5;

            if (hovered && input.clicked) {
                this.selectedDeposit = d;
            }

            const color = d.analyzed ? "#4ade80" : "#94a3b8";
            renderer.drawCircle(dx, dy, radius, color, hovered ? "#fff" : undefined);

            if (hovered || d === this.selectedDeposit) {
                 renderer.drawText(d.type, dx, dy + 20, { align: "center", size: 12 });
            }
        });

        // Draw Details Panel
        if (this.selectedDeposit) {
            this.drawDetailsPanel();
        }
    }

    drawDetailsPanel() {
        const { renderer, width, height, input } = this.game;
        const d = this.selectedDeposit!;

        const w = 300;
        const h = 200;
        const x = width - w - 20;
        const y = 100;

        renderer.drawPanel(x, y, w, h);
        renderer.drawText("DEPOSIT DATA", x + w/2, y + 20, { align: "center", size: 16, color: "#fff" });

        let ty = y + 50;
        renderer.drawText(`Type: ${d.type}`, x + 20, ty); ty += 25;
        renderer.drawText(`Quality: ${d.quality}`, x + 20, ty); ty += 25;
        renderer.drawText(`Abundance: ${d.abundance}`, x + 20, ty); ty += 25;
        renderer.drawText(`Status: ${d.analyzed ? "Analyzed" : "Unknown"}`, x + 20, ty, { color: d.analyzed ? "#4ade80" : "#fbbf24" });

        // Close Button
        renderer.drawButton("CLOSE", x + w/2 - 40, y + h - 40, 80, 30, input, () => this.selectedDeposit = null);
    }
}
