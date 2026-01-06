export interface Point {
    x: number;
    y: number;
}

export class InputManager {
    mouse: Point = { x: 0, y: 0 };
    isDown: boolean = false;
    clicked: boolean = false;

    // Track clicked position to separate drag from click
    clickStart: Point = { x: 0, y: 0 };

    update(rect: DOMRect, e: MouseEvent) {
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    onMouseDown() {
        this.isDown = true;
        this.clickStart = { ...this.mouse };
    }

    onMouseUp() {
        this.isDown = false;
        // Simple click detection (could add distance check)
        this.clicked = true;
    }

    reset() {
        this.clicked = false;
    }
}
