import { Scene } from "./Scene";
import { levelUpCompany } from "$lib/services/company";
import type { Company } from "$lib/pocketbase";
import pb from "$lib/pocketbase";

export class HQScene extends Scene {
    rotation: number = 0;
    particles: Array<{x: number, y: number, vx: number, vy: number, life: number, color: string}> = [];

    async load() {
        // Data is global in Game, maybe refresh it?
        await this.game.refreshGlobalData();
    }

    update() {
        this.rotation += 0.005;
        this.updateParticles();
    }

    draw() {
        if (!this.game.dashboardData) return;
        this.drawBase();
        this.drawHUD();
        this.drawParticles();
    }

    drawBase() {
        const { renderer, width, height, input, ctx } = this.game;
        const data = this.game.dashboardData!;

        const cx = width / 2;
        const cy = height / 2;
        const radius = 80;

        const dist = Math.hypot(input.mouse.x - cx, input.mouse.y - cy);
        const hovered = dist < radius;

        if (hovered) {
            document.body.style.cursor = "pointer";
            if (input.clicked) this.handleLevelUp();
        }

        // Glow
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 2.5);
        gradient.addColorStop(0, hovered ? "rgba(99, 102, 241, 0.4)" : "rgba(99, 102, 241, 0.1)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(cx, cy, radius * 2.5, 0, Math.PI*2); ctx.fill();

        // Ring
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotation);
        ctx.strokeStyle = hovered ? "#818cf8" : "#4f46e5";
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 10]);
        ctx.beginPath(); ctx.arc(0, 0, radius + 10, 0, Math.PI*2); ctx.stroke();
        ctx.restore();

        // Circle
        renderer.drawCircle(cx, cy, radius, "#0f172a", hovered ? "#fff" : "#6366f1");

        // Text
        renderer.drawText(data.company.name.substring(0, 12).toUpperCase(), cx, cy - 10, { align: "center", size: 16 });
        renderer.drawText(`LVL ${data.company.level}`, cx, cy + 10, { align: "center", size: 14, color: "#94a3b8" });
    }

    drawHUD() {
        const { renderer, width, height, dashboardData } = this.game;
        if (!dashboardData) return;

        renderer.drawPanel(0, 0, width, 60);

        let x = 80; // Offset for Sidebar
        renderer.drawText(`CASH: ${this.formatMoney(dashboardData.financials.cash)}`, x, 30, { color: "#4ade80" });
        x += 200;
        renderer.drawText(`VAL: ${this.formatMoney(dashboardData.financials.valuation)}`, x, 30, { color: "#60a5fa" });
        x += 200;
        renderer.drawText(`PROFIT: ${this.formatMoney(dashboardData.financials.monthly_net_profit)}`, x, 30, {
            color: dashboardData.financials.monthly_net_profit >= 0 ? "#4ade80" : "#ef4444"
        });
    }

    async handleLevelUp() {
        const data = this.game.dashboardData;
        if (!data) return;

        const cost = Math.floor(1000 * Math.pow(data.company.level, 1.5));
        if (data.financials.cash < cost) {
            this.spawnParticles(this.game.width/2, this.game.height/2, 20, "#ef4444");
            return;
        }

        try {
            this.spawnParticles(this.game.width/2, this.game.height/2, 50, "#fbbf24");
            const companyFull = await pb.collection("companies").getOne(data.company.id);
            await levelUpCompany(companyFull as unknown as Company, cost);
            await this.game.refreshGlobalData();
        } catch (e) {
            console.error(e);
        }
    }

    spawnParticles(x: number, y: number, count: number, color: string) {
        for(let i=0; i<count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    }

    updateParticles() {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if(p.life <= 0) this.particles.splice(i, 1);
        }
    }

    drawParticles() {
        const { ctx } = this.game;
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    formatMoney(val: number): string {
        if (Math.abs(val) >= 1_000_000) return (val/1_000_000).toFixed(1) + "M€";
        if (Math.abs(val) >= 1_000) return (val/1_000).toFixed(0) + "k€";
        return val.toFixed(0) + "€";
    }
}
