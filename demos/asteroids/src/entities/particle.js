export class Particle {
    constructor(x, y, color = {r: 1, g: 1, b: 1}, game = null) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.lifetime = 20 + Math.random() * 20;
        this.maxLifetime = this.lifetime;
        this.color = color;
        this.game = game;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.lifetime--;
    }
    
    draw() {
        const alpha = this.lifetime / this.maxLifetime;
        this.game.display.setColor(this.color.r * alpha, this.color.g * alpha, this.color.b * alpha);
        const size = 2 * alpha;
        this.game.shapes.drawLine(this.x - size, this.y, this.x + size, this.y);
        this.game.shapes.drawLine(this.x, this.y - size, this.x, this.y + size);
    }
}