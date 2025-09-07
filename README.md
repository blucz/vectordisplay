# Vector Display

A WebGL-based vector display engine for creating retro CRT-style phosphor graphics in the browser.

<video src="https://raw.githubusercontent.com/blucz/vectordisplay/main/videos/asteroids.mov"
       width="100%" autoplay loop muted playsinline></video>
       
This JavaScript library is a port and continuation of my earlier C-based OpenGL vector display engine from [github.com/blucz/Vector](https://github.com/blucz/Vector), bringing the same authentic CRT phosphor simulation to web browsers.

For this to feel awesome, you really need a display with good blacks and a lot of dynamic range. It works great on all Apple displays from the past 5 years. It works OK on my 3 year old Dell monitor. It works meh on my 6 year old Dell Monitor. 

## Features

- **Authentic CRT Simulation**: Realistic phosphor persistence and decay effects
- **WebGL Accelerated**: High-performance rendering using WebGL shaders
- **Configurable Display Parameters**: Adjust brightness, decay, and persistence
- **Vector Font Support**: Built-in Hershey Simplex vector font for text rendering
- **Shape Primitives**: Lines, circles, boxes, and other vector shapes

## Installation

```bash
npm install vector-display
```

Or clone this repository and link locally:

```bash
git clone https://github.com/blucz/vectordisplay.git
cd vectordisplay
npm install
npm run build
```

## Usage

### Basic Setup

```javascript
import { VectorDisplay, VectorFont, VectorShapes } from 'vector-display';

// Get your canvas element
const canvas = document.getElementById('canvas');

// Initialize the display
const display = new VectorDisplay(canvas);
display.setup();

// Create helpers for drawing
const font = new VectorFont(display);
const shapes = new VectorShapes(display);

// Set up your render loop
function render() {
    display.clear();
    
    // Set drawing color (RGB, 0-1 range)
    display.setColor(0, 1, 0);  // Green
    
    // Draw some text
    font.draw(100, 100, 2, "HELLO VECTOR WORLD");
    
    // Draw some shapes
    shapes.drawCircle(200, 200, 50, 32);
    shapes.drawLine(0, 0, 400, 300);
    
    display.update();
    requestAnimationFrame(render);
}

render();
```

### Display Configuration

```javascript
// Adjust display parameters
display.setBrightness(1.2);      // Brightness multiplier
display.setDecay(0.4);           // Phosphor decay rate (0-1)
display.setDecaySteps(10);       // Number of decay steps for trails

// Set coordinate transform
display.setTransform(offsetX, offsetY, scale);

// Set drawing color
display.setColor(r, g, b);  // Values from 0-1
```

### Drawing API

#### Lines and Paths
```javascript
// Draw individual lines
shapes.drawLine(x1, y1, x2, y2);

// Draw connected paths
display.beginDraw(startX, startY);
display.drawTo(x1, y1);
display.drawTo(x2, y2);
// ... more points
display.endDraw();
```

#### Shapes
```javascript
// Circle
shapes.drawCircle(centerX, centerY, radius, segments);

// Rectangle
shapes.drawBox(centerX, centerY, width, height);

// Wheel (circle with spokes)
shapes.drawWheel(centerX, centerY, radius, angle);
```

#### Text
```javascript
// Basic text
font.draw(x, y, scale, "YOUR TEXT");

// Centered text
font.drawCentered(x, y, scale, "CENTERED TEXT");

// Right-aligned text
font.drawRightAligned(x, y, scale, "RIGHT ALIGNED");

// Measure text dimensions
const metrics = font.measure("TEXT", scale);
console.log(metrics.width, metrics.height);
```

## Demos

The repository includes two demo applications:

### Basic Demo

A test pattern and bouncing animation demonstrating the display capabilities.

<video src="videos/basic.mov" width="100%" autoplay loop muted></video>

```bash
cd demos/basic
npm install
npm run dev
```

### Asteroids Game

An implementation of the classic Asteroids arcade game built using Vector and Claude Code in about an hour. 

You can play this at [vectoroids.blucz.com](https://vectoroids.blucz.com).

```bash
cd demos/asteroids
npm install
npm run dev
```

## Building

To build the library:

```bash
npm run build
```

This will create:
- `dist/index.esm.js` - ES module build
- `dist/index.js` - CommonJS build
- `dist/vector-display.umd.js` - UMD build for script tags
- `dist/vector-display.umd.min.js` - Minified UMD build

## Browser Support

Requires a browser with WebGL support.

## Credits

This project is a Javascript port of an vector display engine that I built using C in 2012.

- Original C++ engine: [github.com/blucz/Vector](https://github.com/blucz/Vector)

## License

MIT License - See LICENSE file for details

## Author

Brian Luczkiewicz

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
