// js/Sprite.js

/**
 * @fileoverview Defines the Sprite class for representing 2D images in a 3D world.
 * Handles calculation of render data, 3D projection, lighting, and drawing.
 * Assumes global access to `player` object, `renderMode`, `zBuffer`,
 * utility functions like `distanceBetweenPoints`, and configuration constants
 * (FOV, canvas dimensions, tile size, lighting parameters).
 */
class Sprite {
    /**
     * Creates an instance of a Sprite.
     * @param {number} x - The world x-coordinate of the sprite.
     * @param {number} y - The world y-coordinate of the sprite.
     * @param {HTMLImageElement} image - The image to be used for this sprite.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     */
    constructor(x, y, image, renderingContext) {
        this.x = x;
        this.y = y;
        this.image = image;
        this.renderingContext = renderingContext;

        /** @type {number} The direct distance from the player to this sprite. Updated by `calculateRenderData`. */
        this.distanceToPlayer = 0;
        /** @type {number} The angle of this sprite relative to the player's center view direction. Updated by `calculateRenderData`. */
        this.angleRelativeToPlayerView = 0;

        /** @type {boolean} Whether the sprite is fundamentally visible (can be overridden by FOV, occlusion). */
        this.visible = true;
        /** @type {boolean} Whether the sprite's image should be drawn flipped horizontally. */
        this.flipped = false;
        /** 
         * @type {number | undefined} Optional. The sprite's height in world units. 
         * If undefined, `tileSize` is used as default in the draw method.
         */
        this.worldHeight = undefined;
         /** 
         * @type {string | undefined} Optional. The type of the sprite (e.g., 'ammo', 'enemy', 'health'). 
         * Used for interaction logic.
         */
        this.type = undefined;
    }

    /**
     * Calculates data necessary for rendering the sprite, such as its distance
     * and angle relative to the player.
     * Updates `this.distanceToPlayer` and `this.angleRelativeToPlayerView`.
     * @returns {boolean} True if the sprite is within the player's field of view (FOV), false otherwise.
     * Returns false if the player object is not available.
     */
    calculateRenderData() {
        if (!player) {
            this.distanceToPlayer = Infinity;
            return false; 
        }

        this.distanceToPlayer = distanceBetweenPoints(player.x, player.y, this.x, this.y);

        let vectorX = this.x - player.x;
        let vectorY = this.y - player.y;
        let anglePlayerToSprite = Math.atan2(vectorY, vectorX);
        let angleDifference = player.rotationAngle - anglePlayerToSprite;

        if (angleDifference < -Math.PI) angleDifference += 2.0 * Math.PI;
        if (angleDifference > Math.PI) angleDifference -= 2.0 * Math.PI;
        this.angleRelativeToPlayerView = angleDifference;

        return Math.abs(this.angleRelativeToPlayerView) < FOV_RADIANS_HALF;
    }

    /**
     * Draws the sprite on the canvas.
     * Handles 3D projection, lighting, Z-buffering, and optional 2D map representation.
     * The method first calls `calculateRenderData` to determine if the sprite is in FOV.
     */
    draw() {
        if (!this.visible) return;

        const isInFOV = this.calculateRenderData();
        if (!isInFOV) return;

        // Removed 2D map drawing mode stub for brevity, can be added back if needed.

        if (renderMode === 0 && this.renderingContext && this.image && this.image.complete && this.image.naturalHeight !== 0) {
            const projectionPlaneDistance = (canvasWidth / 2) / Math.tan(FOV_RADIANS_HALF);
            const spriteActualWorldHeight = (typeof this.worldHeight !== 'undefined') ? this.worldHeight : tileSize;
            
            const correctedDistanceForProjection = this.distanceToPlayer * Math.cos(this.angleRelativeToPlayerView);
            if (correctedDistanceForProjection <= 0.1) return; // Avoid division by zero or very small numbers

            const spriteScreenHeight = (spriteActualWorldHeight / correctedDistanceForProjection) * projectionPlaneDistance;
            const screenY0 = (canvasHeight / 2) - (spriteScreenHeight / 2); // Top of the sprite on screen

            const originalTextureHeight = this.image.naturalHeight;
            const originalTextureWidth = this.image.naturalWidth;
            const spriteScreenWidth = spriteScreenHeight * (originalTextureWidth / originalTextureHeight);

            const xOffsetFromCenterScreen = Math.tan(-this.angleRelativeToPlayerView) * projectionPlaneDistance;
            const spriteCenterScreenX = (canvasWidth / 2) + xOffsetFromCenterScreen;
            const spriteLeftScreenX = spriteCenterScreenX - (spriteScreenWidth / 2);

            this.renderingContext.imageSmoothingEnabled = false; // For pixel art

            // --- Calculate Brightness ---
            let brightness = 1.0;
            const lightRadius = typeof PLAYER_LIGHT_RADIUS !== 'undefined' ? PLAYER_LIGHT_RADIUS : 200;
            const ambientLight = typeof AMBIENT_LIGHT_LEVEL !== 'undefined' ? AMBIENT_LIGHT_LEVEL : 0.1;
            const falloffSharpness = typeof LIGHT_FALLOFF_SHARPNESS !== 'undefined' ? LIGHT_FALLOFF_SHARPNESS : 1.5;

            if (this.distanceToPlayer > lightRadius) {
                brightness = ambientLight;
            } else if (this.distanceToPlayer > 0) {
                let normalizedDistance = this.distanceToPlayer / lightRadius;
                brightness = ambientLight + (1.0 - ambientLight) * Math.pow(1.0 - normalizedDistance, falloffSharpness);
            }
            brightness = Math.max(ambientLight, Math.min(1.0, brightness)); // Clamp brightness

            this.renderingContext.save();

            // Apply calculated brightness as globalAlpha for the sprite
            this.renderingContext.globalAlpha = brightness;

            const startScreenPixelX = Math.floor(spriteLeftScreenX);
            const endScreenPixelX = Math.floor(spriteLeftScreenX + spriteScreenWidth);

            for (let screenPixelX = startScreenPixelX; screenPixelX < endScreenPixelX; screenPixelX++) {
                if (screenPixelX < 0 || screenPixelX >= canvasWidth) continue; // Clip to screen bounds

                // Check Z-buffer. Sprites should only draw if they are closer than what's already there.
                if (zBuffer[screenPixelX] > correctedDistanceForProjection) {
                    let textureXProportion = (screenPixelX - spriteLeftScreenX) / spriteScreenWidth;
                    let sourceTextureColumn = Math.floor(textureXProportion * originalTextureWidth);

                    if (this.flipped) {
                        sourceTextureColumn = (originalTextureWidth - 1) - sourceTextureColumn;
                    }
                    sourceTextureColumn = Math.max(0, Math.min(originalTextureWidth - 1, sourceTextureColumn));
                    
                    // Draw the 1px wide strip of the sprite.
                    // globalAlpha is already set to 'brightness'.
                    this.renderingContext.drawImage(this.image,
                        sourceTextureColumn, 0, // Source X, Y
                        1, originalTextureHeight, // Source Width, Height (1px wide strip)
                        screenPixelX, screenY0, // Destination X, Y on canvas
                        1, spriteScreenHeight // Destination Width, Height on canvas
                    );

                    // The fillRect overlay for darkening is REMOVED.
                    // Brightness is now handled by globalAlpha on drawImage.
                }
            }
            
            this.renderingContext.restore(); // Restores globalAlpha (and other saved states)
        }
    }
}