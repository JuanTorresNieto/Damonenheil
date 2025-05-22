// js/enemyAI.js

/**
 * Represents an enemy entity in the game with AI behavior.
 * Enemies can wander, chase the player, attack, and take damage.
 * @class Enemy
 */
class Enemy {
    /**
     * Creates an instance of an Enemy.
     * Assumes global access to `tileSize`, `gameLevel`, `player`, utility functions 
     * like `normalizeAngle` and `distanceBetweenPoints`, sound functions like `playSoundEffect`,
     * and image assets like `enemyDemonAttackImage`, `demonAttackOrbImage`, `enemyDeadImage`, `enemyDeadAngelImage`.
     * Also assumes global arrays `enemyProjectiles`, `sprites`, `risingEffects`.
     * @param {number} x - The initial x-coordinate of the enemy.
     * @param {number} y - The initial y-coordinate of the enemy.
     * @param {HTMLImageElement} aliveImageSource - The image to use when the enemy is alive and not attacking.
     * @param {CanvasRenderingContext2D} renderingContext - The canvas rendering context.
     * @param {Sprite} [initialSpriteInstance] - An optional pre-existing Sprite instance for this enemy.
     */
    constructor(x, y, aliveImageSource, renderingContext, initialSpriteInstance) {
        this.x = x;
        this.y = y;
        this.renderingContext = renderingContext;

        this.aliveBaseImage = aliveImageSource; 

        if (initialSpriteInstance) {
            this.sprite = initialSpriteInstance;
            this.sprite.image = this.aliveBaseImage; 
        } else {
            this.sprite = new Sprite(this.x, this.y, this.aliveBaseImage, this.renderingContext);
        }
        this.sprite.x = this.x;
        this.sprite.y = this.y;

        this.speed = 0.7;
        this.wanderAngle = Math.random() * 2 * Math.PI;
        this.state = 'wandering'; 

        this.viewDistance = 100;
        this.attackRange = 100;      
        this.attackStopDistance = 100; 
        this.viewAngleSpread = Math.PI / 3; 

        this.wanderChangeInterval = 2000;
        this.lastWanderChangeTime = Date.now();

        this.health = 100;
        this.isAlive = true;

        this.walkCycleDistance = tileSize / 2.5; 
        this.distanceMovedSinceLastFlip = 0;
        this.isSpriteFlipped = false;
        if (this.sprite) {
            this.sprite.flipped = this.isSpriteFlipped;
        }

        this.attackCooldown = 1800; 
        this.lastAttackTime = 0;
        this.attackAnimationDuration = 400; 
        this.isCurrentlyInAttackAnimation = false; 
        this.attackAnimationStartTime = 0;
    }

    /**
     * Checks if the enemy can move to the target coordinates without collision.
     * @param {number} targetX - The target x-coordinate.
     * @param {number} targetY - The target y-coordinate.
     * @returns {boolean} True if the path is clear, false otherwise.
     */
    canMoveTo(targetX, targetY) {
        if (!gameLevel) return false; 
        const checkRadius = tileSize / 4; 
        const pointsToCheck = [
            { x: targetX, y: targetY }, { x: targetX + checkRadius, y: targetY },
            { x: targetX - checkRadius, y: targetY }, { x: targetX, y: targetY + checkRadius },
            { x: targetX, y: targetY - checkRadius },
        ];
        for (const point of pointsToCheck) {
            const tileX = Math.floor(point.x / tileSize);
            const tileY = Math.floor(point.y / tileSize);
            if (tileX < 0 || tileX >= gameLevel.mapWidth || tileY < 0 || tileY >= gameLevel.mapHeight || gameLevel.hasCollision(tileX, tileY)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Moves the enemy by the given delta X and delta Y.
     * Manages walk animation sprite flipping.
     * @param {number} dx - The change in x-coordinate.
     * @param {number} dy - The change in y-coordinate.
     * @returns {boolean} True if the move was successful, false if blocked.
     */
    move(dx, dy) {
        if (!this.isAlive) return false;

        if (this.canMoveTo(this.x + dx, this.y + dy)) {
            this.x += dx;
            this.y += dy;
            this.distanceMovedSinceLastFlip += Math.sqrt(dx * dx + dy * dy);

            if (this.distanceMovedSinceLastFlip >= this.walkCycleDistance) {
                this.isSpriteFlipped = !this.isSpriteFlipped;
                if (this.sprite) {
                    this.sprite.flipped = this.isSpriteFlipped;
                }
                this.distanceMovedSinceLastFlip = 0;
            }
            return true;
        }
        return false;
    }

    /**
     * Handles the enemy's wandering behavior.
     * Changes direction periodically or if an obstacle is hit.
     */
    wander() {
        const currentTime = Date.now();
        if (currentTime - this.lastWanderChangeTime > this.wanderChangeInterval) {
            this.wanderAngle += (Math.random() - 0.5) * (Math.PI / 2);
            this.wanderAngle = normalizeAngle(this.wanderAngle); 
            this.lastWanderChangeTime = currentTime;
        }
        let deltaX = Math.cos(this.wanderAngle) * this.speed;
        let deltaY = Math.sin(this.wanderAngle) * this.speed;
        if (!this.move(deltaX, deltaY)) {
            this.wanderAngle = Math.random() * 2 * Math.PI;
            this.lastWanderChangeTime = currentTime;
        }
    }

    /**
     * Handles the enemy's behavior when chasing the player.
     * Moves towards the player if not in attack range.
     */
    chase() {
        if (!player || !this.isAlive) return; 
        const distanceToPlayer = distanceBetweenPoints(this.x, this.y, player.x, player.y); 

        if (distanceToPlayer <= this.attackStopDistance) {
            this.state = 'attacking'; 
            return;
        }

        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        let deltaX = Math.cos(angleToPlayer) * this.speed;
        let deltaY = Math.sin(angleToPlayer) * this.speed;

        if (!this.move(deltaX, deltaY)) {
            this.state = 'wandering'; 
            this.wanderAngle = Math.random() * 2 * Math.PI;
        }
    }

    /**
     * Handles the enemy's attack behavior.
     * Manages attack cooldown, animation, and projectile firing.
     */
    attack() {
        if (!player || !this.isAlive) return; 
        const currentTime = Date.now();

        if (this.isCurrentlyInAttackAnimation && (currentTime - this.attackAnimationStartTime > this.attackAnimationDuration)) {
            this.isCurrentlyInAttackAnimation = false;
            if (this.sprite && this.aliveBaseImage && this.aliveBaseImage.complete && this.aliveBaseImage.naturalHeight !== 0) {
                this.sprite.image = this.aliveBaseImage;
            }
        }

        const distanceToPlayer = distanceBetweenPoints(this.x, this.y, player.x, player.y); 
        if (distanceToPlayer > this.attackRange || !this.canSeePlayer()) {
            this.state = 'chasing';
            if (this.isCurrentlyInAttackAnimation) {
                this.isCurrentlyInAttackAnimation = false;
                if (this.sprite && this.aliveBaseImage && this.aliveBaseImage.complete && this.aliveBaseImage.naturalHeight !== 0) {
                    this.sprite.image = this.aliveBaseImage;
                }
            }
            return;
        }

        if (currentTime - this.lastAttackTime > this.attackCooldown) {
            this.lastAttackTime = currentTime;
            this.isCurrentlyInAttackAnimation = true;
            this.attackAnimationStartTime = currentTime;

            if (this.sprite && typeof enemyDemonAttackImage !== 'undefined' && enemyDemonAttackImage.complete && enemyDemonAttackImage.naturalHeight !== 0) {
                this.sprite.image = enemyDemonAttackImage;
                this.sprite.flipped = false; 
            } else {
                console.warn("Enemy attack sprite (enemyDemonAttackImage) not ready or loaded!");
                if(typeof enemyDemonAttackImage !== 'undefined') console.log("enemyDemonAttackImage.complete:", enemyDemonAttackImage.complete, "naturalHeight:", enemyDemonAttackImage.naturalHeight);
            }
            
            if (typeof playSoundEffect === 'function') {
                const attackSoundPath = Math.random() < 0.5 ? "music/fireAttack.mp3" : "music/fireAttack2.mp3";
                playSoundEffect(attackSoundPath, 0.35); 
            }

            let canFireProjectile = true;
            let projectileWarningReasons = [];

            if (typeof EnemyProjectile === 'undefined') {
                canFireProjectile = false; projectileWarningReasons.push("EnemyProjectile class is undefined.");
            }
            if (typeof demonAttackOrbImage === 'undefined') {
                canFireProjectile = false; projectileWarningReasons.push("demonAttackOrbImage variable is undefined.");
            } else {
                if (!demonAttackOrbImage.complete) {
                    canFireProjectile = false; projectileWarningReasons.push("demonAttackOrbImage is not complete.");
                }
                if (demonAttackOrbImage.naturalHeight === 0 && demonAttackOrbImage.complete) { 
                    canFireProjectile = false; projectileWarningReasons.push("demonAttackOrbImage loaded but has 0 height (load error?).");
                }
            }
            if (typeof enemyProjectiles === 'undefined') { 
                canFireProjectile = false; projectileWarningReasons.push("Global 'enemyProjectiles' array is undefined.");
            }
            if (!this.renderingContext) {
                canFireProjectile = false; projectileWarningReasons.push("this.renderingContext (canvas context) is undefined for enemy.");
            }

            if (canFireProjectile) {
                const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                const projectileSpeed = 4.5;
                const startOffsetX = Math.cos(angleToPlayer) * (tileSize * 0.4); 
                const startOffsetY = Math.sin(angleToPlayer) * (tileSize * 0.4);

                let newEnemyProjectile = new EnemyProjectile(
                    this.x + startOffsetX, this.y + startOffsetY,
                    angleToPlayer, projectileSpeed, demonAttackOrbImage, this.renderingContext
                );
                enemyProjectiles.push(newEnemyProjectile); 
                sprites.push(newEnemyProjectile.sprite);   
            } else {
                console.warn("Could not fire enemy projectile. Reasons:", projectileWarningReasons.join(" "));
            }
        }
    }

    /**
     * Checks if the enemy has a clear line of sight to the player.
     * @returns {boolean} True if the player is visible, false otherwise.
     */
    canSeePlayer() {
        if (!player || !gameLevel) return false; 
        const distanceToPlayer = distanceBetweenPoints(this.x, this.y, player.x, player.y); 
        if (distanceToPlayer > this.viewDistance) return false;

        const lineOfSightSteps = Math.max(1, Math.floor(distanceToPlayer / (tileSize / 4))); 
        const deltaXStep = (player.x - this.x) / lineOfSightSteps;
        const deltaYStep = (player.y - this.y) / lineOfSightSteps;
        for (let i = 1; i < lineOfSightSteps; i++) {
            const checkX = this.x + deltaXStep * i;
            const checkY = this.y + deltaYStep * i;
            if (gameLevel.hasCollision(Math.floor(checkX / tileSize), Math.floor(checkY / tileSize))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Updates the enemy's state and behavior.
     * This method should be called in the game loop.
     */
    update() {
        if (!this.isAlive) {
            if (this.sprite) {
                if (typeof enemyDeadImage !== 'undefined' && enemyDeadImage.complete && this.sprite.image !== enemyDeadImage) {
                    this.sprite.image = enemyDeadImage;
                }
                this.sprite.flipped = false;
                this.sprite.visible = true;
            }
            return;
        }

        const playerIsVisible = this.canSeePlayer();
        const distanceToPlayer = playerIsVisible ? distanceBetweenPoints(this.x, this.y, player.x, player.y) : Infinity; 

        if (this.state === 'attacking') {
            if (!playerIsVisible || distanceToPlayer > this.attackRange) {
                this.state = 'chasing'; 
                this.isCurrentlyInAttackAnimation = false; 
                if(this.sprite && this.aliveBaseImage && this.aliveBaseImage.complete) this.sprite.image = this.aliveBaseImage;
            }
        } else if (this.state === 'chasing') {
            if (!playerIsVisible) {
                this.state = 'wandering'; 
            } else if (distanceToPlayer <= this.attackStopDistance) {
                this.state = 'attacking'; 
            }
        } else if (this.state === 'wandering') {
            if (playerIsVisible && distanceToPlayer <= this.attackRange) { 
                 if (distanceToPlayer <= this.attackStopDistance) {
                    this.state = 'attacking';
                } else {
                    this.state = 'chasing';
                }
            } else if (playerIsVisible) { 
                this.state = 'chasing';
            }
        }
        
        if (this.state !== 'attacking' && this.isCurrentlyInAttackAnimation) {
            this.isCurrentlyInAttackAnimation = false;
            if (this.sprite && this.aliveBaseImage && this.aliveBaseImage.complete) {
                this.sprite.image = this.aliveBaseImage;
            }
        }

        if (this.state === 'wandering') {
            this.wander();
        } else if (this.state === 'chasing') {
            this.chase();
        } else if (this.state === 'attacking') {
            this.attack();
        }

        if (this.sprite) {
            this.sprite.x = this.x;
            this.sprite.y = this.y;
            if (this.isAlive && !this.isCurrentlyInAttackAnimation && this.sprite.image !== this.aliveBaseImage) {
                if (this.aliveBaseImage && this.aliveBaseImage.complete) {
                    this.sprite.image = this.aliveBaseImage;
                }
            }
        }
    }

    /**
     * Draws the enemy representation on a minimap or debug view.
     * @param {CanvasRenderingContext2D} mapDrawingContext - The context to draw on.
     */
    drawOnMap(mapDrawingContext) {
        if (!mapDrawingContext) return;
        let enemyColor = 'purple'; 
        if (!this.isAlive) { enemyColor = 'darkred'; }
        else if (this.state === 'attacking') { enemyColor = 'red'; }
        else if (this.state === 'chasing') { enemyColor = 'orange'; }
        
        mapDrawingContext.fillStyle = enemyColor;
        mapDrawingContext.beginPath();
        mapDrawingContext.arc(this.x, this.y, tileSize / 4, 0, 2 * Math.PI); 
        mapDrawingContext.fill();
    }

    /**
     * Applies damage to the enemy.
     * Handles death and associated effects.
     * @param {number} damageAmount - The amount of damage to inflict.
     */
    takeDamage(damageAmount) {
        if (!this.isAlive) return;
        this.health -= damageAmount;
        
        if (this.isAlive || this.health <=0) { 
             if (typeof playSoundEffect === 'function') {
                playSoundEffect("music/enemyDamage.mp3", 0.6); 
            }
        }

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            
            if (this.sprite) {
                if (typeof enemyDeadImage !== 'undefined' && enemyDeadImage.complete) {
                    this.sprite.image = enemyDeadImage;
                    this.sprite.flipped = false;
                    this.sprite.visible = true;
                } else {
                    this.sprite.visible = false; 
                }
            }
            if (typeof RisingSpriteEffect !== 'undefined' &&
                typeof enemyDeadAngelImage !== 'undefined' && enemyDeadAngelImage.complete &&
                typeof risingEffects !== 'undefined' && this.renderingContext) {
                let angelDeathEffect = new RisingSpriteEffect(this.x, this.y, enemyDeadAngelImage, this.renderingContext, 0.3, 4000);
                risingEffects.push(angelDeathEffect);
                sprites.push(angelDeathEffect.sprite);
            }
        }
    }
}