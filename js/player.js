// js/player.js

/**
 * @fileoverview Defines the Player class, responsible for player movement, view, interactions, and state.
 * Assumes global access to `normalizeAngle`, `degreesToRadians`, `distanceBetweenPoints` (from utils.js),
 * `FOV_RADIANS`, `FOV_RADIANS_HALF`, `canvasWidth`, `tileSize` (from config.js),
 * `Ray` class, `gameLevel` object, `renderMode` variable, `sprites` array,
 * `playSoundEffect` function, and window globals for damage flash effect.
 */

/**
 * Represents the player in the game.
 * @class Player
 */
class Player {
    /**
     * Creates an instance of Player.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     * @param {Level} gameLevelInstance - The instance of the game level.
     * @param {number} x - The initial x-coordinate of the player.
     * @param {number} y - The initial y-coordinate of the player.
     */
    constructor(renderingContext, gameLevelInstance, x, y) {
        this.renderingContext = renderingContext;
        this.gameLevel = gameLevelInstance;
        this.x = x;
        this.y = y;

        /** @type {number} Indicates forward (1), backward (-1), or no axial movement (0). */
        this.movementInput = 0;
        /** @type {number} Indicates right (1), left (-1), or no rotation (0). */
        this.rotationInput = 0;
        /** @type {number} The player's current rotation angle in radians. */
        this.rotationAngle = 0;
        /** @type {number} The speed at which the player rotates, in radians per update. */
        this.rotationSpeed = degreesToRadians(2);
        /** @type {number} The speed at which the player moves, in units per update. */
        this.movementSpeed = 2;

        /** @type {number} The number of rays to cast for rendering the 3D view. */
        this.numberOfRays = canvasWidth;
        /** @type {Ray[]} An array of Ray objects used for rendering. */
        this.rays = [];

        const angleIncrement = FOV_RADIANS / this.numberOfRays;
        let currentRayAngleOffset = -FOV_RADIANS_HALF;

        for (let i = 0; i < this.numberOfRays; i++) {
            this.rays[i] = new Ray(this.renderingContext, this.gameLevel, this.x, this.y, this.rotationAngle, currentRayAngleOffset, i);
            currentRayAngleOffset += angleIncrement;
        }

        /** @type {number} The player's current health. */
        this.health = 100;
        /** @type {number} The player's current ammunition count. */
        this.ammo = 10;
        /** @type {number} The player's current score. */
        this.score = 0;
        /** @type {number} The player's current action state (e.g., 0 for neutral, 1 for shooting). */
        this.playerActionState = 0;
    }

    /** Sets movement input to forward. */
    startMovingForward() { this.movementInput = 1; }
    /** Sets movement input to backward. */
    startMovingBackward() { this.movementInput = -1; }
    /** Sets rotation input to right. */
    startTurningRight() { this.rotationInput = 1; }
    /** Sets rotation input to left. */
    startTurningLeft() { this.rotationInput = -1; }
    /** Resets axial movement input. */
    stopAxialMovement() { this.movementInput = 0; }
    /** Resets rotational movement input. */
    stopRotationalMovement() { this.rotationInput = 0; }

    /**
     * Checks for collision at the given world coordinates.
     * @param {number} worldX - The x-coordinate to check.
     * @param {number} worldY - The y-coordinate to check.
     * @returns {boolean} True if there is a collision, false otherwise.
     */
    checkCollision(worldX, worldY) {
        let collides = false;
        const tileX = Math.floor(worldX / this.gameLevel.tileWidth);
        const tileY = Math.floor(worldY / this.gameLevel.tileHeight);

        if (tileX < 0 || tileX >= this.gameLevel.mapWidth || tileY < 0 || tileY >= this.gameLevel.mapHeight) {
            return true;
        }
        if (this.gameLevel.hasCollision(tileX, tileY)) {
            collides = true;
        }
        return collides;
    }

    /**
     * Applies damage to the player.
     * @param {number} amount - The amount of damage to take.
     */
    takeDamage(amount) {
        if (this.health <= 0) return;

        this.health -= amount;

        if (typeof playSoundEffect === 'function') {
            playSoundEffect("music/damage.mp3", 0.3);
        }

        if (typeof window.damageFlashAlpha !== 'undefined' && typeof window.DAMAGE_FLASH_MAX_ALPHA !== 'undefined' && typeof window.damageFlashStartTime !== 'undefined') {
            window.damageFlashAlpha = window.DAMAGE_FLASH_MAX_ALPHA;
            window.damageFlashStartTime = Date.now();
        }

        if (this.health <= 0) {
            this.health = 0;
        }
    }

    /**
     * Updates the player's state, including position, rotation, and interactions.
     * This method should be called once per game loop.
     */
    update() {
        const newX = this.x + this.movementInput * Math.cos(this.rotationAngle) * this.movementSpeed;
        const newY = this.y + this.movementInput * Math.sin(this.rotationAngle) * this.movementSpeed;

        if (!this.checkCollision(newX, newY)) {
            this.x = newX;
            this.y = newY;
        }

        this.rotationAngle += this.rotationInput * this.rotationSpeed;
        this.rotationAngle = normalizeAngle(this.rotationAngle);

        if (typeof sprites !== 'undefined' && sprites.length > 0) {
            const playerPickupRadius = tileSize / 2;

            for (let i = sprites.length - 1; i >= 0; i--) {
                let sprite = sprites[i];

                if (sprite.visible && sprite.type) {
                    const distance = distanceBetweenPoints(this.x, this.y, sprite.x, sprite.y);

                    if (distance < playerPickupRadius) {
                        if (sprite.type === 'ammo') {
                            this.ammo += 10;
                            sprite.visible = false;
                        } else if (sprite.type === 'health') {
                            const healthToGain = 25;
                            if (this.health < 100) {
                                this.health = Math.min(100, this.health + healthToGain);
                                sprite.visible = false;
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < this.numberOfRays; i++) {
            this.rays[i].x = this.x;
            this.rays[i].y = this.y;
            this.rays[i].setAngle(this.rotationAngle);
        }
    }

    /**
     * Draws the player's view (by casting rays) and optionally the player on a 2D map.
     * Assumes `update()` has been called prior in the game loop.
     */
    draw() {
        for (let i = 0; i < this.numberOfRays; i++) {
            this.rays[i].draw();
        }

        if (typeof renderMode !== 'undefined' && renderMode === 1) {
            this.renderingContext.fillStyle = '#FFFFFF';
            this.renderingContext.fillRect(this.x - 3, this.y - 3, 6, 6);

            const targetX = this.x + Math.cos(this.rotationAngle) * 20;
            const targetY = this.y + Math.sin(this.rotationAngle) * 20;
            this.renderingContext.beginPath();
            this.renderingContext.moveTo(this.x, this.y);
            this.renderingContext.lineTo(targetX, targetY);
            this.renderingContext.strokeStyle = "#FFFFFF";
            this.renderingContext.stroke();
        }
    }
}