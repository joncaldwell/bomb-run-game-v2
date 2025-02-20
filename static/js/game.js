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

class Bomb {
    constructor() {
        this.x = Math.random() * (canvas.width - 20) + 10;
        this.y = Math.random() * (canvas.height - 20) + 10;
        this.radius = 10;
        this.exploding = false;
        this.explosionRadius = 0;
        this.maxExplosionRadius = 100;
        this.explosionSpeed = 3;
    }

    draw() {
        if (this.exploding) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.explosionRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 0, ${1 - this.explosionRadius/this.maxExplosionRadius})`;
            ctx.fill();
            ctx.closePath();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.closePath();
        }
    }

    update() {
        if (this.exploding) {
            this.explosionRadius += this.explosionSpeed;
            return this.explosionRadius > this.maxExplosionRadius;
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
        bombs.push(new Bomb());
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

    bombs = bombs.filter(bomb => {
        bomb.draw();

        if (!bomb.exploding && Math.random() < 0.01) {
            bomb.exploding = true;
            sounds.playExplosion();
        }

        if (checkCollision(player1, bomb)) {
            player1.alive = false;
        }
        if (checkCollision(player2, bomb)) {
            player2.alive = false;
        }

        return !bomb.update();
    });

    if ((player1.alive || player2.alive) && !gameOver) {
        if (player1.alive) player1.score++;
        if (player2.alive) player2.score++;

        document.getElementById('score1').textContent = player1.score;
        document.getElementById('score2').textContent = player2.score;
    }

    if (!gameOver && (!player1.alive && !player2.alive)) {
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