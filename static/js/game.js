const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sounds = new GameSounds();

class Player {
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = color;
        this.controls = controls;
        this.speed = 5;
        this.alive = true;
        this.score = 0;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    move(keys) {
        if (!this.alive) return;

        if (keys[this.controls.up] && this.y > this.radius) {
            this.y -= this.speed;
            sounds.playMove();
        }
        if (keys[this.controls.down] && this.y < canvas.height - this.radius) {
            this.y += this.speed;
            sounds.playMove();
        }
        if (keys[this.controls.left] && this.x > this.radius) {
            this.x -= this.speed;
            sounds.playMove();
        }
        if (keys[this.controls.right] && this.x < canvas.width - this.radius) {
            this.x += this.speed;
            sounds.playMove();
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
                        { stop: 0, color: 'rgba(255, 200, 0, 0.9)' },
                        { stop: 0.3, color: 'rgba(255, 100, 0, 0.7)' },
                        { stop: 0.6, color: 'rgba(255, 50, 0, 0.5)' },
                        { stop: 1, color: 'rgba(100, 0, 0, 0)' }
                    ]
                },
                {
                    radius: this.explosionRadius * 0.8,
                    colors: [
                        { stop: 0, color: 'rgba(255, 220, 100, 0.9)' },
                        { stop: 0.5, color: 'rgba(255, 150, 50, 0.6)' },
                        { stop: 1, color: 'rgba(255, 100, 0, 0)' }
                    ]
                }
            ];

            gradients.forEach(({ radius, colors }) => {
                const gradient = ctx.createRadialGradient(
                    this.x, this.y, 0,
                    this.x, this.y, radius
                );
                colors.forEach(({ stop, color }) => gradient.addColorStop(stop, color));

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
});

const player2 = new Player(700, 300, '#dc3545', {
    up: 'arrowup',
    down: 'arrowdown',
    left: 'arrowleft',
    right: 'arrowright'
});

let bombs = [];
let keys = {};
let gameOver = false;

function spawnBomb() {
    if (bombs.length < 5) {
        bombs.push(new Grenade());
    }
}

function checkCollision(player, bomb) {
    if (!player.alive) return false;

    const distance = Math.sqrt(
        Math.pow(player.x - bomb.x, 2) +
        Math.pow(player.y - bomb.y, 2)
    );

    return bomb.exploding &&
        distance < (player.radius + bomb.explosionRadius);
}

function updateGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player1.move(keys);
    player2.move(keys);

    player1.draw();
    player2.draw();

    let shouldEndGame = false;

    bombs = bombs.filter(bomb => {
        bomb.draw();
        const finished = bomb.update();

        if (checkCollision(player1, bomb)) {
            player1.alive = false;
            shouldEndGame = true;
        }
        if (checkCollision(player2, bomb)) {
            player2.alive = false;
            shouldEndGame = true;
        }

        return !finished;
    });

    if ((player1.alive || player2.alive) && !gameOver) {
        if (player1.alive) player1.score++;
        if (player2.alive) player2.score++;

        document.getElementById('score1').textContent = player1.score;
        document.getElementById('score2').textContent = player2.score;
    }

    if (!gameOver && (shouldEndGame || (!player1.alive && !player2.alive))) {
        gameOver = true;
        sounds.playGameOver();
        const gameOverDiv = document.getElementById('gameOver');
        const winner = document.getElementById('winner');
        gameOverDiv.classList.remove('d-none');

        if (player1.score > player2.score) {
            winner.textContent = "Player 1 Wins!";
        } else if (player2.score > player1.score) {
            winner.textContent = "Player 2 Wins!";
        } else {
            winner.textContent = "It's a Tie!";
        }
        return;
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
updateGame();