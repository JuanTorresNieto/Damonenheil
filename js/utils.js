// js/utils.js

/**
 * Normalizes an angle to be within the range [0, 2π) radians.
 * @param {number} angle - The angle in radians.
 * @returns {number} The normalized angle in radians.
 */
function normalizeAngle(angle) {
	angle = angle % (2 * Math.PI);
	if (angle < 0) {
		angle = (2 * Math.PI) + angle;
	}
	return angle;
}

/**
 * Converts an angle from degrees to radians.
 * @param {number} angleInDegrees - The angle in degrees.
 * @returns {number} The angle in radians.
 */
function degreesToRadians(angleInDegrees) {
	let angleInRadians = angleInDegrees * (Math.PI / 180);
	return angleInRadians;
}

/**
 * Calculates the Euclidean distance between two points (x1, y1) and (x2, y2).
 * @param {number} x1 - The x-coordinate of the first point.
 * @param {number} y1 - The y-coordinate of the first point.
 * @param {number} x2 - The x-coordinate of the second point.
 * @param {number} y2 - The y-coordinate of the second point.
 * @returns {number} The distance between the two points.
 */
function distanceBetweenPoints(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Plays a sound effect from the given source URL.
 * Handles potential errors during audio playback.
 * @param {string} soundSource - The URL of the audio file.
 * @param {number} [volume=0.5] - The volume for the sound effect (0.0 to 1.0).
 */
function playSoundEffect(soundSource, volume = 0.5) {
    try {
        const sound = new Audio(soundSource);
        sound.volume = Math.max(0, Math.min(1, volume));
        sound.play().catch(error => {
            console.warn(`Sound effect ${soundSource} playback failed:`, error.name, error.message);
        });
    } catch (error) {
        console.error(`Error creating Audio object for ${soundSource}:`, error);
    }
}