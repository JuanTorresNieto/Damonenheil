// js/raycasting.js

/**
 * @file Main game logic file for the Raycasting engine.
 * Handles game initialization, main loop, rendering, input, and object management.
 * Requires: utils.js, config.js, and all class definitions (Level, Ray, Sprite, Player, Enemy, etc.).
 */

var canvas;
var gameContext;

var gameLevel;
var player;
let lastPlayerFireTime = 0;
let playerShootInterval = null;
/** @type {number} 0 for Raycasting 3D view, 1 for 2D Map view. */
var renderMode = 0;
var enemyLaughIntervalId;

// --- Game Assets (Images) ---
var wallTexturesImage;
var armorImage;
var enemyImage;
var enemyDeadImage;
var enemyDemonAttackImage;
var playerAttackOrbImage;
var demonAttackOrbImage;
var hudBackgroundImage;
var playerAttackStateImage;
var playerNeutralStateImage;
var enemyDeadAngelImage;
var ammoPackImage;
var healthPackImage;
var torchFrames = [];
let gameMusicStarted = false;
const NUMBER_OF_TORCH_FRAMES = 8;

// --- Game Object Collections ---
/** @type {Sprite[]} Array of ALL Sprite objects in the game. */
var sprites = [];
/** @type {Enemy[]} Array of Enemy AI/logic objects. */
var enemies = [];
/** @type {Projectile[]} Array of active player Projectile objects. */
var playerProjectiles = [];
/** @type {EnemyProjectile[]} Array for active enemy projectiles. */
var enemyProjectiles = [];
/** @type {RisingSpriteEffect[]} Array of RisingSpriteEffect objects. */
var risingSpriteEffects = [];
/** @type {number[]} Array for Z-buffering, storing distances for each screen column. */
var zBuffer = [];

// --- Damage Flash Effect ---
var damageFlashAlpha = 0;
var damageFlashStartTime = 0;

// --- Configurable Item/Enemy Quantities (defaults if not in config) ---
const NUMBER_OF_ENEMIES = (typeof NUM_ENEMIES_CONFIG !== 'undefined') ? NUM_ENEMIES_CONFIG : 10;
const NUMBER_OF_AMMO_PACKS = (typeof NUM_AMMO_PACKS_CONFIG !== 'undefined') ? NUM_AMMO_PACKS_CONFIG : 10;
const NUMBER_OF_HEALTH_PACKS = (typeof NUM_HEALTH_PACKS_CONFIG !== 'undefined') ? NUM_HEALTH_PACKS_CONFIG : 3;
const NUMBER_OF_ARMOR_PACKS = (typeof NUM_ARMOR_PACKS_CONFIG !== 'undefined') ? NUM_ARMOR_PACKS_CONFIG : 5;

// --- Torch Animation State ---
var currentTorchFrameIndex = 0;
var lastTorchFrameUpdateTime = 0;

// --- Level Data ---
var levelOneLayout = [
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
	[1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
	[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
	[1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1],
	[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
	[1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
	[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];
let currentlyOccupiedTileCoords = [];


/**
 * Finds a specified number of random empty tile coordinates from the given map layout.
 * @param {number[][]} levelLayout - The 2D array representing the map.
 * @param {number} quantity - The number of empty spots to find.
 * @param {{r: number, c: number}[]} [occupiedCoords=[]] - An array of coordinates already considered occupied.
 * @returns {{r: number, c: number}[]} An array of found empty spot coordinates.
 */
function findRandomEmptySpotCoordinates(levelLayout, quantity, occupiedCoords = []) {
    if (!levelLayout || levelLayout.length === 0 || levelLayout[0].length === 0) {
        console.error("RANDOM_SPOTS: Invalid levelLayout provided.");
        return [];
    }
    let availableEmptySpots = [];
    for (let r = 1; r < levelLayout.length - 1; r++) {
        for (let c = 1; c < levelLayout[0].length - 1; c++) {
            if (levelLayout[r][c] === 0) {
                let isOccupied = occupiedCoords.some(spot => spot.r === r && spot.c === c);
                if (!isOccupied) {
                    availableEmptySpots.push({ r: r, c: c });
                }
            }
        }
    }
    let selectedSpots = [];
    for (let i = 0; i < quantity && availableEmptySpots.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableEmptySpots.length);
        selectedSpots.push(availableEmptySpots.splice(randomIndex, 1)[0]);
    }
    if (selectedSpots.length < quantity) {
        console.warn(`RANDOM_SPOTS: Could only find ${selectedSpots.length}/${quantity} empty spots requested.`);
    }
    return selectedSpots;
}

// --- Keyboard Input Handling ---
document.addEventListener('keydown', function (event) {
    if (!player || (player && player.health <= 0 && renderMode === 0)) return;
    if (player && player.health <= 0 && event.keyCode !== 190) return;

    switch (event.keyCode) {
        case 38: player.startMovingForward(); break;    // Up arrow
        case 40: player.startMovingBackward(); break;   // Down arrow
        case 39: player.startTurningRight(); break;     // Right arrow
        case 37: player.startTurningLeft(); break;      // Left arrow
        case 32: startPlayerShooting(); break;          // Space bar
    }
});
document.addEventListener('keyup', function (event) {
    if (!player || (player && player.health <= 0 && renderMode === 0)) return;
    if (player && player.health <= 0 && event.keyCode !== 190) return;

    switch (event.keyCode) {
        case 38: player.stopAxialMovement(); break;
        case 40: player.stopAxialMovement(); break;
        case 39: player.stopRotationalMovement(); break;
        case 37: player.stopRotationalMovement(); break;
        case 32: stopPlayerShooting(); break;
        case 190: toggleRenderMode(); break;
    }
});

document.addEventListener('keydown', function (event) {
    if (!gameMusicStarted && player && player.health > 0) {
        const musicElement = document.getElementById('inGameMusic');
        if (musicElement && musicElement.paused) {
            musicElement.volume = 0.25;
            let playPromise = musicElement.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    gameMusicStarted = true;
                }).catch(error => {
                    console.warn("MUSIC: Playback failed even on keydown:", error.name, error.message);
                });
            }
        }
    }
});

// --- Player Shooting Mechanics ---
/**
 * Handles the player firing a projectile.
 * Checks ammo, cooldown, and creates a new projectile.
 */
function firePlayerProjectile() {
    if (!player || player.health <= 0 || !playerAttackOrbImage || !playerAttackOrbImage.complete || !playerAttackOrbImage.naturalHeight || !gameContext) {
        return;
    }
    const currentTime = Date.now();
    if (player.ammo > 0 && (currentTime - lastPlayerFireTime) >= FIRE_COOLDOWN) {
        lastPlayerFireTime = currentTime;
        player.playerActionState = 1;
        player.ammo -= 1;

        if (typeof playSoundEffect === 'function') {
            playSoundEffect("music/magicAttack.mp3", 0.2);
        }

        const projectileSpeed = 3;
        const startOffsetX = Math.cos(player.rotationAngle) * (tileSize * 0.3);
        const startOffsetY = Math.sin(player.rotationAngle) * (tileSize * 0.3);

        let newProjectile = new Projectile(
            player.x + startOffsetX, player.y + startOffsetY,
            player.rotationAngle, projectileSpeed, playerAttackOrbImage, gameContext
        );
        playerProjectiles.push(newProjectile);
        sprites.push(newProjectile.sprite);
    }
}

/** Starts continuous firing if the shoot button is held. */
function startPlayerShooting() {
    if (playerShootInterval || !player || player.health <= 0) return;
    firePlayerProjectile();
    playerShootInterval = setInterval(firePlayerProjectile, FIRE_COOLDOWN);
}

/** Stops continuous firing. */
function stopPlayerShooting() {
    clearInterval(playerShootInterval);
    playerShootInterval = null;
    if (player && player.health > 0) player.playerActionState = 0;
}

/** Toggles between 3D Raycasting view and 2D Map view. */
function toggleRenderMode() {
	renderMode = (renderMode === 0) ? 1 : 0;
}

// --- Canvas Rescaling ---
/** Resizes the canvas element visually on the page (CSS pixels). */
function rescaleCanvas() {
    if (canvas) {
	    canvas.style.width = "800px";
        canvas.style.height = "800px";
    }
}

// --- Object Initialization ---
/** Initializes static sprite objects like ammo and health packs. */
function initializeStaticSprites() {
    if (typeof tileSize === 'undefined' || !gameContext ||
        (typeof armorImage !== 'undefined' && (!armorImage || !armorImage.complete || !armorImage.naturalHeight)) ||
        (typeof ammoPackImage !== 'undefined' && (!ammoPackImage || !ammoPackImage.complete || !ammoPackImage.naturalHeight)) ||
        (typeof healthPackImage !== 'undefined' && (!healthPackImage || !healthPackImage.complete || !healthPackImage.naturalHeight))
    ) {
         console.warn("ASSETS: Item images, context, or tileSize not ready for static sprites. Retrying...");
         setTimeout(initializeStaticSprites, 250); return;
    }

    const numArmor = typeof NUMBER_OF_ARMOR_PACKS !== 'undefined' ? NUMBER_OF_ARMOR_PACKS : 1;
    const numAmmo = typeof NUMBER_OF_AMMO_PACKS !== 'undefined' ? NUMBER_OF_AMMO_PACKS : 4;
    const numHealth = typeof NUMBER_OF_HEALTH_PACKS !== 'undefined' ? NUMBER_OF_HEALTH_PACKS : 3;

    if (armorImage && armorImage.complete && armorImage.naturalHeight) {
        const armorSpots = findRandomEmptySpotCoordinates(levelOneLayout, numArmor, currentlyOccupiedTileCoords);
        armorSpots.forEach(spot => {
            let worldX = spot.c * tileSize + tileSize / 2; let worldY = spot.r * tileSize + tileSize / 2;
            let item = new Sprite(worldX, worldY, armorImage, gameContext);
            item.type = 'armor'; item.worldHeight = tileSize * 0.6; sprites.push(item); currentlyOccupiedTileCoords.push(spot);
        });
    }
    if (ammoPackImage && ammoPackImage.complete && ammoPackImage.naturalHeight) {
        const ammoSpots = findRandomEmptySpotCoordinates(levelOneLayout, numAmmo, currentlyOccupiedTileCoords);
        ammoSpots.forEach(spot => {
            let worldX = spot.c * tileSize + tileSize / 2; let worldY = spot.r * tileSize + tileSize / 2;
            let item = new Sprite(worldX, worldY, ammoPackImage, gameContext);
            item.type = 'ammo'; item.worldHeight = tileSize / 3; sprites.push(item); currentlyOccupiedTileCoords.push(spot);
        });
    }
    if (healthPackImage && healthPackImage.complete && healthPackImage.naturalHeight) {
        const healthSpots = findRandomEmptySpotCoordinates(levelOneLayout, numHealth, currentlyOccupiedTileCoords);
        healthSpots.forEach(spot => {
            let worldX = spot.c * tileSize + tileSize / 2; let worldY = spot.r * tileSize + tileSize / 2;
            let item = new Sprite(worldX, worldY, healthPackImage, gameContext);
            item.type = 'health'; item.worldHeight = tileSize / 2.5; sprites.push(item); currentlyOccupiedTileCoords.push(spot);
        });
    }
}

/** Initializes enemy objects. */
function initializeEnemies() {
    if (typeof tileSize === 'undefined' || !gameContext || !enemyImage || !enemyImage.complete || !enemyImage.naturalHeight) {
        console.warn("ASSETS: Enemy base image, context, or tileSize not ready. Retrying enemy init...");
        setTimeout(initializeEnemies, 250); return;
    }
    if (typeof enemyDemonAttackImage === 'undefined' || typeof enemyDeadImage === 'undefined' || typeof demonAttackOrbImage === 'undefined') {
        console.warn("ASSETS: One or more enemy-specific image variables not declared. Retrying enemy init.");
        setTimeout(initializeEnemies, 250); return;
    }
    if ((!enemyDemonAttackImage || !enemyDemonAttackImage.complete || !enemyDemonAttackImage.naturalHeight) ||
        (!enemyDeadImage || !enemyDeadImage.complete || !enemyDeadImage.naturalHeight) ||
        (!demonAttackOrbImage || !demonAttackOrbImage.complete || !demonAttackOrbImage.naturalHeight)) {
        console.warn("ASSETS: Not all enemy specific images (attack, death, orb) are fully loaded. Retrying enemy init...");
        setTimeout(initializeEnemies, 250); return;
    }

    const numEnemies = typeof NUMBER_OF_ENEMIES !== 'undefined' ? NUMBER_OF_ENEMIES : 5;
    const enemySpots = findRandomEmptySpotCoordinates(levelOneLayout, numEnemies, currentlyOccupiedTileCoords);
    enemySpots.forEach(spot => {
        let worldX = spot.c * tileSize + tileSize / 2; let worldY = spot.r * tileSize + tileSize / 2;
        let enemySpriteInstance = new Sprite(worldX, worldY, enemyImage, gameContext);
        sprites.push(enemySpriteInstance);
        enemies.push(new Enemy(worldX, worldY, enemyImage, gameContext, enemySpriteInstance));
        currentlyOccupiedTileCoords.push(spot);
    });
}

/** Renders all visible sprites using Painter's Algorithm (sorted by distance). */
function renderVisibleSprites() {
    if (!player || !sprites || !sprites.length) return;

    for (let sprite of sprites) {
        if (sprite.visible) {
            sprite.calculateRenderData(player, FOV_RADIANS_HALF, canvasWidth, canvasHeight, tileSize);
        } else {
            sprite.distanceToPlayer = Infinity;
        }
    }
	sprites.sort((obj1, obj2) => obj2.distanceToPlayer - obj1.distanceToPlayer);

	for (let sprite of sprites) {
        if (sprite.visible) {
		    sprite.draw(zBuffer, AMBIENT_LIGHT_LEVEL, PLAYER_LIGHT_RADIUS, LIGHT_FALLOFF_SHARPNESS, player);
        }
	}
}

// --- Asset Loading and Game Initialization ---
let assetsToLoadCount = 0;
let assetsLoadedCount = 0;

/** Callback for successfully loaded asset. */
function onAssetLoaded(assetName) {
    assetsLoadedCount++;
    if (assetsLoadedCount >= assetsToLoadCount) {
        initializeGameObjects();
    }
}
/** Callback for asset load error. */
function onAssetLoadError(assetName, src) {
    console.error(`ASSET_LOAD: FAILURE - Failed to load ${assetName} from ${src}`);
    assetsLoadedCount++;
    if (assetsLoadedCount >= assetsToLoadCount) {
        console.warn("ASSET_LOAD: Proceeding with game initialization despite asset load error(s).");
        initializeGameObjects();
    }
}

/** Initializes core game objects after assets are loaded. */
function initializeGameObjects() {
    if (typeof tileSize === 'undefined' || typeof canvasWidth === 'undefined' || typeof canvasHeight === 'undefined') {
        console.error("INIT_ERROR: Essential config constants (tileSize, canvasWidth, canvasHeight) are undefined. Retrying...");
        setTimeout(initializeGameObjects, 250);
        return;
    }

    gameLevel = new Level(canvas, gameContext, levelOneLayout);
    currentlyOccupiedTileCoords = [];

    let playerStartSpot = findRandomEmptySpotCoordinates(levelOneLayout, 1, currentlyOccupiedTileCoords)[0];
    if (playerStartSpot) {
        player = new Player(gameContext, gameLevel, playerStartSpot.c * tileSize + tileSize/2, playerStartSpot.r * tileSize + tileSize/2);
        currentlyOccupiedTileCoords.push(playerStartSpot);
    } else {
        player = new Player(gameContext, gameLevel, 1.5*tileSize, 1.5*tileSize); // Fallback start position
        currentlyOccupiedTileCoords.push({r: Math.floor(1.5), c: Math.floor(1.5)});
        console.warn("INIT: Player fallback start position used.");
    }

    zBuffer = new Array(canvasWidth).fill(Infinity);
    sprites = []; enemies = []; playerProjectiles = []; enemyProjectiles = []; risingSpriteEffects = [];

    initializeStaticSprites();
    initializeEnemies();

    setInterval(mainGameLoop, 1000 / (typeof FPS !== 'undefined' ? FPS : 50) );
    rescaleCanvas();

    if (typeof playSoundEffect === 'function') {
        const laughIntervalMs = 10000;
        if (enemyLaughIntervalId) clearInterval(enemyLaughIntervalId);
        enemyLaughIntervalId = setInterval(() => {
            if (player && player.health > 0 && enemies.some(e => e.isAlive)) {
                playSoundEffect("music/enemyLaugh.mp3", 0.25);
            }
        }, laughIntervalMs);
    }

    const musicElement = document.getElementById('inGameMusic');
    if (musicElement) {
        musicElement.volume = 0.25;
        let playPromise = musicElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                gameMusicStarted = true;
            }).catch(error => {
            });
        }
    } else {
        console.warn("MUSIC: inGameMusic element not found in HTML.");
    }
}

/**
 * Main initialization function for the game. Sets up canvas, context, and starts asset loading.
 * This is typically called once when the game is ready to start (e.g., from menu.js).
 */
function initializeGame() {
	canvas = document.getElementById('canvas');
	if (!canvas) { console.error("SETUP: Canvas element not found!"); return; }
	gameContext = canvas.getContext('2d');
	if (!gameContext) { console.error("SETUP: Failed to get 2D context!"); return; }

    if (typeof canvasWidth === 'undefined' || typeof canvasHeight === 'undefined') {
        console.error("SETUP_ERROR: canvasWidth or canvasHeight from config.js is undefined. Retrying...");
        setTimeout(initializeGame, 250);
        return;
    }
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;

    const imageAssetDefinitions = [
        { varName: 'wallTexturesImage', src: "img/walls.png" },
        { varName: 'hudBackgroundImage', src: "img/hud_background.png" },
        { varName: 'playerAttackStateImage', src: "img/attack_player.png" },
        { varName: 'playerNeutralStateImage', src: "img/neutral_player.png" },
        { varName: 'enemyImage', src: "img/enemyDemon.png" },
        { varName: 'armorImage', src: "img/armor.png" },
        { varName: 'enemyDeadImage', src: "img/enemyDemonDead.png" },
        { varName: 'playerAttackOrbImage', src: "img/playerAttackOrb.png" },
        { varName: 'enemyDeadAngelImage', src: "img/enemyDeadAngel.png" },
        { varName: 'ammoPackImage', src: "img/ammoPack.png" },
        { varName: 'healthPackImage', src: "img/healthPack.png" },
        { varName: 'enemyDemonAttackImage', src: "img/enemyDemonAttack.png" },
        { varName: 'demonAttackOrbImage', src: "img/demonAttackOrb.png" }
    ];
    assetsToLoadCount = imageAssetDefinitions.length + NUMBER_OF_TORCH_FRAMES;
    assetsLoadedCount = 0;

    if (assetsToLoadCount === 0) { initializeGameObjects(); return; }

    imageAssetDefinitions.forEach(assetInfo => {
        window[assetInfo.varName] = new Image();
        window[assetInfo.varName].onload = () => onAssetLoaded(assetInfo.varName);
        window[assetInfo.varName].onerror = () => onAssetLoadError(assetInfo.varName, assetInfo.src);
        window[assetInfo.varName].src = assetInfo.src;
    });

    for (let i = 0; i < NUMBER_OF_TORCH_FRAMES; i++) {
        let frameImage = new Image();
        let frameName = `torchFrame${i + 1}`;
        frameImage.onload = () => {
            onAssetLoaded(frameName);
        };
        frameImage.onerror = () => {
            onAssetLoadError(frameName, `img/torch/torch${i + 1}.png`);
        };
        frameImage.src = `img/torch/torch${i + 1}.png`;
        torchFrames[i] = frameImage;
    }
}

// --- Drawing Functions ---
/** Clears the entire canvas. */
function clearCanvas() {
    if (gameContext && typeof canvasWidth !== 'undefined' && typeof canvasHeight !== 'undefined') {
        gameContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }
}

/** Draws the floor and ceiling with lighting. */
function drawFloorAndCeiling() {
    if (!gameContext) return;

    const baseAmbient = typeof AMBIENT_LIGHT_LEVEL !== 'undefined' ? AMBIENT_LIGHT_LEVEL : 0.05;

    const ceilingBaseBrightness = Math.floor(baseAmbient * 30);
    const ceilingHex = Math.max(0, Math.min(255, ceilingBaseBrightness)).toString(16).padStart(2, '0');
	gameContext.fillStyle = `#${ceilingHex}${ceilingHex}${ceilingHex}`;
	gameContext.fillRect(0, 0, canvasWidth, canvasHeight / 2);

    const pitchBlackFloor = "#050505";
	gameContext.fillStyle = pitchBlackFloor;
	gameContext.fillRect(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);

    if (renderMode === 0 && player && player.health > 0) {
        const lightScreenX = canvasWidth / 2;
        const gradientCenterY = canvasHeight * 1.0;
        const screenLightRadiusCore = canvasWidth * 0.1;
        const screenLightRadiusMax = canvasWidth * 0.4;

        try {
            var gradient = gameContext.createRadialGradient(
                lightScreenX, gradientCenterY, screenLightRadiusCore,
                lightScreenX, gradientCenterY, screenLightRadiusMax
            );
            const lightR = 180, lightG = 160, lightB = 100;
            gradient.addColorStop(0,    `rgba(${lightR}, ${lightG}, ${lightB}, 0.65)`);
            gradient.addColorStop(0.3,  `rgba(${lightR}, ${lightG}, ${lightB}, 0.50)`);
            gradient.addColorStop(0.7,  `rgba(${lightR}, ${lightG}, ${lightB}, 0.15)`);
            gradient.addColorStop(1,    `rgba(${lightR}, ${lightG}, ${lightB}, 0.00)`);

            gameContext.fillStyle = gradient;
            gameContext.fillRect(0, canvasHeight / 2, canvasWidth, canvasHeight / 2);
        } catch (e) {
            console.error("Error creating or applying floor gradient:", e);
        }
    }
}

/** Draws the Heads-Up Display (HUD). */
function drawHUD() {
    if (!gameContext || !player) return;

    const hudDisplayHeight = 100;

    if (hudBackgroundImage && hudBackgroundImage.complete && hudBackgroundImage.naturalHeight !== 0) {
        gameContext.drawImage(hudBackgroundImage, 0, canvasHeight - hudDisplayHeight, canvasWidth, hudDisplayHeight);
    } else {
        gameContext.fillStyle = "rgba(50, 30, 20, 0.9)";
        gameContext.fillRect(0, canvasHeight - hudDisplayHeight, canvasWidth, hudDisplayHeight);
    }

    const playerIconImg = player.playerActionState === 1 ? playerAttackStateImage : playerNeutralStateImage;
    if (playerIconImg && playerIconImg.complete && playerIconImg.naturalHeight !== 0) {
        const iconWidth = 80, iconHeight = 73;
        const iconPosX = (canvasWidth / 2) - (iconWidth / 2);
        const iconPosY = canvasHeight - hudDisplayHeight + (hudDisplayHeight - iconHeight) / 2 + 3;
        gameContext.drawImage(playerIconImg, 0, 0, 64, 64, iconPosX, iconPosY, iconWidth, iconHeight);
    }

    const hudFont = 'Doom';
    const textColor = '#E0D0B0';
    gameContext.fillStyle = textColor;
    gameContext.shadowColor = 'rgba(0, 0, 0, 0.8)';
    gameContext.shadowOffsetX = 2; gameContext.shadowOffsetY = 2; gameContext.shadowBlur = 2;

    const leftPanelX = 35;
    const ammoY = canvasHeight - hudDisplayHeight + 35;
    const scoreY = canvasHeight - hudDisplayHeight + 65;
    gameContext.font = `bold 34px ${hudFont}`;
    gameContext.textAlign = "center";
    gameContext.fillText(player.ammo, leftPanelX + 25, ammoY + 30);
    gameContext.fillText(player.score, leftPanelX + 117, scoreY);

    const rightPanelX = canvasWidth - 113;
    const healthBarY = canvasHeight - hudDisplayHeight + 45;
    const healthBarWidth = 100, healthBarHeight = 18;
    gameContext.fillStyle = "#402010";
    gameContext.fillRect(rightPanelX, healthBarY, healthBarWidth, healthBarHeight);
    let healthColor = (player.health > 66) ? '#00AA00' : (player.health > 33) ? '#AAAA00' : '#AA0000';
    gameContext.fillStyle = healthColor;
    gameContext.fillRect(rightPanelX + 2, healthBarY + 2, (Math.max(0,player.health)/100) * (healthBarWidth - 4), healthBarHeight - 4);

    gameContext.shadowColor = 'transparent'; gameContext.shadowOffsetX = 0; gameContext.shadowOffsetY = 0; gameContext.shadowBlur = 0;

    if (player.health <= 0) {
        gameContext.fillStyle = "rgba(0, 0, 0, 0.75)";
        gameContext.fillRect(0, 0, canvasWidth, canvasHeight - hudDisplayHeight);
        gameContext.textAlign = "center";
        gameContext.shadowColor = 'black'; gameContext.shadowOffsetX = 3; gameContext.shadowOffsetY = 3; gameContext.shadowBlur = 5;
        gameContext.font = `bold 52px ${hudFont}`;
        gameContext.fillStyle = "red";
        gameContext.fillText("YOU DIED", canvasWidth / 2, canvasHeight / 2 - 30);
        gameContext.shadowColor = 'transparent'; gameContext.shadowOffsetX = 0; gameContext.shadowOffsetY = 0; gameContext.shadowBlur = 0;
    }
}

/** Draws the animated player weapon in the foreground. */
function drawTorchAnimation() {
    if (!gameContext || !torchFrames || torchFrames.length === 0 || !torchFrames[currentTorchFrameIndex]) {
        return;
    }
    const currentFrameImage = torchFrames[currentTorchFrameIndex];
    if (!currentFrameImage.complete || !currentFrameImage.naturalHeight) {
        return;
    }

    const originalWidth = currentFrameImage.naturalWidth;
    const originalHeight = currentFrameImage.naturalHeight;
    const scale = 3.5;
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;
    const posX = (canvasWidth - scaledWidth) / 10;
    const hudDisplayHeight = 120;
    const posY = canvasHeight - scaledHeight - hudDisplayHeight + 20;

    gameContext.imageSmoothingEnabled = false;
    gameContext.drawImage(
        currentFrameImage, 0, 0, originalWidth, originalHeight,
        posX, posY, scaledWidth, scaledHeight
    );
}

// --- Main Game Loop ---
/**
 * The main game loop, called repeatedly by setInterval.
 * Updates game state, handles rendering, and manages game logic.
 */
function mainGameLoop() {
    if (!gameContext || !gameLevel || assetsLoadedCount < assetsToLoadCount) {
        if (gameContext && typeof canvasWidth !== 'undefined' && typeof canvasHeight !== 'undefined') {
            clearCanvas(); gameContext.fillStyle = "black"; gameContext.fillRect(0,0,canvasWidth,canvasHeight);
            gameContext.font = "20px Arial"; gameContext.fillStyle = "white"; gameContext.textAlign = "center";
            gameContext.fillText(`Loading assets... (${assetsLoadedCount}/${assetsToLoadCount})`, canvasWidth/2, canvasHeight/2);
        } return;
    }
    if (!player) { return; }

    if (damageFlashAlpha > 0) {
        const elapsed = Date.now() - damageFlashStartTime;
        const flashDuration = typeof DAMAGE_FLASH_DURATION !== 'undefined' ? DAMAGE_FLASH_DURATION : 250;
        const maxAlpha = typeof DAMAGE_FLASH_MAX_ALPHA !== 'undefined' ? DAMAGE_FLASH_MAX_ALPHA : 0.4;
        damageFlashAlpha = (elapsed < flashDuration) ? maxAlpha * (1 - (elapsed / flashDuration)) : 0;
        damageFlashAlpha = Math.max(0, damageFlashAlpha);
    }

    const currentTime = Date.now();
    const torchAnimSpeed = typeof TORCH_ANIMATION_SPEED !== 'undefined' ? TORCH_ANIMATION_SPEED : 80;
    if (currentTime - lastTorchFrameUpdateTime > torchAnimSpeed) {
        currentTorchFrameIndex++;
        if (currentTorchFrameIndex >= NUMBER_OF_TORCH_FRAMES) {
            currentTorchFrameIndex = 0;
        }
        lastTorchFrameUpdateTime = currentTime;
    }

    if (player.health > 0) {
        player.update();
    }
    enemies.forEach(enemy => enemy.update());

    const updateAndFilterActiveItems = (itemArray, globalSpriteList) => itemArray.filter(item => {
        item.update();
        if (!item.isActive && item.sprite) {
            const spriteIndex = globalSpriteList.indexOf(item.sprite);
            if (spriteIndex > -1) globalSpriteList.splice(spriteIndex, 1);
        }
        return item.isActive;
    });
    playerProjectiles = updateAndFilterActiveItems(playerProjectiles, sprites);
    enemyProjectiles = updateAndFilterActiveItems(enemyProjectiles, sprites);
    risingSpriteEffects = updateAndFilterActiveItems(risingSpriteEffects, sprites);

	clearCanvas();
    zBuffer.fill(Infinity);

	if (renderMode === 1) {
		if(gameLevel) gameLevel.drawMinimap();
        if(player) player.draw();
        enemies.forEach(e => e.drawOnMap(gameContext));
        if(gameContext) {
            playerProjectiles.forEach(p => { if(p.isActive){gameContext.fillStyle='cyan';gameContext.beginPath();gameContext.arc(p.x,p.y,p.radius||3,0,2*Math.PI);gameContext.fill();}});
            enemyProjectiles.forEach(ep => { if(ep.isActive){gameContext.fillStyle='magenta';gameContext.beginPath();gameContext.arc(ep.x,ep.y,ep.radius||3,0,2*Math.PI);gameContext.fill();}});
        }
        if(sprites.length > 0) renderVisibleSprites();
	} else {
		if(gameContext) drawFloorAndCeiling();
        if(player) player.draw();
        if(sprites.length > 0) renderVisibleSprites();
	}

    if (damageFlashAlpha > 0 && renderMode === 0) {
        gameContext.fillStyle = `rgba(255, 0, 0, ${damageFlashAlpha})`;
        gameContext.fillRect(0, 0, canvasWidth, canvasHeight - 100); 
    }

    if (renderMode === 0 && player && player.health > 0) {
        drawTorchAnimation();
    }

	if(gameContext && player) drawHUD();
}