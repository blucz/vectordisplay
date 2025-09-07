export class Ship {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.angle = -Math.PI / 2; // Point up
        this.radius = game.SHIP_SIZE;
        this.thrusting = false;
        this.game = game;
    }
    
    update() {
        // Rotation
        if (this.game.keys['ArrowLeft']) {
            this.angle -= this.game.SHIP_ROTATION_SPEED;
        }
        if (this.game.keys['ArrowRight']) {
            this.angle += this.game.SHIP_ROTATION_SPEED;
        }
        
        // Thrust
        if (this.game.keys['ArrowUp']) {
            this.vx += Math.cos(this.angle) * this.game.SHIP_THRUST;
            this.vy += Math.sin(this.angle) * this.game.SHIP_THRUST;
            this.thrusting = true;
            
            // Limit speed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > this.game.SHIP_MAX_SPEED) {
                this.vx = (this.vx / speed) * this.game.SHIP_MAX_SPEED;
                this.vy = (this.vy / speed) * this.game.SHIP_MAX_SPEED;
            }
        } else {
            this.thrusting = false;
        }
        
        // Apply friction
        this.vx *= this.game.SHIP_FRICTION;
        this.vy *= this.game.SHIP_FRICTION;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Wrap around screen
        if (this.x < 0) this.x = this.game.WORLD_WIDTH;
        if (this.x > this.game.WORLD_WIDTH) this.x = 0;
        if (this.y < 0) this.y = this.game.WORLD_HEIGHT;
        if (this.y > this.game.WORLD_HEIGHT) this.y = 0;
    }
    
    draw() {
        // Flash when invulnerable
        if (this.game.invulnerableTime > 0 && Math.floor(this.game.invulnerableTime / 5) % 2 === 0) {
            return;
        }
        
        this.game.display.setColor(1.0, 1.0, 1.0);
        
        // Draw ship triangle
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        // Ship points (relative to center)
        const points = [
            { x: this.radius, y: 0 },           // Tip
            { x: -this.radius, y: -this.radius * 0.7 }, // Left wing
            { x: -this.radius * 0.5, y: 0 },    // Back indent
            { x: -this.radius, y: this.radius * 0.7 }   // Right wing
        ];
        
        // Transform and draw
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            const x1 = this.x + p1.x * cos - p1.y * sin;
            const y1 = this.y + p1.x * sin + p1.y * cos;
            const x2 = this.x + p2.x * cos - p2.y * sin;
            const y2 = this.y + p2.x * sin + p2.y * cos;
            
            this.game.shapes.drawLine(x1, y1, x2, y2);
        }
        
        // Draw thrust flame
        if (this.thrusting) {
            this.game.display.setColor(1.0, 0.5, 0.0);
            const flameSize = this.radius * (0.6 + Math.random() * 0.4);
            const fx1 = this.x - this.radius * 0.5 * cos - flameSize * 0.3 * sin;
            const fy1 = this.y - this.radius * 0.5 * sin + flameSize * 0.3 * cos;
            const fx2 = this.x - (this.radius + flameSize) * cos;
            const fy2 = this.y - (this.radius + flameSize) * sin;
            const fx3 = this.x - this.radius * 0.5 * cos + flameSize * 0.3 * sin;
            const fy3 = this.y - this.radius * 0.5 * sin - flameSize * 0.3 * cos;
            
            this.game.shapes.drawLine(fx1, fy1, fx2, fy2);
            this.game.shapes.drawLine(fx2, fy2, fx3, fy3);
        }
    }
}