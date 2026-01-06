import type { Game } from "../Game";

export abstract class Scene {
    game: Game;

    constructor(game: Game) {
        this.game = game;
    }

    abstract load(): Promise<void>;
    abstract update(): void;
    abstract draw(): void;

    // Optional lifecycle hooks
    enter() {}
    exit() {}
}
