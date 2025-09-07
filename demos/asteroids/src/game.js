import { Ship } from './entities/ship.js';
import { Asteroid } from './entities/asteroid.js';
import { Bullet } from './entities/bullet.js';
import { Particle } from './entities/particle.js';
import { UFO } from './entities/ufo.js';
import { UFOBullet } from './entities/ufo-bullet.js';

export class Game {
    constructor(display, font, shapes, worldWidth, worldHeight) {
        this.display = display;
        this.font = font;
        this.shapes = shapes;
        this.WORLD_WIDTH = worldWidth;
        this.WORLD_HEIGHT = worldHeight;
        
        // Game constants
        this.SHIP_SIZE = 20;
        this.ASTEROID_SPEED = 1.5;
        this.BULLET_SPEED = 15;
        this.BULLET_LIFETIME = 60;
        this.SHIP_THRUST = 0.2;
        this.SHIP_ROTATION_SPEED = 0.06;
        this.SHIP_MAX_SPEED = 8;
        this.SHIP_FRICTION = 0.985;
        
        // Game state
        this.gameState = 'title'; // 'title', 'playing', 'gameOver', 'paused'
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('asteroids_highscore') || '0');
        this.lives = 3;
        this.level = 1;
        this.asteroids = [];
        this.bullets = [];
        this.ufoBullets = [];
        this.particles = [];
        this.ship = null;
        this.ufo = null;
        this.keys = {};
        this.invulnerableTime = 0;
        this.ufoTimer = 0;
        this.ufoSpawnTime = 600; // 10 seconds at 60fps
        this.titleAsteroids = []; // Asteroids for title screen
        
        this.setupInputHandlers();
        this.createTitleAsteroids();
    }
    
    start() {
        // Animation loop with delta time
        let lastTime = 0;
        const targetFPS = 60;
        const targetFrameTime = 1000 / targetFPS;
        
        const gameLoop = (currentTime) => {
            if (!lastTime) lastTime = currentTime;
            const deltaTime = currentTime - lastTime;
            
            // Accumulate time and update at fixed 60 FPS
            if (deltaTime >= targetFrameTime) {
                this.update();
                this.draw();
                lastTime = currentTime - (deltaTime % targetFrameTime);
            }
            
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
    
    initGame() {
        this.ship = new Ship(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, this);
        this.asteroids = [];
        this.bullets = [];
        this.ufoBullets = [];
        this.particles = [];
        this.ufo = null;
        this.ufoTimer = 300; // First UFO appears after 5 seconds
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.invulnerableTime = 0;
        this.gameState = 'playing';
        
        this.createAsteroids(this.level);
    }
    
    createAsteroids(level) {
        // Calculate number of starting large asteroids
        // Wave 1: 4, Wave 2: 6, Wave 3: 8, etc., capped at 11
        const count = Math.min(4 + 2 * (level - 1), 11);
        
        for (let i = 0; i < count; i++) {
            let x, y;
            do {
                x = Math.random() * this.WORLD_WIDTH;
                y = Math.random() * this.WORLD_HEIGHT;
            } while (this.ship && this.distance(x, y, this.ship.x, this.ship.y) < 200);
            
            this.asteroids.push(new Asteroid(x, y, 'large', this));
        }
    }
    
    createTitleAsteroids() {
        this.titleAsteroids = [];
        // Create 5-6 asteroids of various sizes
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * this.WORLD_WIDTH;
            const y = Math.random() * this.WORLD_HEIGHT;
            this.titleAsteroids.push(new Asteroid(x, y, 'large', this));
        }
        for (let i = 0; i < 2; i++) {
            const x = Math.random() * this.WORLD_WIDTH;
            const y = Math.random() * this.WORLD_HEIGHT;
            this.titleAsteroids.push(new Asteroid(x, y, 'medium', this));
        }
        for (let i = 0; i < 1; i++) {
            const x = Math.random() * this.WORLD_WIDTH;
            const y = Math.random() * this.WORLD_HEIGHT;
            this.titleAsteroids.push(new Asteroid(x, y, 'small', this));
        }
    }
    
    update() {
        // Update title screen asteroids
        if (this.gameState === 'title') {
            for (let asteroid of this.titleAsteroids) {
                asteroid.update();
            }
            return;
        }
        
        if (this.gameState !== 'playing') return;
        
        // UFO spawning
        if (!this.ufo) {
            this.ufoTimer--;
            if (this.ufoTimer <= 0) {
                // Score-based UFO type selection
                let isLarge = true;
                
                if (this.score < 10000) {
                    // Before 10,000: mostly large UFOs
                    isLarge = Math.random() < 0.9; // 90% large, 10% small
                } else if (this.score < 40000) {
                    // 10,000-40,000: linear ramp from large to small
                    const progress = (this.score - 10000) / 30000; // 0 to 1
                    isLarge = Math.random() > progress; // Probability of small increases
                } else {
                    // 40,000+: only small UFOs
                    isLarge = false;
                }
                
                this.ufo = new UFO(isLarge, this);
                this.ufoSpawnTime = Math.max(300, 600 - this.level * 30); // Spawn more frequently at higher levels
            }
        }
        
        // Update game objects
        if (this.ship) {
            this.ship.update();
        }
        
        if (this.ufo) {
            if (!this.ufo.update()) {
                // UFO went off screen
                this.ufo = null;
                this.ufoTimer = this.ufoSpawnTime;
            }
        }
        
        for (let asteroid of this.asteroids) {
            asteroid.update();
        }
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            this.bullets[i].update();
            if (this.bullets[i].lifetime <= 0) {
                this.bullets.splice(i, 1);
            }
        }
        
        for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
            this.ufoBullets[i].update();
            if (this.ufoBullets[i].lifetime <= 0) {
                this.ufoBullets.splice(i, 1);
            }
        }
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].lifetime <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        if (this.invulnerableTime > 0) {
            this.invulnerableTime--;
        }
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        // Bullets vs Asteroids
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const asteroid = this.asteroids[j];
                
                if (this.distance(bullet.x, bullet.y, asteroid.x, asteroid.y) < asteroid.radius) {
                    // Hit!
                    this.bullets.splice(i, 1);
                    
                    // Create explosion
                    for (let k = 0; k < 10; k++) {
                        this.particles.push(new Particle(asteroid.x, asteroid.y, {r: 0.7, g: 0.7, b: 1.0}, this));
                    }
                    
                    // Split asteroid
                    const newAsteroids = asteroid.split();
                    this.asteroids.splice(j, 1);
                    this.asteroids.push(...newAsteroids);
                    
                    // Score
                    if (asteroid.size === 'large') this.score += 20;
                    else if (asteroid.size === 'medium') this.score += 50;
                    else this.score += 100;
                    
                    // Update high score if needed
                    if (this.score > this.highScore) {
                        this.highScore = this.score;
                        localStorage.setItem('asteroids_highscore', this.highScore.toString());
                    }
                    
                    break;
                }
            }
        }
        
        // Bullets vs UFO
        if (this.ufo) {
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const bullet = this.bullets[i];
                
                if (this.distance(bullet.x, bullet.y, this.ufo.x, this.ufo.y) < this.ufo.radius) {
                    // UFO hit!
                    this.bullets.splice(i, 1);
                    
                    // Create explosion
                    for (let k = 0; k < 15; k++) {
                        this.particles.push(new Particle(this.ufo.x, this.ufo.y, {r: 1.0, g: 0.5, b: 0.5}, this));
                    }
                    
                    // Score
                    this.score += this.ufo.points;
                    
                    // Update high score if needed
                    if (this.score > this.highScore) {
                        this.highScore = this.score;
                        localStorage.setItem('asteroids_highscore', this.highScore.toString());
                    }
                    
                    // Remove UFO and reset timer
                    this.ufo = null;
                    this.ufoTimer = this.ufoSpawnTime;
                    break;
                }
            }
        }
        
        // Ship vs Asteroids
        if (this.ship && this.invulnerableTime <= 0) {
            for (let asteroid of this.asteroids) {
                if (this.distance(this.ship.x, this.ship.y, asteroid.x, asteroid.y) < this.ship.radius + asteroid.radius) {
                    // Ship hit!
                    this.destroyShip();
                    break;
                }
            }
            
            // Ship vs UFO
            if (this.ship && this.ufo && this.distance(this.ship.x, this.ship.y, this.ufo.x, this.ufo.y) < this.ship.radius + this.ufo.radius) {
                // Ship hit UFO!
                this.destroyShip();
                
                // Remove UFO
                this.ufo = null;
                this.ufoTimer = this.ufoSpawnTime;
            }
            
            // Ship vs UFO bullets
            if (this.ship) {
                for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
                    const bullet = this.ufoBullets[i];
                    if (this.distance(this.ship.x, this.ship.y, bullet.x, bullet.y) < this.ship.radius + bullet.radius) {
                        // Ship hit by UFO bullet!
                        this.ufoBullets.splice(i, 1);
                        this.destroyShip();
                        break;
                    }
                }
            }
        }
        
        // Check for level complete
        if (this.asteroids.length === 0 && this.gameState === 'playing') {
            this.level++;
            this.createAsteroids(this.level);
            
            // Bonus life every 10000 points
            if (Math.floor(this.score / 10000) > Math.floor((this.score - 1000) / 10000)) {
                this.lives++;
            }
        }
    }
    
    destroyShip() {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(this.ship.x, this.ship.y, {r: 1.0, g: 0.5, b: 0.0}, this));
        }
        
        this.lives--;
        
        if (this.lives <= 0) {
            this.gameState = 'gameOver';
            this.ship = null;
        } else {
            this.ship = new Ship(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, this);
            this.invulnerableTime = 120; // 2 seconds at 60fps
        }
    }
    
    draw() {
        this.display.clear();
        
        // Only draw game objects during gameplay
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameOver') {
            // Draw game objects
            if (this.ship) {
                this.ship.draw();
            }
            
            if (this.ufo) {
                this.ufo.draw();
            }
            
            for (let asteroid of this.asteroids) {
                asteroid.draw();
            }
            
            for (let bullet of this.bullets) {
                bullet.draw();
            }
            
            for (let bullet of this.ufoBullets) {
                bullet.draw();
            }
            
            for (let particle of this.particles) {
                particle.draw();
            }
            
            // Draw HUD
            this.drawHUD();
        }
        
        // Draw pause message
        if (this.gameState === 'paused') {
            this.display.setColor(1.0, 1.0, 1.0);
            this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2, 6, "PAUSED");
        }
        
        // Draw title screen
        if (this.gameState === 'title') {
            this.drawTitleScreen();
        }
        
        // Draw game over message
        if (this.gameState === 'gameOver') {
            this.drawGameOver();
        }
        
        this.display.update();
    }
    
    drawHUD() {
        this.display.setColor(1.0, 1.0, 1.0);
        
        // Layout constants
        const topPadding = 60;
        const sidePadding = 60;
        const shipIconSize = 12;
        const shipSpacing = 30;
        const scoreShipGap = 35; // Gap between score and ships
        
        // Measure score
        const scoreText = this.score.toString();
        const scoreMetrics = this.font.measure(scoreText, 2);
        
        // Calculate ships bounding box
        const numShips = this.lives;
        const shipsWidth = numShips > 0 ? (numShips - 1) * shipSpacing + shipIconSize * 2 : 0;
        
        // Find the wider element (score or ships)
        const maxWidth = Math.max(scoreMetrics.width, shipsWidth);
        
        // Calculate left position to center the bounding box with padding
        const leftX = sidePadding + (maxWidth - scoreMetrics.width) / 2;
        
        // Draw score
        this.font.draw(leftX, topPadding, 2, scoreText);
        
        // Draw ships centered under score
        const shipsCenterX = sidePadding + maxWidth / 2;
        const shipsStartX = shipsCenterX - shipsWidth / 2;
        const shipsY = topPadding + scoreShipGap;
        
        for (let i = 0; i < this.lives; i++) {
            const x = shipsStartX + shipIconSize + i * shipSpacing;
            const y = shipsY;
            const angle = -Math.PI / 2; // Point up
            
            // Draw small ship icon - same shape as actual ship
            this.display.setColor(1.0, 1.0, 1.0);
            
            // Calculate rotated points for ship pointing up
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Ship tip
            const tipX = x + shipIconSize * cos;
            const tipY = y + shipIconSize * sin;
            
            // Left wing
            const leftX = x - shipIconSize * cos - shipIconSize * 0.7 * sin;
            const leftY = y - shipIconSize * sin + shipIconSize * 0.7 * cos;
            
            // Right wing
            const rightX = x - shipIconSize * cos + shipIconSize * 0.7 * sin;
            const rightY = y - shipIconSize * sin - shipIconSize * 0.7 * cos;
            
            // Back indent
            const backX = x - shipIconSize * 0.5 * cos;
            const backY = y - shipIconSize * 0.5 * sin;
            
            // Draw ship outline
            this.shapes.drawLine(tipX, tipY, leftX, leftY);
            this.shapes.drawLine(leftX, leftY, backX, backY);
            this.shapes.drawLine(backX, backY, rightX, rightY);
            this.shapes.drawLine(rightX, rightY, tipX, tipY);
        }
        
        // Level on right with same padding
        this.display.setColor(1.0, 1.0, 1.0);
        this.font.drawRightAligned(this.WORLD_WIDTH - sidePadding, topPadding, 2, `LEVEL ${this.level}`);
    }
    
    drawTitleScreen() {
        // Draw moving asteroids in background
        for (let asteroid of this.titleAsteroids) {
            asteroid.draw();
        }
        
        // Draw high score with same styling as regular score
        this.display.setColor(1.0, 1.0, 1.0);
        
        // Layout constants - same as game HUD
        const topPadding = 60;
        const sidePadding = 60;
        
        // Draw high score - no label, just the number
        const highScoreText = this.highScore.toString();
        this.font.draw(sidePadding, topPadding, 2, highScoreText);
        
        this.display.setColor(1.0, 1.0, 1.0);
        
        // Title - moved down to match game over position
        this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 - 100, 4, "VECTOROIDS");
        
        // Controls in two columns
        this.display.setColor(0.7, 1.0, 0.7);
        const fontSize = 1.0;
        const lineHeight = 40;
        const columnGap = 80;
        const startY = 950;
        
        // Control pairs [key, action]
        const controls = [
            ["ARROW KEYS", "ROTATE AND THRUST"],
            ["SPACE", "FIRE"],
            ["P", "PAUSE"],
            ["F", "FULLSCREEN"]
        ];
        
        // Measure all text to find column widths
        let maxKeyWidth = 0;
        let maxActionWidth = 0;
        for (let [key, action] of controls) {
            const keyMetrics = this.font.measure(key, fontSize);
            const actionMetrics = this.font.measure(action, fontSize);
            maxKeyWidth = Math.max(maxKeyWidth, keyMetrics.width);
            maxActionWidth = Math.max(maxActionWidth, actionMetrics.width);
        }
        
        // Calculate total width and center position
        const totalWidth = maxKeyWidth + columnGap + maxActionWidth;
        const leftColumnX = (this.WORLD_WIDTH - totalWidth) / 2;
        const rightColumnX = leftColumnX + maxKeyWidth + columnGap;
        
        // Draw controls
        for (let i = 0; i < controls.length; i++) {
            const [key, action] = controls[i];
            const y = startY + i * lineHeight;
            
            // Draw key (left column, right-aligned)
            const keyMetrics = this.font.measure(key, fontSize);
            this.font.draw(leftColumnX + maxKeyWidth - keyMetrics.width, y, fontSize, key);
            
            // Draw action (right column, left-aligned)
            this.font.draw(rightColumnX, y, fontSize, action);
        }
        
        // Start prompt - yellow and blinking like game over
        this.display.setColor(1.0, 1.0, 0.5);
        if (Math.floor(Date.now() / 500) % 2) { // Blink
            this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT - 100, 2, "PRESS SPACE TO START");
        }
    }
    
    drawGameOver() {
        this.display.setColor(1.0, 1.0, 1.0);
        this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 - 100, 4, "GAME OVER");
        
        // Show final score and high score
        this.display.setColor(0.7, 1.0, 0.7);
        if (this.score >= this.highScore) {
            this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 + 50, 2, `NEW HIGH SCORE ${this.score}`);
        } else {
            this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT / 2 + 50, 2, `SCORE ${this.score}`);
        }
        
        // Yellow blinking text to match title screen
        this.display.setColor(1.0, 1.0, 0.5);
        if (Math.floor(Date.now() / 500) % 2) { // Blink
            this.font.drawCentered(this.WORLD_WIDTH / 2, this.WORLD_HEIGHT - 100, 2, "PRESS SPACE TO CONTINUE");
        }
    }
    
    distance(x1, y1, x2, y2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    setupInputHandlers() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Handle space key for different states
            if (e.key === ' ') {
                e.preventDefault();
                
                if (this.gameState === 'title') {
                    // Start game from title screen
                    this.initGame();
                } else if (this.gameState === 'playing' && this.ship) {
                    // Fire bullet during gameplay
                    this.bullets.push(new Bullet(
                        this.ship.x + Math.cos(this.ship.angle) * this.ship.radius,
                        this.ship.y + Math.sin(this.ship.angle) * this.ship.radius,
                        this.ship.angle,
                        this
                    ));
                } else if (this.gameState === 'gameOver') {
                    // Go back to title screen after game over
                    this.gameState = 'title';
                    this.createTitleAsteroids();
                }
            }
            
            // Pause (only during gameplay)
            if ((e.key === 'p' || e.key === 'P') && (this.gameState === 'playing' || this.gameState === 'paused')) {
                if (this.gameState === 'playing') {
                    this.gameState = 'paused';
                } else if (this.gameState === 'paused') {
                    this.gameState = 'playing';
                }
            }
            
            // Fullscreen (available anytime)
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
            
            // Escape to title screen
            if (e.key === 'Escape') {
                if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameOver') {
                    this.gameState = 'title';
                    // Clean up current game
                    this.ship = null;
                    this.ufo = null;
                    this.asteroids = [];
                    this.bullets = [];
                    this.ufoBullets = [];
                    this.particles = [];
                    this.createTitleAsteroids();
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.getElementById('canvas').requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }
}