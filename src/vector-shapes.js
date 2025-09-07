export class VectorShapes {
    constructor(display) {
        this.display = display;
    }
    
    drawLine(x0, y0, x1, y1) {
        this.display.beginDraw(x0, y0);
        this.display.drawTo(x1, y1);
        this.display.endDraw();
    }
    
    drawCircle(x, y, radius, segments = 32) {
        const step = (Math.PI * 2) / segments;
        
        // Start at angle 0
        this.display.beginDraw(
            x + radius * Math.sin(0),
            y - radius * Math.cos(0)
        );
        
        // Draw segments around the circle
        for (let i = 1; i <= segments; i++) {
            const angle = i * step;
            this.display.drawTo(
                x + radius * Math.sin(angle),
                y - radius * Math.cos(angle)
            );
        }
        
        this.display.endDraw();
    }
    
    drawBox(x, y, width, height) {
        this.display.beginDraw(x, y);
        this.display.drawTo(x + width, y);
        this.display.drawTo(x + width, y + height);
        this.display.drawTo(x, y + height);
        this.display.drawTo(x, y);
        this.display.endDraw();
    }
    
    drawWheel(x, y, radius, angle) {
        const spokeRadius = radius - 2.0;
        
        // Draw spokes
        this.drawLine(
            x + spokeRadius * Math.sin(angle),
            y - spokeRadius * Math.cos(angle),
            x - spokeRadius * Math.sin(angle),
            y + spokeRadius * Math.cos(angle)
        );
        
        this.drawLine(
            x + spokeRadius * Math.sin(angle + Math.PI / 4),
            y - spokeRadius * Math.cos(angle + Math.PI / 4),
            x - spokeRadius * Math.sin(angle + Math.PI / 4),
            y + spokeRadius * Math.cos(angle + Math.PI / 4)
        );
        
        this.drawLine(
            x + spokeRadius * Math.sin(angle + Math.PI / 2),
            y - spokeRadius * Math.cos(angle + Math.PI / 2),
            x - spokeRadius * Math.sin(angle + Math.PI / 2),
            y + spokeRadius * Math.cos(angle + Math.PI / 2)
        );
        
        this.drawLine(
            x + spokeRadius * Math.sin(angle + 3 * Math.PI / 4),
            y - spokeRadius * Math.cos(angle + 3 * Math.PI / 4),
            x - spokeRadius * Math.sin(angle + 3 * Math.PI / 4),
            y + spokeRadius * Math.cos(angle + 3 * Math.PI / 4)
        );
        
        // Draw octagonal wheel outline
        this.display.beginDraw(
            x + radius * Math.sin(angle),
            y - radius * Math.cos(angle)
        );
        
        for (let edgeAngle = 0; edgeAngle < Math.PI * 2; edgeAngle += Math.PI / 4) {
            this.display.drawTo(
                x + radius * Math.sin(angle + edgeAngle + Math.PI / 4),
                y - radius * Math.cos(angle + edgeAngle + Math.PI / 4)
            );
        }
        
        this.display.endDraw();
    }
    
    drawShape(points, x, y, scaleX = 1.0, scaleY = 1.0, angle = 0) {
        const cs = Math.cos(angle);
        const sn = Math.sin(angle);
        
        let i = 0;
        let total = points[i++];
        
        while (total > 0) {
            const vcnt = points[i++];
            
            let xx = points[i] * scaleX;
            let yy = points[i + 1] * scaleY;
            i += 2;
            
            // Apply rotation
            let rx = xx * cs - yy * sn;
            let ry = xx * sn + yy * cs;
            
            this.display.beginDraw(x + rx, y + ry);
            
            for (let j = 1; j < vcnt; j++) {
                xx = points[i] * scaleX;
                yy = points[i + 1] * scaleY;
                i += 2;
                
                rx = xx * cs - yy * sn;
                ry = xx * sn + yy * cs;
                
                this.display.drawTo(x + rx, y + ry);
            }
            
            this.display.endDraw();
            total--;
        }
    }
}