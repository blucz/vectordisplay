import { VectorDisplay, VectorFont, VectorShapes } from 'vector-display';

// Get canvas and set initial size
const canvas = document.getElementById('canvas');

// Initialize display
const display = new VectorDisplay(canvas);

// Create helpers
const font = new VectorFont(display);
const shapes = new VectorShapes(display);

// Function to resize canvas to fit window
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    
    // Calculate logical size (window width - 80px for margins)
    const maxWidth = window.innerWidth - 80;
    const aspectRatio = 2048 / 1536; // Original aspect ratio
    
    const logicalWidth = Math.min(maxWidth, 1600); // Cap at reasonable max
    const logicalHeight = logicalWidth / aspectRatio;
    
    // Set physical size for the resolution
    const physicalWidth = Math.floor(logicalWidth * dpr);
    const physicalHeight = Math.floor(logicalHeight * dpr);
    
    // Update canvas dimensions
    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    
    // Resize the WebGL display
    display.resize(physicalWidth, physicalHeight);
    
    // Update transform to match the original C demo
    if ((physicalWidth / physicalHeight) < (2048.0 / 1536.0)) {
        const scale = physicalWidth / 2048.0;
        display.setTransform(0, (physicalHeight - 1536 * scale) / 2, scale);
    } else {
        const scale = physicalHeight / 1536.0;
        display.setTransform((physicalWidth - 2048 * scale) / 2, 0, scale);
    }
}

// Initial setup and resize
display.setup();
resizeCanvas();

// Animation variables
let frame = 0;
let animate = true;
let currentDemo = 'test';

// Bouncing wheel variables
let wheelX = 1024;
let wheelY = 768;
let wheelVX = 5 + Math.random() * 5;  // Random velocity between 5-10
let wheelVY = 5 + Math.random() * 5;
let wheelAngle = 0;
let wheelRadius = 150;
const wheelRotationSpeed = 0.05;


// Control handlers
document.getElementById('demoSelect').addEventListener('change', (e) => {
    currentDemo = e.target.value;
    
    // Clear display when switching demos
    display.clear();
    
    // Reset bouncing wheel position if switching to it
    if (currentDemo === 'bouncing') {
        wheelX = 1024;
        wheelY = 768;
        wheelVX = 5 + Math.random() * 5;
        wheelVY = 5 + Math.random() * 5;
        // Random initial angle
        const angle = Math.random() * Math.PI * 2;
        wheelVX = Math.cos(angle) * 8;
        wheelVY = Math.sin(angle) * 8;
    }
});

document.getElementById('brightness').addEventListener('input', (e) => {
    const value = e.target.value / 100;
    display.setBrightness(value);
    document.getElementById('brightnessValue').textContent = value.toFixed(1);
});

document.getElementById('decay').addEventListener('input', (e) => {
    const value = e.target.value / 100;
    display.setDecay(value);
    document.getElementById('decayValue').textContent = value.toFixed(2);
});

document.getElementById('decaySteps').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    display.setDecaySteps(value);
    document.getElementById('decayStepsValue').textContent = value;
});

document.getElementById('animate').addEventListener('change', (e) => {
    animate = e.target.checked;
});

// Draw test pattern demo
function drawTestPattern() {
    const width = canvas.width;
    const height = canvas.height;
    const buf = `1234567890    size: ${width}x${height} `;
    
    // Test pattern for simplex font
    display.setColor(1.0, 0.7, 1.0);
    font.draw(50, 180, 3.5, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    font.draw(50, 360, 3.5, "abcdefghijklmnopqrstuvwxyz");
    font.draw(50, 540, 3.5, buf);
    font.draw(50, 720, 3.5, "!@#$%^&*()-=<>/?;:'\"{}[]|\\+=-_");
    
    // Test pattern for lines
    display.setColor(1.0, 0.7, 0.7);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < i; j++) {
            shapes.drawLine(50, 750 + 100 * i, 400, 750 + 100 * i);
        }
    }
    
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j <= i; j++) {
            shapes.drawLine(50 + 100 * i, 1200, 50 + 100 * i, 1400);
        }
    }
    
    // Test pattern for shapes
    display.setColor(0.7, 0.7, 1.0);
    shapes.drawCircle(500, 950, 20, 32);
    shapes.drawCircle(600, 950, 50, 32);
    shapes.drawCircle(800, 950, 100, 32);
    shapes.drawCircle(1075, 950, 150, 64);
    
    display.setColor(0.7, 1.0, 0.7);
    shapes.drawBox(500, 1200, 40, 40);
    shapes.drawBox(565, 1200, 100, 100);
    shapes.drawBox(700, 1200, 200, 200);
    shapes.drawBox(950, 1200, 300, 300);
    
    // Animated wheels
    display.setColor(1.0, 0.7, 1.0);
    const wheelAngle = animate ? (frame * 0.02) : Math.PI;
    shapes.drawWheel(1425, 950, 150, wheelAngle);
    shapes.drawWheel(1700, 950, 100, wheelAngle * 1.5);
    shapes.drawWheel(1900, 950, 50, wheelAngle * 2);
    shapes.drawWheel(2000, 950, 20, wheelAngle * 3);
}

// Draw bouncing wheel demo
function drawBouncingWheel() {
    // Update position if animating
    if (animate) {
        wheelX += wheelVX;
        wheelY += wheelVY;
        wheelAngle += wheelRotationSpeed;
        
        // Bounce off walls
        // Left and right walls
        if (wheelX - wheelRadius <= 0) {
            wheelX = wheelRadius;
            wheelVX = Math.abs(wheelVX);
        } else if (wheelX + wheelRadius >= 2048) {
            wheelX = 2048 - wheelRadius;
            wheelVX = -Math.abs(wheelVX);
        }
        
        // Top and bottom walls
        if (wheelY - wheelRadius <= 0) {
            wheelY = wheelRadius;
            wheelVY = Math.abs(wheelVY);
        } else if (wheelY + wheelRadius >= 1536) {
            wheelY = 1536 - wheelRadius;
            wheelVY = -Math.abs(wheelVY);
        }
    }
    
    // Draw the bouncing wheel
    display.setColor(1.0, 0.7, 1.0);
    shapes.drawWheel(wheelX, wheelY, wheelRadius, wheelAngle);
}

// Main draw function
function draw() {
    // Only clear for test pattern demo, not for bouncing (to allow trails)
    if (currentDemo === 'test') {
        display.clear();
        drawTestPattern();
    } else if (currentDemo === 'bouncing') {
        // Don't clear to allow trails to persist
        drawBouncingWheel();
    }
    
    display.update();
}

// Animation loop
function render() {
    draw();
    if (animate) {
        frame++;
    }
    requestAnimationFrame(render);
}

// Start rendering
render();

// Handle window resize
window.addEventListener('resize', () => {
    resizeCanvas();
});