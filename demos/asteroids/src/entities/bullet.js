export class Bullet {
    constructor(x, y, angle, game) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * game.BULLET_SPEED;
        this.vy = Math.sin(angle) * game.BULLET_SPEED;
        this.lifetime = game.BULLET_LIFETIME;
        this.radius = 2;
        this.game = game;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        
        // Wrap around screen
        if (this.x < 0) this.x = this.game.WORLD_WIDTH;
        if (this.x > this.game.WORLD_WIDTH) this.x = 0;
        if (this.y < 0) this.y = this.game.WORLD_HEIGHT;
        if (this.y > this.game.WORLD_HEIGHT) this.y = 0;
    }
    
    draw() {
        this.game.display.setColor(1.0, 1.0, 0.5);
        this.game.shapes.drawCircle(this.x, this.y, this.radius, 4);
    }
}