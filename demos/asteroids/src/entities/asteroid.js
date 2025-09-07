export class Asteroid {
    constructor(x, y, size, game) {
        this.x = x;
        this.y = y;
        this.size = size; // 'large', 'medium', 'small'
        this.radius = size === 'large' ? 80 : size === 'medium' ? 40 : 20;
        this.game = game;
        
        // Random velocity
        const angle = Math.random() * Math.PI * 2;
        const speed = game.ASTEROID_SPEED * (1 + Math.random());
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Random rotation
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Random shape
        this.vertices = [];
        const numVertices = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numVertices; i++) {
            const angle = (i / numVertices) * Math.PI * 2;
            const variation = 0.7 + Math.random() * 0.6;
            this.vertices.push({
                x: Math.cos(angle) * this.radius * variation,
                y: Math.sin(angle) * this.radius * variation
            });
        }
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotationSpeed;
        
        // Wrap around screen
        if (this.x < -this.radius) this.x = this.game.WORLD_WIDTH + this.radius;
        if (this.x > this.game.WORLD_WIDTH + this.radius) this.x = -this.radius;
        if (this.y < -this.radius) this.y = this.game.WORLD_HEIGHT + this.radius;
        if (this.y > this.game.WORLD_HEIGHT + this.radius) this.y = -this.radius;
    }
    
    draw() {
        this.game.display.setColor(0.7, 0.7, 1.0);
        
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        for (let i = 0; i < this.vertices.length; i++) {
            const v1 = this.vertices[i];
            const v2 = this.vertices[(i + 1) % this.vertices.length];
            
            const x1 = this.x + v1.x * cos - v1.y * sin;
            const y1 = this.y + v1.x * sin + v1.y * cos;
            const x2 = this.x + v2.x * cos - v2.y * sin;
            const y2 = this.y + v2.x * sin + v2.y * cos;
            
            this.game.shapes.drawLine(x1, y1, x2, y2);
        }
    }
    
    split() {
        if (this.size === 'small') return [];
        
        const newSize = this.size === 'large' ? 'medium' : 'small';
        const offspring = [];
        
        for (let i = 0; i < 2; i++) {
            const child = new Asteroid(this.x, this.y, newSize, this.game);
            child.vx = (Math.random() - 0.5) * 4;
            child.vy = (Math.random() - 0.5) * 4;
            offspring.push(child);
        }
        
        return offspring;
    }
}