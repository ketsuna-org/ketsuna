import type { InputManager } from "./Input";

export class Renderer {
    ctx: CanvasRenderingContext2D;
    width: number = 0;
    height: number = 0;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
    }

    setSize(w: number, h: number) {
        this.width = w;
        this.height = h;
    }

    clear(color: string = "#020617") {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawText(text: string, x: number, y: number, options?: { size?: number, color?: string, align?: CanvasTextAlign, font?: string }) {
        const { size = 16, color = "#fff", align = "left", font = "monospace" } = options || {};
        this.ctx.font = `bold ${size}px ${font}`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(text, x, y);
    }

    drawButton(text: string, x: number, y: number, w: number, h: number, input: InputManager, action: () => void, options?: { bg?: string, hover?: string, text?: string }) {
        const { bg = "#334155", hover = "#6366f1", text: textColor = "#fff" } = options || {};

        const mx = input.mouse.x;
        const my = input.mouse.y;
        const isHovered = mx >= x && mx <= x + w && my >= y && my <= y + h;

        if (isHovered) {
            document.body.style.cursor = "pointer";
            if (input.clicked) action();
        }

        this.ctx.fillStyle = isHovered ? hover : bg;
        this.ctx.fillRect(x, y, w, h);

        // Border
        this.ctx.strokeStyle = isHovered ? "#fff" : "rgba(255,255,255,0.1)";
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);

        this.drawText(text, x + w / 2, y + h / 2, { color: textColor, align: "center", size: 14 });
    }

    drawPanel(x: number, y: number, w: number, h: number, color: string = "rgba(30, 41, 59, 0.9)") {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
        this.ctx.strokeStyle = "rgba(255,255,255,0.1)";
        this.ctx.strokeRect(x, y, w, h);
    }

    drawCircle(x: number, y: number, radius: number, color: string, stroke?: string) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (stroke) {
            this.ctx.strokeStyle = stroke;
            this.ctx.stroke();
        }
    }
}
