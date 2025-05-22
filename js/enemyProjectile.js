// js/enemyProjectile.js

/**
 * @fileoverview Defines the EnemyProjectile class for projectiles fired by enemies.
 * Assumes global access to `Sprite` class, `distanceBetweenPoints` utility,
 * `player` object, `tileSize` constant, and `gameLevel` object.
 */

/**
 * Represents a projectile fired by an enemy.
 * @class EnemyProjectile
 */
class EnemyProjectile {
    /**
     * Creates an instance of EnemyProjectile.
     * @param {number} startX - The initial x-coordinate.
     * @param {number} startY - The initial y-coordinate.
     * @param {number} angle - The angle of movement in radians.
     * @param {number} speed - The speed of the projectile.
     * @param {HTMLImageElement} image - The image for the projectile's sprite.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     */
    constructor(startX, startY, angle, speed, image, renderingContext) {
        this.x = startX;
        this.y = startY;
        this.angle = angle;
        this.speed = speed;
        this.image = image;
        this.renderingContext = renderingContext;

        this.radius = tileSize / 9; 
        this.isActive = true;

        this.sprite = new Sprite(this.x, this.y, this.image, this.renderingContext);
        this.sprite.worldHeight = tileSize / 3.5; 
        this.sprite.visible = true;
    }

    /**
     * Updates the projectile's position and checks for collisions.
     * Should be called in the game loop.
     */
    update() {
        if (!this.isActive) return;

        const deltaX = Math.cos(this.angle) * this.speed;
        const deltaY = Math.sin(this.angle) * this.speed;
        this.x += deltaX;
        this.y += deltaY;

        if (this.sprite) {
            this.sprite.x = this.x;
            this.sprite.y = this.y;
        }

        this.checkWallCollision();
        this.checkPlayerCollision();
        this.checkOutOfBounds();
    }

    /**
     * Checks if the projectile has collided with a wall in the game level.
     * Deactivates the projectile on collision.
     */
    checkWallCollision() {
        if (!this.isActive || !gameLevel) return;
        const tileX = Math.floor(this.x / tileSize);
        const tileY = Math.floor(this.y / tileSize);
        if (tileX < 0 || tileX >= gameLevel.mapWidth || tileY < 0 || tileY >= gameLevel.mapHeight || gameLevel.hasCollision(tileX, tileY)) {
            this.deactivate();
        }
    }

    /**
     * Checks if the projectile has collided with the player.
     * Deactivates the projectile and damages the player on collision.
     */
    checkPlayerCollision() {
        if (!this.isActive || !player || !player.health) return; 

        const distance = distanceBetweenPoints(this.x, this.y, player.x, player.y);
        const playerCollisionRadius = tileSize / 3; 

        if (distance < this.radius + playerCollisionRadius) {
            this.deactivate();
            player.takeDamage(2); 
        }
    }

    /**
     * Checks if the projectile has gone out of the game bounds.
     * Deactivates the projectile if it's out of bounds.
     */
    checkOutOfBounds() {
        if (!this.isActive || !gameLevel) return;
        if (this.x < -tileSize || this.x > gameLevel.mapWidth * tileSize + tileSize ||
            this.y < -tileSize || this.y > gameLevel.mapHeight * tileSize + tileSize) {
            this.deactivate();
        }
    }

    /**
     * Deactivates the projectile, making it invisible and stopping updates.
     */
    deactivate() {
        this.isActive = false;
        if (this.sprite) {
            this.sprite.visible = false;
        }
    }
}