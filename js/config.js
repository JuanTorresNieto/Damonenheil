// js/config.js

const FPS = 60;

const canvasWidth = 500;
const canvasHeight = 500;

const tileSize = 50;

const FOV_DEGREES = 60;
const FOV_RADIANS = degreesToRadians(FOV_DEGREES);
const FOV_RADIANS_HALF = degreesToRadians(FOV_DEGREES / 2);

const FIRE_COOLDOWN = 200;

const PLAYER_LIGHT_RADIUS = 150;
const AMBIENT_LIGHT_LEVEL = 0.01; 
const LIGHT_FALLOFF_SHARPNESS = 0.9;