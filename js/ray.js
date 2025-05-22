// js/ray.js

/**
 * @fileoverview Defines the Ray class for raycasting calculations.
 * Each ray determines wall intersections and properties for rendering a single screen column.
 * Assumes global access to utility functions like `normalizeAngle` and `distanceBetweenPoints`,
 * configuration constants (e.g., `canvasWidth`, `canvasHeight`, `tileSize`, `FOV_RADIANS_HALF`, lighting params),
 * and game state variables (`gameContext`, `renderMode`, `zBuffer`, `wallTexturesImage`).
 */

/**
 * Represents a single ray cast from the player's position to find wall intersections.
 * @class Ray
 */
class Ray {
    /**
     * Creates an instance of a Ray.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     * @param {Level} gameLevelInstance - The instance of the game level, used for collision detection.
     * @param {number} x - The player's current x-coordinate (origin of the ray).
     * @param {number} y - The player's current y-coordinate (origin of the ray).
     * @param {number} playerAngle - The player's absolute viewing angle in radians.
     * @param {number} relativeAngleOffset - The angle of this ray relative to the player's main viewing angle (center of FOV).
     * @param {number} screenColumn - The screen column index this ray corresponds to.
     */
    constructor(renderingContext, gameLevelInstance, x, y, playerAngle, relativeAngleOffset, screenColumn) {
        this.renderingContext = renderingContext;
        this.gameLevel = gameLevelInstance;
        this.x = x;
        this.y = y;
        this.relativeAngleOffset = relativeAngleOffset;
        this.playerAngle = playerAngle;
        /** @type {number} The absolute angle of the ray in world coordinates, in radians. */
        this.absoluteAngle = normalizeAngle(this.playerAngle + this.relativeAngleOffset);

        /** @type {number} The world x-coordinate of the wall hit by this ray. */
        this.wallHitX = 0;
        /** @type {number} The world y-coordinate of the wall hit by this ray. */
        this.wallHitY = 0;

        this.horizontalWallHitX = 0;
        this.horizontalWallHitY = 0;
        this.verticalWallHitX = 0;
        this.verticalWallHitY = 0;

        this.screenColumn = screenColumn;
        /** @type {number} The fisheye-corrected distance to the wall, used for calculating projection height. */
        this.correctedDistance = 0;
        /** @type {number} The direct, uncorrected Euclidean distance to the wall, used for lighting and Z-buffering. */
        this.directDistance = 0;
        /** @type {number} The x-coordinate of the texture column on the wall texture to render. */
        this.texturePixelX = 0;
        /** @type {number} The ID of the wall texture hit by this ray (from the level map data). */
        this.textureId = 0;

        /** @type {number} Pre-calculated distance from the player (camera) to the projection plane. */
        this.projectionPlaneDistance = (canvasWidth / 2) / Math.tan(FOV_RADIANS_HALF);
    }

    /**
     * Updates the ray's angle based on a new player angle.
     * @param {number} newPlayerAngle - The player's new absolute viewing angle in radians.
     */
    setAngle(newPlayerAngle) {
        this.playerAngle = newPlayerAngle;
        this.absoluteAngle = normalizeAngle(this.playerAngle + this.relativeAngleOffset);
    }

    /**
     * Casts the ray using DDA (Digital Differential Analysis) to find the closest wall intersection.
     * It populates properties like `wallHitX`, `wallHitY`, `directDistance`, `correctedDistance`,
     * `textureId`, and `texturePixelX`.
     */
    cast() {
        let isFacingDown = this.absoluteAngle > 0 && this.absoluteAngle < Math.PI;
        let isFacingLeft = this.absoluteAngle > Math.PI / 2 && this.absoluteAngle < 3 * Math.PI / 2;

        // --- HORIZONTAL GRID LINE INTERSECTIONS ---
        let foundHorizontalHit = false;
        let hIntersectionY = Math.floor(this.y / tileSize) * tileSize; // Y of the first horizontal grid line
        if (isFacingDown) hIntersectionY += tileSize;
        let hAdjacentSide = (hIntersectionY - this.y) / Math.tan(this.absoluteAngle);
        let hIntersectionX = this.x + hAdjacentSide; // X where ray hits the first horizontal grid line

        let hStepY = tileSize;
        if (!isFacingDown) hStepY *= -1;
        let hStepX = tileSize / Math.tan(this.absoluteAngle);
        if ((isFacingLeft && hStepX > 0) || (!isFacingLeft && hStepX < 0)) hStepX *= -1;

        let nextHorizontalX = hIntersectionX;
        let nextHorizontalY = hIntersectionY;

        while (!foundHorizontalHit) {
            let checkCellX = Math.floor(nextHorizontalX / tileSize);
            let checkCellY = isFacingDown ? Math.floor(nextHorizontalY / tileSize) : Math.floor(nextHorizontalY / tileSize) - 1;

            if (checkCellX < 0 || checkCellX >= this.gameLevel.mapWidth || checkCellY < 0 || checkCellY >= this.gameLevel.mapHeight) {
                this.horizontalWallHitX = Infinity; this.horizontalWallHitY = Infinity;
                foundHorizontalHit = true; break;
            }
            if (this.gameLevel.hasCollision(checkCellX, checkCellY)) {
                foundHorizontalHit = true;
                this.horizontalWallHitX = nextHorizontalX;
                this.horizontalWallHitY = nextHorizontalY;
            } else {
                nextHorizontalX += hStepX;
                nextHorizontalY += hStepY;
            }
        }

        // --- VERTICAL GRID LINE INTERSECTIONS ---
        let foundVerticalHit = false;
        let vIntersectionX = Math.floor(this.x / tileSize) * tileSize; // X of the first vertical grid line
        if (!isFacingLeft) vIntersectionX += tileSize;
        let vOppositeSide = (vIntersectionX - this.x) * Math.tan(this.absoluteAngle);
        let vIntersectionY = this.y + vOppositeSide; // Y where ray hits the first vertical grid line

        let vStepX = tileSize;
        if (isFacingLeft) vStepX *= -1;
        let vStepY = tileSize * Math.tan(this.absoluteAngle);
        if ((!isFacingDown && vStepY > 0) || (isFacingDown && vStepY < 0)) vStepY *= -1;

        let nextVerticalX = vIntersectionX;
        let nextVerticalY = vIntersectionY;

        while (!foundVerticalHit) {
            let checkCellX = isFacingLeft ? Math.floor(nextVerticalX / tileSize) - 1 : Math.floor(nextVerticalX / tileSize);
            let checkCellY = Math.floor(nextVerticalY / tileSize);

            if (checkCellX < 0 || checkCellX >= this.gameLevel.mapWidth || checkCellY < 0 || checkCellY >= this.gameLevel.mapHeight) {
                 this.verticalWallHitX = Infinity; this.verticalWallHitY = Infinity;
                 foundVerticalHit = true; break;
            }
            if (this.gameLevel.hasCollision(checkCellX, checkCellY)) {
                foundVerticalHit = true;
                this.verticalWallHitX = nextVerticalX;
                this.verticalWallHitY = nextVerticalY;
            } else {
                nextVerticalX += vStepX;
                nextVerticalY += vStepY;
            }
        }

        let horizontalHitDistance = (this.horizontalWallHitX !== Infinity)
            ? distanceBetweenPoints(this.x, this.y, this.horizontalWallHitX, this.horizontalWallHitY) : Infinity;
        let verticalHitDistance = (this.verticalWallHitX !== Infinity)
            ? distanceBetweenPoints(this.x, this.y, this.verticalWallHitX, this.verticalWallHitY) : Infinity;

        if (horizontalHitDistance < verticalHitDistance) {
            this.wallHitX = this.horizontalWallHitX;
            this.wallHitY = this.horizontalWallHitY;
            this.directDistance = horizontalHitDistance;
            this.texturePixelX = this.wallHitX % tileSize;
            let wallTileY = isFacingDown ? Math.floor(this.wallHitY / tileSize) : Math.floor(this.wallHitY / tileSize) - 1;
            this.textureId = this.gameLevel.getTileValue(Math.floor(this.wallHitX / tileSize), wallTileY);
        } else {
            this.wallHitX = this.verticalWallHitX;
            this.wallHitY = this.verticalWallHitY;
            this.directDistance = verticalHitDistance;
            this.texturePixelX = this.wallHitY % tileSize;
            let wallTileX = isFacingLeft ? Math.floor(this.wallHitX / tileSize) - 1 : Math.floor(this.wallHitX / tileSize);
            this.textureId = this.gameLevel.getTileValue(wallTileX, Math.floor(this.wallHitY / tileSize));
        }

        if (this.directDistance === Infinity) { // No wall hit within map boundaries
            this.directDistance = Number.MAX_SAFE_INTEGER;
            this.correctedDistance = Number.MAX_SAFE_INTEGER;
            zBuffer[this.screenColumn] = this.directDistance; // Store direct distance for z-buffer
            return;
        }

        this.correctedDistance = this.directDistance * Math.cos(this.relativeAngleOffset);
        zBuffer[this.screenColumn] = this.directDistance; // Store direct distance for z-buffer for walls
    }

    /**
     * Renders the wall strip corresponding to this ray onto the canvas.
     * This includes calculating the projected wall height, texture coordinates, and applying lighting.
     */
    renderWallStrip() {
        if (this.directDistance >= Number.MAX_SAFE_INTEGER || this.textureId === 0) return; // Don't render if no hit or empty tile

        let projectedWallHeight = (tileSize / this.correctedDistance) * this.projectionPlaneDistance;
        let screenY0 = (canvasHeight / 2) - (projectedWallHeight / 2); // Top of the wall slice on screen
        let screenX = this.screenColumn; // Screen column to draw on

        const originalTextureHeight = 64;
        const originalTextureWidth = 64;
        let textureSourceX = Math.floor(this.texturePixelX);
        textureSourceX = Math.max(0, Math.min(textureSourceX, originalTextureWidth - 1)); // Clamp to texture bounds

        // Calculate Y offset in the texture atlas (assuming texture IDs are 1-based)
        let textureAtlasOffsetY = (this.textureId - 1) * originalTextureHeight;
        if (textureAtlasOffsetY < 0) textureAtlasOffsetY = 0;

        this.renderingContext.imageSmoothingEnabled = false;

        // Lighting calculation
        const lightRadius = typeof PLAYER_LIGHT_RADIUS !== 'undefined' ? PLAYER_LIGHT_RADIUS : 200;
        const ambientLight = typeof AMBIENT_LIGHT_LEVEL !== 'undefined' ? AMBIENT_LIGHT_LEVEL : 0.1;
        const falloffSharpness = typeof LIGHT_FALLOFF_SHARPNESS !== 'undefined' ? LIGHT_FALLOFF_SHARPNESS : 1.5;

        let brightness = ambientLight; // Start with ambient light
        if (this.directDistance <= lightRadius) { // If wall is within player's light radius
             let normalizedDistance = this.directDistance / lightRadius;
             brightness = ambientLight + (1.0 - ambientLight) * Math.pow(1.0 - normalizedDistance, falloffSharpness);
        }
        brightness = Math.max(ambientLight, Math.min(1.0, brightness)); // Clamp brightness

        // Draw the textured wall strip
        this.renderingContext.drawImage(
            wallTexturesImage,      // Source image (texture atlas)
            textureSourceX,         // X-coordinate of the slice on the source texture
            textureAtlasOffsetY,    // Y-coordinate of the top of the specific texture in the atlas
            1,                      // Width of the slice from the source texture (1 pixel)
            originalTextureHeight,  // Height of the slice from the source texture (full height)
            screenX,                // X-coordinate on the canvas to draw
            screenY0,               // Y-coordinate on the canvas to draw
            1,                      // Width of the slice on the canvas (1 pixel column)
            projectedWallHeight     // Height of the slice on the canvas (scaled)
        );

        // Apply darkness overlay if not fully bright
        if (brightness < 0.999) { // Using a threshold to avoid issues with full brightness
            this.renderingContext.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
            this.renderingContext.fillRect(screenX, screenY0, 1, projectedWallHeight);
        }
    }

    /**
     * Casts the ray and then draws its representation.
     * In 3D mode, it renders a wall strip. In 2D map mode, it draws a line.
     */
    draw() {
        this.cast(); // Perform raycasting calculations

        if (renderMode === 0) { // 3D Raycasting View
            if (this.textureId !== 0) { // Only render if a wall was hit (not an empty tile type)
                this.renderWallStrip();
            }
        } else { // 2D Map View (for debugging)
            let targetX = this.wallHitX;
            let targetY = this.wallHitY;
            if (targetX === Infinity || targetY === Infinity) return; // Don't draw if ray didn't hit anything

            this.renderingContext.beginPath();
            this.renderingContext.moveTo(this.x, this.y); // Ray origin (player position)
            this.renderingContext.lineTo(targetX, targetY); // Line to wall hit point
            this.renderingContext.strokeStyle = "red";
            this.renderingContext.stroke();
        }
    }
}