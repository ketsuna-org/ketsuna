import { InputManager } from "./Input";
import { Renderer } from "./Renderer";
import type { Scene } from "./scenes/Scene";
import { HQScene } from "./scenes/HQScene";
import { ExplorationScene } from "./scenes/ExplorationScene";
import pb from "$lib/pocketbase";
import { fetchDashboardData, type DashboardData } from "$lib/dashboard";
import { fetchEnergyStatus, type EnergyStatus } from "$lib/services/energy";

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    input: InputManager;
    renderer: Renderer;

    width: number = 0;
    height: number = 0;

    // Global State
    user: any = null;
    dashboardData: DashboardData | null = null;
    energyStatus: EnergyStatus | null = null;

    // Scenes
    currentScene: Scene | null = null;
    scenes: Map<string, Scene> = new Map();

    // Loop & Events
    private animationFrameId: number | null = null;
    private handleResize: () => void;
    private handleMouseMove: (e: MouseEvent) => void;
    private handleMouseDown: () => void;
    private handleMouseUp: () => void;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.input = new InputManager();
        this.renderer = new Renderer(this.ctx);

        // Bind handlers
        this.handleResize = () => this.resize();
        this.handleMouseMove = (e) => this.input.update(canvas.getBoundingClientRect(), e);
        this.handleMouseDown = () => this.input.onMouseDown();
        this.handleMouseUp = () => this.input.onMouseUp();

        this.resize();
        window.addEventListener("resize", this.handleResize);

        canvas.addEventListener("mousemove", this.handleMouseMove);
        canvas.addEventListener("mousedown", this.handleMouseDown);
        canvas.addEventListener("mouseup", this.handleMouseUp);
    }

    async init() {
        this.user = pb.authStore.model;
        if (!this.user) return; // Should redirect in UI layer

        await this.refreshGlobalData();

        // Initialize Scenes
        this.scenes.set("HQ", new HQScene(this));
        this.scenes.set("EXPLORATION", new ExplorationScene(this));

        // Default Scene
        await this.switchScene("HQ");

        this.loop();
    }

    destroy() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener("resize", this.handleResize);
        this.canvas.removeEventListener("mousemove", this.handleMouseMove);
        this.canvas.removeEventListener("mousedown", this.handleMouseDown);
        this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    }

    async refreshGlobalData() {
        if (!this.user) return;
        try {
            this.dashboardData = await fetchDashboardData(this.user.id);
            this.energyStatus = await fetchEnergyStatus();
        } catch (e) {
            console.error("Failed to load global data", e);
        }
    }

    async switchScene(key: string) {
        if (this.currentScene) this.currentScene.exit();

        const scene = this.scenes.get(key);
        if (scene) {
            this.currentScene = scene;
            await scene.load();
            scene.enter();
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.renderer.setSize(this.width, this.height);
    }

    loop() {
        this.update();
        this.draw();
        this.input.reset();
        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }

    update() {
        if (this.currentScene) this.currentScene.update();
    }

    draw() {
        // Clear
        this.renderer.clear();

        // Draw Grid (Global)
        this.drawGrid();

        // Scene
        if (this.currentScene) this.currentScene.draw();

        // Global UI (Nav Deck)
        this.drawNavDeck();
    }

    drawGrid() {
        const { ctx, width, height } = this;
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        const gridSize = 60;
        const offset = (Date.now() / 50) % gridSize;

        ctx.beginPath();
        for(let x = offset; x < width; x+=gridSize) {
          ctx.moveTo(x, 0); ctx.lineTo(x, height);
        }
        for(let y = offset; y < height; y+=gridSize) {
          ctx.moveTo(0, y); ctx.lineTo(width, y);
        }
        ctx.stroke();
    }

    drawNavDeck() {
        const { width, height, renderer } = this;
        // Sidebar on left
        const w = 60; // Collapsed width
        const h = 400;
        const x = 0;
        const y = (height - h) / 2;

        renderer.drawPanel(x, y, w, h, "rgba(15, 23, 42, 0.8)");

        const icons = [
            { icon: "🏠", scene: "HQ", label: "HQ" },
            { icon: "🔭", scene: "EXPLORATION", label: "EXP" },
            { icon: "🛒", scene: "MARKET", label: "MKT" }, // Placeholder
        ];

        let by = y + 10;
        const bh = 50;

        icons.forEach(btn => {
            const isActive = this.currentScene === this.scenes.get(btn.scene);
            const color = isActive ? "#6366f1" : "#334155";

            renderer.drawButton(btn.icon, x + 5, by, w - 10, bh, this.input, () => {
                if (btn.scene !== "MARKET") this.switchScene(btn.scene);
            }, { bg: color });

            by += bh + 10;
        });
    }
}
