const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sounds = new GameSounds();

class PlayerSkin {
    constructor(baseColor, accentColor, accessory) {
        this.baseColor = baseColor;
        this.accentColor = accentColor;
        this.accessory = accessory; // 'hat', 'glasses', 'cape'
        this.headGradient = {
            light: '#FFE0C4',
            dark: '#FFB088'
        };
    }

    getAccessoryPath(ctx) {
        ctx.strokeStyle = this.accentColor;
        ctx.lineWidth = 2;

        switch(this.accessory) {
            case 'hat':
                // Top hat
                ctx.beginPath();
                ctx.rect(-8, -this.radius - 25, 16, 5);
                ctx.rect(-6, -this.radius - 35, 12, 10);
                ctx.fillStyle = this.accentColor;
                ctx.fill();
                ctx.stroke();
                break;
            case 'glasses':
                // Cool glasses
                ctx.beginPath();
                ctx.arc(-4, -this.radius - 10, 3, 0, Math.PI * 2);
                ctx.moveTo(4, -this.radius - 10);
                ctx.arc(4, -this.radius - 10, 3, 0, Math.PI * 2);
                ctx.moveTo(-1, -this.radius - 10);
                ctx.lineTo(1, -this.radius - 10);
                ctx.stroke();
                break;
            case 'cape':
                // Flowing cape
                ctx.beginPath();
                ctx.moveTo(-this.radius, -5);
                ctx.quadraticCurveTo(
                    -this.radius - 15, 10,
                    -this.radius - 10, 25
                );
                ctx.quadraticCurveTo(
                    -this.radius - 5, 20,
                    -this.radius, 15
                );
                ctx.fillStyle = this.accentColor;
                ctx.fill();
                ctx.stroke();
                break;
        }
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'speed' or 'shield'
        this.radius = 15;
        this.active = true;
        this.bobHeight = 0;
        this.bobSpeed = 0.05;
        this.bobTime = Math.random() * Math.PI * 2;
    }

    draw() {
        if (!this.active) return;

        this.bobTime += this.bobSpeed;
        this.bobHeight = Math.sin(this.bobTime) * 5;

        ctx.save();
        ctx.translate(this.x, this.y + this.bobHeight);

        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        if (this.type === 'speed') {
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
        } else {
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Icon
        ctx.beginPath();
        if (this.type === 'speed') {
            // Lightning bolt
            ctx.moveTo(-5, -8);
            ctx.lineTo(2, -2);
            ctx.lineTo(-2, 2);
            ctx.lineTo(5, 8);
            ctx.strokeStyle = '#00FFFF';
        } else {
            // Shield
            ctx.arc(0, 0, 8, 0, Math.PI * 1.5);
            ctx.strokeStyle = '#FFD700';
        }
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    checkCollision(player) {
        if (!this.active) return false;
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        return Math.sqrt(dx * dx + dy * dy) < (this.radius + player.radius);
    }
}

class Player {
    constructor(x, y, color, controls, skin) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = color;
        this.controls = controls;
        this.baseSpeed = 5;
        this.speed = this.baseSpeed;
        this.alive = true;
        this.score = 0;
        this.facing = 1;
        this.walkFrame = 0;
        this.lastMoveTime = 0;
        this.hasShield = false;
        this.shieldTime = 0;
        this.speedBoostTime = 0;
        this.isRagdoll = false;
        this.ragdollTime = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.gravity = 0.5;
        this.friction = 0.98;
        this.skin = skin || new PlayerSkin(color, this.darkenColor(color, 30), 'none');
    }

    update() {
        // Update power-up timers
        if (this.hasShield && Date.now() > this.shieldTime) {
            this.hasShield = false;
        }
        if (this.speed > this.baseSpeed && Date.now() > this.speedBoostTime) {
            this.speed = this.baseSpeed;
        }

        // Check ragdoll recovery
        if (this.isRagdoll && Date.now() > this.ragdollTime) {
            this.isRagdoll = false;
            this.velocityX = 0;
            this.velocityY = 0;
            this.rotation = 0;
            this.rotationSpeed = 0;
        }
    }

    applyPowerUp(type) {
        if (type === 'speed') {
            this.speed = this.baseSpeed * 1.5;
            this.speedBoostTime = Date.now() + 5000; // 5 seconds
        } else if (type === 'shield') {
            this.hasShield = true;
            this.shieldTime = Date.now() + 5000; // 5 seconds
        }
    }

    hit(explosionX, explosionY, explosionRadius) {
        if (this.isRagdoll) return;

        if (this.hasShield) {
            this.hasShield = false;
            return;
        }

        // Calculate direction and distance from explosion
        const dx = this.x - explosionX;
        const dy = this.y - explosionY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate explosion force based on distance (stronger when closer)
        const force = (1 - (distance / explosionRadius)) * 30;

        // Normalize direction vector
        const dirX = dx / distance;
        const dirY = dy / distance;

        // Apply velocity in direction away from explosion with some randomness
        this.velocityX = dirX * force * (0.8 + Math.random() * 0.4);
        this.velocityY = dirY * force * (0.8 + Math.random() * 0.4);

        // Add rotation based on impact angle
        this.rotationSpeed = (Math.atan2(dy, dx) + Math.random() * 0.5 - 0.25) * 0.2;

        // Enter ragdoll state with recovery timer
        this.isRagdoll = true;
        this.ragdollTime = Date.now() + 5000; // 5 seconds
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.isRagdoll) {
            ctx.rotate(this.rotation);
        } else {
            if (!this.facing) this.facing = 1;
            ctx.scale(this.facing, 1);
        }

        // Draw shield if active
        if (this.hasShield) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Body
        const gradient = ctx.createLinearGradient(-this.radius, -this.radius * 2, this.radius, this.radius * 2);
        gradient.addColorStop(0, this.skin.baseColor);
        gradient.addColorStop(1, this.skin.accentColor);

        // Draw legs with walking animation
        const legOffset = this.isRagdoll ? 0 : Math.sin(this.walkFrame) * 5;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-8, 15 + (legOffset));
        ctx.lineTo(-6, 25 + (legOffset));
        ctx.moveTo(5, 0);
        ctx.lineTo(8, 15 - (legOffset));
        ctx.lineTo(6, 25 - (legOffset));
        ctx.strokeStyle = this.darkenColor(this.skin.baseColor, 40);
        ctx.lineWidth = 4;
        ctx.stroke();

        // Torso
        ctx.beginPath();
        ctx.ellipse(0, -5, this.radius, this.radius * 1.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = this.darkenColor(this.skin.baseColor, 20);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arms
        const armOffset = this.isRagdoll ? 10 : Math.cos(this.walkFrame) * 3;
        ctx.beginPath();
        ctx.moveTo(-this.radius, -5);
        ctx.lineTo(-this.radius - 8, 5 + armOffset);
        ctx.moveTo(this.radius, -5);
        ctx.lineTo(this.radius + 8, 5 - armOffset);
        ctx.strokeStyle = this.darkenColor(this.skin.baseColor, 40);
        ctx.lineWidth = 4;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(0, -this.radius - 10, this.radius * 0.7, 0, Math.PI * 2);
        const headGradient = ctx.createRadialGradient(
            -2, -this.radius - 12,
            1,
            0, -this.radius - 10,
            this.radius * 0.7
        );
        headGradient.addColorStop(0, this.skin.headGradient.light);
        headGradient.addColorStop(1, this.skin.headGradient.dark);
        ctx.fillStyle = headGradient;
        ctx.fill();
        ctx.strokeStyle = '#704214';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw accessory if any
        if (this.skin.accessory !== 'none') {
            this.skin.getAccessoryPath.call(this, ctx);
        }

        // Eyes
        const eyeOffset = this.isRagdoll ? 0 : this.facing * 2;
        ctx.beginPath();
        ctx.arc(-3 + eyeOffset, -this.radius - 10, 2, 0, Math.PI * 2);
        ctx.arc(3 + eyeOffset, -this.radius - 10, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();

        ctx.restore();
    }

    move(keys) {
        if (this.isRagdoll) {
            // Apply physics when in ragdoll state
            this.x += this.velocityX;
            this.y += this.velocityY;
            this.rotation += this.rotationSpeed;

            // Apply gravity and friction
            this.velocityY += this.gravity;
            this.velocityX *= this.friction;
            this.velocityY *= this.friction;
            this.rotationSpeed *= this.friction;

            // Check if player is off screen
            if (this.x < -50 || this.x > canvas.width + 50 ||
                this.y < -50 || this.y > canvas.height + 50) {
                this.alive = false;
                // End game immediately when a player falls
                gameOver = true;
                sounds.playGameOver();
                const gameOverDiv = document.getElementById('gameOver');
                const winner = document.getElementById('winner');
                gameOverDiv.classList.remove('d-none');

                // Determine winner based on who's still alive
                if (this === player1) {
                    winner.textContent = "Player 2 Wins! Player 1 fell off the map!";
                } else {
                    winner.textContent = "Player 1 Wins! Player 2 fell off the map!";
                }
            }

            // Add furniture collision for ragdoll state with bouncing
            furniture.forEach(f => {
                if (f.checkCollision(this)) {
                    // Bounce off furniture with energy loss
                    const bounceCoefficient = 0.6;

                    // Calculate collision normal
                    const centerX = f.x + f.width / 2;
                    const centerY = f.y + f.height / 2;
                    const dx = this.x - centerX;
                    const dy = this.y - centerY;

                    // Determine which side was hit
                    if (Math.abs(dx / f.width) > Math.abs(dy / f.height)) {
                        // Horizontal collision
                        this.velocityX *= -bounceCoefficient;
                        this.x += this.velocityX; // Move away from collision
                    } else {
                        // Vertical collision
                        this.velocityY *= -bounceCoefficient;
                        this.y += this.velocityY; // Move away from collision
                    }

                    // Add some spin on collision
                    this.rotationSpeed *= -0.8;
                    this.rotationSpeed += (Math.random() - 0.5) * 0.2;
                }
            });
            return;
        }

        if (!this.alive) return;

        let newX = this.x;
        let newY = this.y;
        let moving = false;

        if (keys[this.controls.up]) {
            newY -= this.speed;
            moving = true;
        }
        if (keys[this.controls.down]) {
            newY += this.speed;
            moving = true;
        }
        if (keys[this.controls.left]) {
            newX -= this.speed;
            this.facing = -1;
            moving = true;
        }
        if (keys[this.controls.right]) {
            newX += this.speed;
            this.facing = 1;
            moving = true;
        }

        // Boundary checks
        newX = Math.max(this.radius, Math.min(canvas.width - this.radius, newX));
        newY = Math.max(this.radius, Math.min(canvas.height - this.radius, newY));

        // Check furniture collisions with the new position
        let canMove = true;
        let collisionCount = 0;

        furniture.forEach(f => {
            // Create a test object to check collision at new position
            const testPlayer = {
                x: newX,
                y: newY,
                radius: this.radius
            };

            if (f.checkCollision(testPlayer)) {
                // Only allow passing through if player has speed power-up
                if (this.speed > this.baseSpeed) {
                    return; // Skip collision handling
                }

                collisionCount++;
                if (collisionCount > 1) {
                    // Player is trapped between multiple pieces
                    canMove = false;
                } else {
                    // Try to slide along the furniture
                    if (Math.abs(newX - this.x) > Math.abs(newY - this.y)) {
                        newX = this.x; // Maintain X position, only move Y
                    } else {
                        newY = this.y; // Maintain Y position, only move X
                    }
                }
            }
        });

        if (canMove) {
            this.x = newX;
            this.y = newY;
        }

        // Update walking animation
        if (moving && canMove) {
            const now = Date.now();
            if (now - this.lastMoveTime > 50) {
                this.walkFrame += 0.3;
                this.lastMoveTime = now;
                sounds.playMove();
            }
        } else {
            this.walkFrame = 0;
        }
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (1 << 24 | (R < 255 ? (R < 0 ? 0 : R) : 255) << 16 |
            (G < 255 ? (G < 0 ? 0 : G) : 255) << 8 |
            (B < 255 ? (B < 0 ? 0 : B) : 255)).toString(16).slice(1);
    }
}

class Furniture {
    constructor(x, y, type) {
        this.type = type;
        this.setDimensions(type);
        this.x = x;
        this.y = y;
        this.solid = true; // Always solid by default
        this.color = '#8B4513';
        this.rotation = Math.random() * 0.2 - 0.1;
    }

    setDimensions(type) {
        switch (type) {
            case 'desk':
                this.width = 120;
                this.height = 60;
                break;
            case 'chair':
                this.width = 40;
                this.height = 40;
                break;
            case 'bookshelf':
                this.width = 100;
                this.height = 150;
                break;
            case 'table':
                this.width = 150;
                this.height = 80;
                break;
            case 'cabinet':
                this.width = 80;
                this.height = 120;
                break;
            default:
                this.width = 60;
                this.height = 60;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width, this.height);

        // Draw furniture
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Add wood grain effect
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < this.width; i += 10) {
            ctx.beginPath();
            ctx.moveTo(-this.width / 2 + i, -this.height / 2);
            ctx.lineTo(-this.width / 2 + i, this.height / 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    checkCollision(player) {
        // Basic rectangular collision
        const dx = Math.abs((player.x) - (this.x + this.width / 2));
        const dy = Math.abs((player.y) - (this.y + this.height / 2));

        return dx < (this.width / 2 + player.radius) && dy < (this.height / 2 + player.radius);
    }

    resolveCollision(player) {
        // Calculate overlap on each axis
        const overlapX = (this.width / 2 + player.radius) - Math.abs((player.x) - (this.x + this.width / 2));
        const overlapY = (this.height / 2 + player.radius) - Math.abs((player.y) - (this.y + this.height / 2));

        // Push back based on smallest overlap
        if (overlapX < overlapY) {
            if (player.x < this.x + this.width / 2) {
                player.x -= overlapX;
            } else {
                player.x += overlapX;
            }
        } else {
            if (player.y < this.y + this.height / 2) {
                player.y -= overlapY;
            } else {
                player.y += overlapY;
            }
        }
    }
}

class Grenade {
    constructor() {
        this.x = Math.random() * (canvas.width - 20) + 10;
        this.y = Math.random() * (canvas.height - 20) + 10;
        this.radius = 12;
        this.exploding = false;
        this.explosionRadius = 0;
        this.maxExplosionRadius = 120;
        this.explosionSpeed = 6;
        this.fuseTime = 80;
        this.currentFuseTime = this.fuseTime;
        this.rotation = Math.random() * Math.PI * 2;
    }

    draw() {
        if (this.exploding) {
            // Multi-layered explosion effect
            const gradients = [
                {
                    radius: this.explosionRadius,
                    colors: [
                        {stop: 0, color: 'rgba(255, 200, 0, 0.9)'},
                        {stop: 0.3, color: 'rgba(255, 100, 0, 0.7)'},
                        {stop: 0.6, color: 'rgba(255, 50, 0, 0.5)'},
                        {stop: 1, color: 'rgba(100, 0, 0, 0)'}
                    ]
                },
                {
                    radius: this.explosionRadius * 0.8,
                    colors: [
                        {stop: 0, color: 'rgba(255, 220, 100, 0.9)'},
                        {stop: 0.5, color: 'rgba(255, 150, 50, 0.6)'},
                        {stop: 1, color: 'rgba(255, 100, 0, 0)'}
                    ]
                }
            ];

            gradients.forEach(({radius, colors}) => {
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, radius
                );
                colors.forEach(({stop, color}) => gradient.addColorStop(stop, color));

                ctx.beginPath();
                ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                ctx.closePath();
            });
        } else {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);

            // Grenade body
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#2A3C28'; // Military green
            ctx.fill();
            ctx.strokeStyle = '#1A2C18';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();

            // Grenade top
            ctx.beginPath();
            ctx.rect(-4, -this.radius - 6, 8, 6);
            ctx.fillStyle = '#404040';
            ctx.fill();
            ctx.strokeStyle = '#303030';
            ctx.stroke();
            ctx.closePath();

            // Pin and handle
            if (this.currentFuseTime > this.fuseTime * 0.8) {
                ctx.beginPath();
                ctx.arc(-8, -this.radius - 3, 3, 0, Math.PI * 2);
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-8, -this.radius);
                ctx.lineTo(-12, -this.radius - 8);
                ctx.stroke();
            }

            // Fuse spark
            if (this.currentFuseTime % 6 < 3) {
                ctx.beginPath();
                ctx.arc(0, -this.radius - 6, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#FFA500';
                ctx.fill();
                ctx.closePath();
            }

            ctx.restore();
        }
    }

    update() {
        if (this.exploding) {
            this.explosionRadius += this.explosionSpeed;
            return this.explosionRadius > this.maxExplosionRadius;
        } else {
            this.currentFuseTime--;
            this.rotation += 0.05;
            if (this.currentFuseTime <= 0) {
                this.exploding = true;
                sounds.playExplosion();
            }
        }
        return false;
    }
}

const player1 = new Player(100, 300, '#007bff', {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd'
}, new PlayerSkin('#007bff', '#0056b3', 'cape'));

const player2 = new Player(700, 300, '#dc3545', {
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright'
}, new PlayerSkin('#dc3545', '#b21f2d', 'glasses'));

let bombs = [];
let keys = {};
let gameOver = false;
let powerUps = [];

function spawnBomb() {
    if (bombs.length < 5) {
        bombs.push(new Grenade());
    }
}

function spawnPowerUp() {
    if (powerUps.length < 3) {
        const type = Math.random() < 0.5 ? 'speed' : 'shield';
        let x, y, validPosition;
        do {
            validPosition = true;
            x = Math.random() * (canvas.width - 40) + 20;
            y = Math.random() * (canvas.height - 40) + 20;

            // Check collision with furniture
            furniture.forEach(f => {
                const dx = Math.abs(x - (f.x + f.width / 2));
                const dy = Math.abs(y - (f.y + f.height / 2));
                if (dx < (f.width / 2 + 20) && dy < (f.height / 2 + 20)) {
                    validPosition = false;
                }
            });
        } while (!validPosition);

        powerUps.push(new PowerUp(x, y, type));
    }
}


function checkCollision(player, bomb) {
    if (!player.alive || player.isRagdoll) return false;

    const distance = Math.sqrt(
        Math.pow(player.x - bomb.x, 2) +
        Math.pow(player.y - bomb.y, 2)
    );

    if (bomb.exploding && distance < (player.radius + bomb.explosionRadius)) {
        player.hit(bomb.x, bomb.y, bomb.explosionRadius);
        return true;
    }

    return false;
}

// Initialize furniture with specific types
const furniture = [
    new Furniture(100, 100, 'desk'),
    new Furniture(300, 200, 'table'),
    new Furniture(600, 400, 'bookshelf'),
    new Furniture(400, 300, 'chair'),
    new Furniture(200, 450, 'cabinet'),
    new Furniture(500, 150, 'desk'),
    new Furniture(150, 300, 'chair'),
    new Furniture(450, 400, 'table')
];


function updateGame() {
    if (gameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw furniture
    furniture.forEach(f => f.draw());

    // Draw and update power-ups
    powerUps = powerUps.filter(powerUp => {
        powerUp.draw();

        // Check collision with players
        if (powerUp.active) {
            if (powerUp.checkCollision(player1)) {
                player1.applyPowerUp(powerUp.type);
                powerUp.active = false;
                return false;
            }
            if (powerUp.checkCollision(player2)) {
                player2.applyPowerUp(powerUp.type);
                powerUp.active = false;
                return false;
            }
        }
        return powerUp.active;
    });

    // Update player positions and states
    player1.update();
    player2.update();
    player1.move(keys);
    player2.move(keys);

    // Draw players in correct order (based on Y position)
    const players = [player1, player2].sort((a, b) => a.y - b.y);
    players.forEach(player => player.draw());

    let shouldEndGame = false;

    bombs = bombs.filter(bomb => {
        bomb.draw();
        const finished = bomb.update();

        if (checkCollision(player1, bomb)) {
            shouldEndGame = true;
        }
        if (checkCollision(player2, bomb)) {
            shouldEndGame = true;
        }

        return !finished;
    });

    if ((player1.alive || player2.alive) && !gameOver) {
        if (player1.alive && !player1.isRagdoll) player1.score++;
        if (player2.alive && !player2.isRagdoll) player2.score++;

        document.getElementById('score1').textContent = player1.score;
        document.getElementById('score2').textContent = player2.score;
    }

    requestAnimationFrame(updateGame);
}

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

setInterval(spawnBomb, 2000);
setInterval(spawnPowerUp, 10000); // Spawn power-up every 10 seconds
updateGame();