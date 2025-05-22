// js/risingSpriteEffect.js

/**
 * @fileoverview Defines the RisingSpriteEffect class for visual effects like a rising angel.
 * Assumes global access to `Sprite` class and `tileSize` constant.
 * The associated image (e.g., `enemyDeadAngelImage`) must be loaded.
 */

/**
 * Represents a sprite effect that rises vertically over time.
 * @class RisingSpriteEffect
 */
class RisingSpriteEffect {
    /**
     * Creates an instance of RisingSpriteEffect.
     * @param {number} startX - The initial x-coordinate on the ground.
     * @param {number} startY - The initial y-coordinate on the ground.
     * @param {HTMLImageElement} image - The image for the sprite effect.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     * @param {number} [riseSpeed=0.5] - The speed at which the sprite rises (pixels per update).
     * @param {number} [duration=3000] - The duration the effect lasts in milliseconds.
     */
    constructor(startX, startY, image, renderingContext, riseSpeed = 0.5, duration = 3000) {
        this.x = startX;
        this.y = startY;
        this.image = image;
        this.renderingContext = renderingContext;

        this.riseSpeed = riseSpeed;
        this.isActive = true;
        this.startTime = Date.now();
        this.duration = duration;

        this.sprite = new Sprite(this.x, this.y, this.image, this.renderingContext);
        this.sprite.worldHeight = tileSize * 0.75; 
        this.sprite.visible = true;
    }

    /**
     * Updates the effect's position and checks for deactivation.
     * Should be called in the game loop.
     */
    update() {
        if (!this.isActive) return;
        this.y -= this.riseSpeed;

        if (this.sprite) {
            this.sprite.x = this.x;
            this.sprite.y = this.y;
        }

        if (Date.now() - this.startTime > this.duration) {
            this.deactivate();
        }
    }

    /**
     * Deactivates the effect, making it invisible and stopping updates.
     * Note: Actual removal from global sprite lists is typically handled externally.
     */
    deactivate() {
        this.isActive = false;
        if (this.sprite) {
            this.sprite.visible = false;
        }
    }
}