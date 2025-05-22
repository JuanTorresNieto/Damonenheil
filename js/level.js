// js/level.js

/**
 * @fileoverview Defines the Level class for managing game map data and rendering a minimap.
 * Requires `tileSize` from config.js.
 */

/**
 * Represents the game level, managing its layout, dimensions, and collision detection.
 * @class Level
 */
class Level {
    /**
     * Creates an instance of a Level.
     * @param {HTMLCanvasElement} canvasElement - The HTML canvas element (used for dimensions, not direct drawing by this class usually).
     * @param {CanvasRenderingContext2D} renderingContext - The 2D rendering context for drawing the minimap.
     * @param {number[][]} mapLayoutArray - A 2D array representing the map, where 0 is empty space and non-zero is a wall/collision.
     */
    constructor(canvasElement, renderingContext, mapLayoutArray) {
        this.canvasElement = canvasElement;
        this.renderingContext = renderingContext;
        this.mapData = mapLayoutArray;

        /** @type {number} The height of the map in tiles. */
        this.mapHeight = this.mapData.length;
        /** @type {number} The width of the map in tiles. */
        this.mapWidth = this.mapData[0].length;

        /** @type {number} The height of the canvas in pixels. */
        this.canvasPixelHeight = this.canvasElement.height;
        /** @type {number} The width of the canvas in pixels. */
        this.canvasPixelWidth = this.canvasElement.width;

        /** @type {number} The height of each tile in pixels. */
        this.tileHeight = tileSize;
        /** @type {number} The width of each tile in pixels. */
        this.tileWidth = tileSize;
    }

    /**
     * Checks if a specific tile coordinate in the map represents a collision.
     * @param {number} tileX - The x-coordinate of the tile (column index).
     * @param {number} tileY - The y-coordinate of the tile (row index).
     * @returns {boolean} True if the tile is a wall (collision), false otherwise.
     */
    hasCollision(tileX, tileY) {
        let collides = false;
        // Boundary check to prevent out-of-bounds access, implicit in array access but good for clarity
        if (tileY >= 0 && tileY < this.mapHeight && tileX >= 0 && tileX < this.mapWidth) {
            if (this.mapData[tileY][tileX] !== 0) {
                collides = true;
            }
        } else {
            collides = true; // Treat out-of-bounds as collision
        }
        return collides;
    }

    /**
     * Gets the type/value of the tile at the given world (pixel) coordinates.
     * @param {number} worldX - The x-coordinate in pixels.
     * @param {number} worldY - The y-coordinate in pixels.
     * @returns {number} The value of the tile at the specified coordinates (e.g., 0 for empty, 1 for wall).
     * Returns 0 or a designated "out-of-bounds" tile value if coordinates are outside the map.
     */
    getTileValue(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileWidth);
        const tileY = Math.floor(worldY / this.tileHeight);

        if (tileY >= 0 && tileY < this.mapHeight && tileX >= 0 && tileX < this.mapWidth) {
            return this.mapData[tileY][tileX];
        }
        return 0; // Default for out-of-bounds, or handle as error/specific value
    }

    /**
     * Draws a simple representation of the level map (minimap) onto the canvas.
     * Uses the renderingContext provided during construction.
     */
    drawMinimap() {
        let tileFillColor;
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.mapData[y][x] !== 0) {
                    tileFillColor = '#000000'; // Wall color
                } else {
                    tileFillColor = '#666666'; // Floor color
                }
                this.renderingContext.fillStyle = tileFillColor;
                this.renderingContext.fillRect(x * this.tileWidth, y * this.tileHeight, this.tileWidth, this.tileHeight);
            }
        }
    }
}