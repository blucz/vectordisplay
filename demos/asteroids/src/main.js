import { VectorDisplay, VectorFont, VectorShapes } from 'vector-display';
import { Game } from './game.js';

// Get canvas and set initial size
const canvas = document.getElementById('canvas');

// Initialize display
const display = new VectorDisplay(canvas);

// Create helpers
const font = new VectorFont(display);
const shapes = new VectorShapes(display);

// Game constants - 4:3 aspect ratio
const WORLD_WIDTH = 2048;
const WORLD_HEIGHT = 1536; // 2048 * 3/4 = 1536

// Resize canvas function - enforces 4:3 aspect ratio
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const aspectRatio = 4 / 3; // Enforce 4:3
    
    // Calculate logical size to fit window while maintaining aspect ratio
    const windowWidth = window.innerWidth - 40;
    const windowHeight = window.innerHeight - 40;
    
    let logicalWidth, logicalHeight;
    
    if (windowWidth / windowHeight > aspectRatio) {
        // Window is wider than 4:3, constrain by height
        logicalHeight = windowHeight;
        logicalWidth = logicalHeight * aspectRatio;
    } else {
        // Window is taller than 4:3, constrain by width
        logicalWidth = windowWidth;
        logicalHeight = logicalWidth / aspectRatio;
    }
    
    // Set physical size
    const physicalWidth = Math.floor(logicalWidth * dpr);
    const physicalHeight = Math.floor(logicalHeight * dpr);
    
    // Update canvas dimensions
    canvas.width = physicalWidth;
    canvas.height = physicalHeight;
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    
    // Resize the WebGL display
    display.resize(physicalWidth, physicalHeight);
    
    // Update transform
    const scale = physicalWidth / WORLD_WIDTH;
    display.setTransform(0, 0, scale);
}

// Initialize
display.setup();
resizeCanvas();

// Create and start game
const game = new Game(display, font, shapes, WORLD_WIDTH, WORLD_HEIGHT);
game.start();

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Handle fullscreen changes
document.addEventListener('fullscreenchange', resizeCanvas);