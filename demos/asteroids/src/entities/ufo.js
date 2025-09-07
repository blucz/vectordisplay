import { UFOBullet } from './ufo-bullet.js';

export class UFO {
    constructor(isLarge, game) {
        this.isLarge = isLarge;
        this.radius = isLarge ? 30 : 20;
        this.x = Math.random() < 0.5 ? -this.radius : game.WORLD_WIDTH + this.radius;
        this.y = Math.random() * game.WORLD_HEIGHT;
        this.vx = (this.x < 0 ? 1 : -1) * (isLarge ? 2 : 3);
        this.vy = 0;
        this.shootTimer = 0;
        this.shootInterval = isLarge ? 60 : 40; // Large UFO shoots slower but less accurately
        this.directionChangeTimer = 0;
        this.points = isLarge ? 200 : 1000; // Small UFO worth more points
        this.game = game;
    }
    
    update() {
        // Move horizontally
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap vertically
        if (this.y < 0) this.y = this.game.WORLD_HEIGHT;
        if (this.y > this.game.WORLD_HEIGHT) this.y = 0;
        
        // Remove if off screen horizontally
        if (this.x < -this.radius * 2 || this.x > this.game.WORLD_WIDTH + this.radius * 2) {
            return false; // Signal to remove
        }
        
        // Occasionally change vertical direction
        this.directionChangeTimer--;
        if (this.directionChangeTimer <= 0) {
            this.vy = (Math.random() - 0.5) * 2;
            this.directionChangeTimer = 60 + Math.random() * 60;
        }
        
        // Shoot at player
        this.shootTimer--;
        if (this.shootTimer <= 0 && this.game.ship && this.game.gameState === 'playing') {
            this.shoot();
            this.shootTimer = this.shootInterval;
        }
        
        return true; // Keep alive
    }
    
    shoot() {
        let angle;
        
        if (this.isLarge) {
            // Large UFO shoots randomly
            angle = Math.random() * Math.PI * 2;
        } else {
            // Small UFO aims at player with accuracy based on score
            if (this.game.ship) {
                const dx = this.game.ship.x - this.x;
                const dy = this.game.ship.y - this.y;
                angle = Math.atan2(dy, dx);
                
                // Calculate aim jitter based on score
                let aimJitter;
                if (this.game.score < 10000) {
                    aimJitter = 0.5; // Wide spread at low scores
                } else if (this.game.score < 35000) {
                    // Gradually improve accuracy from 10k to 35k
                    const progress = (this.game.score - 10000) / 25000;
                    aimJitter = 0.5 - (0.3 * progress); // From 0.5 to 0.2
                } else {
                    // After 35k points: very accurate
                    aimJitter = 0.1; // Tight aim window
                }
                
                angle += (Math.random() - 0.5) * aimJitter;
            } else {
                angle = Math.random() * Math.PI * 2;
            }
        }
        
        this.game.ufoBullets.push(new UFOBullet(this.x, this.y, angle, this.game));
    }
    
    draw() {
        this.game.display.setColor(1.0, 0.5, 0.5);
        
        // Draw UFO body (classic flying saucer shape)
        const w = this.radius;
        const h = this.radius * 0.4;
        
        // Bottom dome
        this.game.shapes.drawLine(this.x - w, this.y, this.x - w * 0.5, this.y + h);
        this.game.shapes.drawLine(this.x - w * 0.5, this.y + h, this.x + w * 0.5, this.y + h);
        this.game.shapes.drawLine(this.x + w * 0.5, this.y + h, this.x + w, this.y);
        
        // Top dome
        this.game.shapes.drawLine(this.x - w * 0.6, this.y, this.x - w * 0.3, this.y - h);
        this.game.shapes.drawLine(this.x - w * 0.3, this.y - h, this.x + w * 0.3, this.y - h);
        this.game.shapes.drawLine(this.x + w * 0.3, this.y - h, this.x + w * 0.6, this.y);
        
        // Middle line
        this.game.shapes.drawLine(this.x - w, this.y, this.x + w, this.y);
        
        // Details
        if (this.isLarge) {
            // Windows for large UFO
            this.game.shapes.drawCircle(this.x - w * 0.4, this.y, 3, 4);
            this.game.shapes.drawCircle(this.x, this.y, 3, 4);
            this.game.shapes.drawCircle(this.x + w * 0.4, this.y, 3, 4);
        }
    }
}