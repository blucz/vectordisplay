export class VectorDisplay {
    constructor(canvas) {
        this.canvas = canvas;
        // Try to get WebGL context with antialiasing
        const contextAttributes = {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false
        };
        this.gl = canvas.getContext('webgl', contextAttributes) || 
                  canvas.getContext('experimental-webgl', contextAttributes);
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.width = canvas.width;
        this.height = canvas.height;
        this.glowWidth = Math.floor(this.width / 3);
        this.glowHeight = Math.floor(this.height / 3);
        
        // Default parameters
        this.decaySteps = 5;
        this.decay = 0.3;
        this.initialDecay = 0.04;
        this.brightness = 1.0;
        this.thickness = null; // Auto-calculate if null
        this.offsetX = 0;
        this.offsetY = 0;
        this.scale = 1.0;
        this.r = 1.0;
        this.g = 1.0;
        this.b = 1.0;
        this.frameCount = 0;
        
        // Drawing state
        this.pendingPoints = [];
        this.currentPath = [];
        this.points = [];
        this.step = 0;
        this.buffers = [];
        this.bufferNPoints = [];
        
        // WebGL resources (initialized in setup)
        this.programs = {};
        this.framebuffers = {};
        this.textures = {};
        this.vertexBuffers = {};
    }
    
    setup() {
        const gl = this.gl;
        
        // Initialize shaders
        this._initShaders();
        
        // Initialize framebuffers
        this._initFramebuffers();
        
        // Initialize line texture
        this._initLineTexture();
        
        // Initialize vertex buffers for screen quad
        this._initVertexBuffers();
        
        // Setup blend mode
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);
        
        // Initialize buffers array
        for (let i = 0; i < this.decaySteps; i++) {
            this.buffers[i] = gl.createBuffer();
            this.bufferNPoints[i] = 0;
        }
    }
    
    _initShaders() {
        const gl = this.gl;
        
        // Vertex shader for drawing to framebuffer
        const fbVertexShaderSrc = `
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelViewMatrix;
            
            attribute vec4 aPosition;
            attribute vec4 aColor;
            attribute vec2 aTexCoord;
            
            varying vec4 vColor;
            varying vec2 vTexCoord;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
                vColor = aColor;
                vTexCoord = aTexCoord;
            }
        `;
        
        // Fragment shader for drawing to framebuffer
        const fbFragmentShaderSrc = `
            precision mediump float;
            
            uniform sampler2D uTexture;
            uniform float uAlpha;
            
            varying vec4 vColor;
            varying vec2 vTexCoord;
            
            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = vColor * texColor * vec4(1.0, 1.0, 1.0, uAlpha);
            }
        `;
        
        // Vertex shader for screen blitting
        const screenVertexShaderSrc = `
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelViewMatrix;
            
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            
            varying vec2 vTexCoord;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
                vTexCoord = aTexCoord;
            }
        `;
        
        // Fragment shader for screen blitting
        const screenFragmentShaderSrc = `
            precision mediump float;
            
            uniform sampler2D uTexture;
            uniform float uAlpha;
            uniform float uMult;
            
            varying vec2 vTexCoord;
            
            void main() {
                gl_FragColor = texture2D(uTexture, vTexCoord) * vec4(uMult, uMult, uMult, uAlpha * uMult);
            }
        `;
        
        // Blur fragment shader (1D diagonal Gaussian blur like original)
        const blurFragmentShaderSrc = `
            precision mediump float;
            
            uniform sampler2D uTexture;
            uniform vec2 uScale;
            uniform float uAlpha;
            uniform float uMult;
            
            varying vec2 vTexCoord;
            
            void main() {
                vec4 color = vec4(0.0);
                
                // 1D diagonal Gaussian blur matching the original
                color += texture2D(uTexture, vec2(vTexCoord.x - 4.0 * uScale.x, vTexCoord.y - 4.0 * uScale.y)) * 0.05;
                color += texture2D(uTexture, vec2(vTexCoord.x - 3.0 * uScale.x, vTexCoord.y - 3.0 * uScale.y)) * 0.09;
                color += texture2D(uTexture, vec2(vTexCoord.x - 2.0 * uScale.x, vTexCoord.y - 2.0 * uScale.y)) * 0.12;
                color += texture2D(uTexture, vec2(vTexCoord.x - 1.0 * uScale.x, vTexCoord.y - 1.0 * uScale.y)) * 0.15;
                color += texture2D(uTexture, vec2(vTexCoord.x + 0.0 * uScale.x, vTexCoord.y + 0.0 * uScale.y)) * 0.16;
                color += texture2D(uTexture, vec2(vTexCoord.x + 1.0 * uScale.x, vTexCoord.y + 1.0 * uScale.y)) * 0.15;
                color += texture2D(uTexture, vec2(vTexCoord.x + 2.0 * uScale.x, vTexCoord.y + 2.0 * uScale.y)) * 0.12;
                color += texture2D(uTexture, vec2(vTexCoord.x + 3.0 * uScale.x, vTexCoord.y + 3.0 * uScale.y)) * 0.09;
                color += texture2D(uTexture, vec2(vTexCoord.x + 4.0 * uScale.x, vTexCoord.y + 4.0 * uScale.y)) * 0.05;
                
                gl_FragColor = color * vec4(uMult, uMult, uMult, uAlpha * uMult);
            }
        `;
        
        // Create shader programs
        this.programs.fb = this._createProgram(fbVertexShaderSrc, fbFragmentShaderSrc);
        this.programs.screen = this._createProgram(screenVertexShaderSrc, screenFragmentShaderSrc);
        this.programs.blur = this._createProgram(screenVertexShaderSrc, blurFragmentShaderSrc);
    }
    
    _createProgram(vertexSrc, fragmentSrc) {
        const gl = this.gl;
        
        const vertexShader = this._compileShader(gl.VERTEX_SHADER, vertexSrc);
        const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        
        // Bind attribute locations
        gl.bindAttribLocation(program, 0, 'aPosition');
        gl.bindAttribLocation(program, 1, 'aColor');
        gl.bindAttribLocation(program, 2, 'aTexCoord');
        
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link failed:', gl.getProgramInfoLog(program));
            return null;
        }
        
        // Get uniform locations
        const uniforms = {};
        uniforms.projectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
        uniforms.modelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
        uniforms.texture = gl.getUniformLocation(program, 'uTexture');
        uniforms.alpha = gl.getUniformLocation(program, 'uAlpha');
        uniforms.mult = gl.getUniformLocation(program, 'uMult');
        uniforms.scale = gl.getUniformLocation(program, 'uScale');
        
        
        program.uniforms = uniforms;
        
        return program;
    }
    
    _compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile failed:', gl.getShaderInfoLog(shader));
            return null;
        }
        
        return shader;
    }
    
    _initFramebuffers() {
        const gl = this.gl;
        
        // Scene framebuffer (full resolution)
        const sceneFb = gl.createFramebuffer();
        const sceneTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, sceneTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
        
        this.framebuffers.scene = sceneFb;
        this.textures.scene = sceneTex;
        
        // Glow framebuffers (1/3 resolution)
        for (let i = 0; i < 2; i++) {
            const glowFb = gl.createFramebuffer();
            const glowTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, glowTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.glowWidth, this.glowHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, glowFb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, glowTex, 0);
            
            this.framebuffers['glow' + i] = glowFb;
            this.textures['glow' + i] = glowTex;
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    _initLineTexture() {
        const gl = this.gl;
        const size = 64; // Match original size exactly
        const halfSize = size / 2;
        const data = new Uint8Array(size * size * 4);
        
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = x - halfSize;
                const dy = y - halfSize;
                const distance = Math.sqrt(dx * dx + dy * dy) / halfSize;
                
                // Match the original C texture formula
                const clampedDist = Math.min(1.0, distance);
                const line = Math.pow(16, -2 * clampedDist);
                const value = Math.max(0, Math.min(1, line)) * 255;
                
                const idx = (y * size + x) * 4;
                data[idx] = 255;
                data[idx + 1] = 255;
                data[idx + 2] = 255;
                data[idx + 3] = value;
            }
        }
        
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Enable anisotropic filtering if available for smoother lines
        const ext = gl.getExtension('EXT_texture_filter_anisotropic') || 
                    gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic') ||
                    gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
        if (ext) {
            const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
        }
        
        this.textures.line = tex;
    }
    
    _initVertexBuffers() {
        const gl = this.gl;
        
        // Screen quad for blitting (matching original's UV layout)
        const screenQuad = new Float32Array([
            // x, y, z, u, v
            0, 0, 0, 0, 1,                          // top-left
            this.width, this.height, 0, 1, 0,       // bottom-right
            this.width, 0, 0, 1, 1,                 // top-right
            0, 0, 0, 0, 1,                          // top-left
            0, this.height, 0, 0, 0,                // bottom-left
            this.width, this.height, 0, 1, 0        // bottom-right
        ]);
        
        const screenBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, screenBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, screenQuad, gl.STATIC_DRAW);
        this.vertexBuffers.screen = screenBuffer;
        
        // Glow quad for blitting (matching original's UV layout)
        const glowQuad = new Float32Array([
            // x, y, z, u, v
            0, 0, 0, 0, 1,                                    // top-left
            this.glowWidth, this.glowHeight, 0, 1, 0,        // bottom-right
            this.glowWidth, 0, 0, 1, 1,                      // top-right
            0, 0, 0, 0, 1,                                    // top-left
            0, this.glowHeight, 0, 0, 0,                     // bottom-left
            this.glowWidth, this.glowHeight, 0, 1, 0         // bottom-right
        ]);
        
        const glowBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, glowQuad, gl.STATIC_DRAW);
        this.vertexBuffers.glow = glowBuffer;
    }
    
    clear() {
        const gl = this.gl;
        
        // Clear scene framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.scene);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Reset step counter
        this.step = 0;
        
        // Clear all buffers
        for (let i = 0; i < this.decaySteps; i++) {
            this.bufferNPoints[i] = 0;
        }
    }
    
    beginDraw(x, y) {
        this.currentPath = [];
        this.currentPath.push({x: x * this.scale + this.offsetX, y: y * this.scale + this.offsetY});
    }
    
    drawTo(x, y) {
        if (this.currentPath.length > 0) {
            this.currentPath.push({x: x * this.scale + this.offsetX, y: y * this.scale + this.offsetY});
        }
    }
    
    endDraw() {
        if (this.currentPath.length < 2) return;
        
        const thickness = this._getEffectiveThickness();
        const t = thickness / 2; // Half thickness for each side
        const points = this.currentPath;
        const npoints = points.length;
        
        // Check if closed shape
        const firstLastSame = npoints > 2 && 
            Math.abs(points[0].x - points[npoints-1].x) < 0.1 &&
            Math.abs(points[0].y - points[npoints-1].y) < 0.1;
        
        // Build line info like C code
        const lines = [];
        for (let i = 1; i < npoints; i++) {
            const line = {};
            line.isFirst = i === 1;
            line.isLast = i === npoints - 1;
            
            // Basic line properties
            line.x0 = points[i-1].x;
            line.y0 = points[i-1].y;
            line.x1 = points[i].x;
            line.y1 = points[i].y;
            line.angle = Math.atan2(line.y1 - line.y0, line.x1 - line.x0);
            line.sinA = Math.sin(line.angle);
            line.cosA = Math.cos(line.angle);
            line.len = Math.sqrt(Math.pow(line.x1 - line.x0, 2) + Math.pow(line.y1 - line.y0, 2));
            
            // Connection flags
            line.hasPrev = (!line.isFirst || (line.isFirst && firstLastSame));
            line.hasNext = (!line.isLast || (line.isLast && firstLastSame));
            
            // Initialize thickness and shortening
            line.tl0 = line.tl1 = line.tr0 = line.tr1 = t;
            line.s0 = line.s1 = 0;
            
            lines.push(line);
        }
        
        const nlines = lines.length;
        
        // Normalize angle to [0, 2*PI] like C code's normalizef
        function normalizeAngle(a) {
            while (a > 2 * Math.PI) a -= 2 * Math.PI;
            while (a < 0) a += 2 * Math.PI;
            return a;
        }
        
        // Compute adjustments for connected segments (exactly like C)
        for (let i = 0; i < nlines; i++) {
            const line = lines[i];
            const pline = lines[(nlines + i - 1) % nlines];
            
            if (line.hasPrev) {
                const pa2a = normalizeAngle(pline.angle - line.angle);
                const a2pa = normalizeAngle(line.angle - pline.angle);
                const maxShorten = Math.min(line.len, pline.len) / 2.0;
                
                if (Math.min(a2pa, pa2a) <= (Math.PI / 2 + 0.0001)) {
                    if (a2pa < pa2a) {
                        const shorten = t * Math.sin(a2pa/2) / Math.cos(a2pa/2);
                        const a = (Math.PI - a2pa) / 2;
                        if (shorten > maxShorten) {
                            line.s0 = pline.s1 = maxShorten;
                            line.tr0 = pline.tr1 = maxShorten * Math.sin(a) / Math.cos(a);
                        } else {
                            line.s0 = pline.s1 = shorten;
                        }
                    } else {
                        const shorten = t * Math.sin(pa2a/2) / Math.cos(pa2a/2);
                        const a = (Math.PI - pa2a) / 2;
                        if (shorten > maxShorten) {
                            line.s0 = pline.s1 = maxShorten;
                            line.tl0 = pline.tl1 = maxShorten * Math.sin(a) / Math.cos(a);
                        } else {
                            line.s0 = pline.s1 = shorten;
                        }
                    }
                } else {
                    line.hasPrev = false;
                }
            }
            
            if (!line.hasPrev && i > 0) {
                lines[i-1].hasNext = false;
            }
        }
        
        // Compute line geometry (apply shortening and thickness adjustments)
        for (let i = 0; i < nlines; i++) {
            const line = lines[i];
            
            // Apply shortening
            line.x0 = line.x0 + line.s0 * line.cosA;
            line.y0 = line.y0 + line.s0 * line.sinA;
            line.x1 = line.x1 - line.s1 * line.cosA;
            line.y1 = line.y1 - line.s1 * line.sinA;
            
            // Compute corners with adjusted thickness
            line.xl0 = line.x0 + line.tl0 * line.sinA;
            line.yl0 = line.y0 - line.tl0 * line.cosA;
            line.xr0 = line.x0 - line.tr0 * line.sinA;
            line.yr0 = line.y0 + line.tr0 * line.cosA;
            line.xl1 = line.x1 + line.tl1 * line.sinA;
            line.yl1 = line.y1 - line.tl1 * line.cosA;
            line.xr1 = line.x1 - line.tr1 * line.sinA;
            line.yr1 = line.y1 + line.tr1 * line.cosA;
            
            // Compute tips for endcaps
            line.xlt0 = line.xl0 - t * line.cosA;
            line.ylt0 = line.yl0 - t * line.sinA;
            line.xrt0 = line.xr0 - t * line.cosA;
            line.yrt0 = line.yr0 - t * line.sinA;
            line.xlt1 = line.xl1 + t * line.cosA;
            line.ylt1 = line.yl1 + t * line.sinA;
            line.xrt1 = line.xr1 + t * line.cosA;
            line.yrt1 = line.yr1 + t * line.sinA;
        }
        
        // Now draw the lines
        const TEXTURE_SIZE = 64;
        const HALF_TEXTURE_SIZE = 32;
        
        for (let i = 0; i < nlines; i++) {
            const line = lines[i];
            const pline = i > 0 ? lines[i-1] : lines[nlines-1];
            
            
            // Draw fan for connection to previous segment
            if (line.hasPrev) {
                const pa2a = normalizeAngle(pline.angle - line.angle);
                const a2pa = normalizeAngle(line.angle - pline.angle);
                
                if (a2pa < pa2a) {
                    // Inside of fan on right
                    const fanT = line.tl0 + line.tr0;
                    const s = HALF_TEXTURE_SIZE + (line.tr0 / t * HALF_TEXTURE_SIZE);
                    this._drawFan(line.xr0, line.yr0, pline.angle, line.angle, fanT, s / TEXTURE_SIZE, 0);
                } else {
                    // Inside of fan on left
                    const fanT = line.tl0 + line.tr0;
                    const s = HALF_TEXTURE_SIZE - (line.tl0 / t * HALF_TEXTURE_SIZE);
                    this._drawFan(line.xl0, line.yl0, pline.angle, line.angle, fanT, s / TEXTURE_SIZE, 1.0);
                }
            }
            
            // Texture coordinates based on adjusted thickness
            const tl0 = (HALF_TEXTURE_SIZE - (line.tl0 / t) * HALF_TEXTURE_SIZE) / TEXTURE_SIZE;
            const tl1 = (HALF_TEXTURE_SIZE - (line.tl1 / t) * HALF_TEXTURE_SIZE) / TEXTURE_SIZE;
            const tr0 = (HALF_TEXTURE_SIZE + (line.tr0 / t) * HALF_TEXTURE_SIZE) / TEXTURE_SIZE;
            const tr1 = (HALF_TEXTURE_SIZE + (line.tr1 / t) * HALF_TEXTURE_SIZE) / TEXTURE_SIZE;
            const vc = 0.5;
            
            // Main line segment
            this.points.push({
                x: line.xr0, y: line.yr0, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tr0, v: vc
            });
            this.points.push({
                x: line.xr1, y: line.yr1, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tr1, v: vc
            });
            this.points.push({
                x: line.xl1, y: line.yl1, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tl1, v: vc
            });
            this.points.push({
                x: line.xl0, y: line.yl0, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tl0, v: vc
            });
            this.points.push({
                x: line.xr0, y: line.yr0, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tr0, v: vc
            });
            this.points.push({
                x: line.xl1, y: line.yl1, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: tl1, v: vc
            });
            
            // Draw start cap
            if (!line.hasPrev) {
                this.points.push({
                    x: line.xl0, y: line.yl0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl0, v: vc
                });
                this.points.push({
                    x: line.xlt0, y: line.ylt0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl0, v: 1.0
                });
                this.points.push({
                    x: line.xr0, y: line.yr0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr0, v: vc
                });
                this.points.push({
                    x: line.xr0, y: line.yr0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr0, v: vc
                });
                this.points.push({
                    x: line.xlt0, y: line.ylt0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl0, v: 1.0
                });
                this.points.push({
                    x: line.xrt0, y: line.yrt0, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr0, v: 1.0
                });
            }
            
            // Draw end cap
            if (!line.hasNext) {
                this.points.push({
                    x: line.xlt1, y: line.ylt1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl1, v: 0.0
                });
                this.points.push({
                    x: line.xl1, y: line.yl1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl1, v: vc
                });
                this.points.push({
                    x: line.xr1, y: line.yr1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr1, v: vc
                });
                this.points.push({
                    x: line.xlt1, y: line.ylt1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tl1, v: 0.0
                });
                this.points.push({
                    x: line.xr1, y: line.yr1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr1, v: vc
                });
                this.points.push({
                    x: line.xrt1, y: line.yrt1, z: 0,
                    r: this.r, g: this.g, b: this.b, a: 1,
                    u: tr1, v: 0.0
                });
            }
        }
        
        this.currentPath = [];
    }
    
    _drawFan(cx, cy, startAngle, endAngle, thickness, s, e) {
        // Normalize angle to [0, 2*PI] like C code's normalizef
        function normalizeAngle(a) {
            while (a > 2 * Math.PI) a -= 2 * Math.PI;
            while (a < 0) a += 2 * Math.PI;
            return a;
        }
        
        const pa2a = normalizeAngle(endAngle - startAngle);
        const a2pa = normalizeAngle(startAngle - endAngle);
        
        let angles = [];
        let t = thickness;
        
        // Match C code logic for angle selection and thickness sign
        if (a2pa < pa2a) {
            t = -t;  // Negate thickness
            const nsteps = Math.max(1, Math.round(a2pa / (Math.PI / 8)));
            // a2pa is normalize(startAngle - endAngle), so adding it to endAngle moves toward startAngle
            for (let i = 0; i <= nsteps; i++) {
                angles.push(endAngle + i * a2pa / nsteps);
            }
        } else {
            const nsteps = Math.max(1, Math.round(pa2a / (Math.PI / 8)));
            // pa2a is normalize(endAngle - startAngle), so adding it to startAngle moves toward endAngle
            for (let i = 0; i <= nsteps; i++) {
                angles.push(startAngle + i * pa2a / nsteps);
            }
        }
        
        // Draw the fan triangles
        for (let i = 1; i < angles.length; i++) {
            // Match C code: use sin for x, -cos for y
            this.points.push({
                x: cx + t * Math.sin(angles[i-1]), 
                y: cy - t * Math.cos(angles[i-1]), 
                z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: e, v: 0.5
            });
            this.points.push({
                x: cx, y: cy, z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: s, v: 0.5
            });
            this.points.push({
                x: cx + t * Math.sin(angles[i]), 
                y: cy - t * Math.cos(angles[i]), 
                z: 0,
                r: this.r, g: this.g, b: this.b, a: 1,
                u: e, v: 0.5
            });
        }
    }
    
    update() {
        const gl = this.gl;
        this.frameCount++;
        
        // Always update the current buffer and advance step
        // This ensures trail persistence even when no new geometry is added
        if (this.points.length > 0) {
            const data = new Float32Array(this.points.length * 9);
            for (let i = 0; i < this.points.length; i++) {
                const p = this.points[i];
                const base = i * 9;
                data[base] = p.x;
                data[base + 1] = p.y;
                data[base + 2] = p.z;
                data[base + 3] = p.r;
                data[base + 4] = p.g;
                data[base + 5] = p.b;
                data[base + 6] = p.a;
                data[base + 7] = p.u;
                data[base + 8] = p.v;
            }
            
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[this.step]);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            this.bufferNPoints[this.step] = this.points.length;
        } else {
            // Even if no new points, mark this buffer as empty and advance
            this.bufferNPoints[this.step] = 0;
        }
        
        this.points = [];
        this.step = (this.step + 1) % this.decaySteps;
        
        // Render to scene framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.scene);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 1); // Original uses alpha = 1
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Use standard alpha blending
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Setup program for drawing lines
        const fbProgram = this.programs.fb;
        gl.useProgram(fbProgram);
        
        // Set projection matrix
        const projection = this._orthoMatrix(0, this.width, this.height, 0, -1, 1);
        gl.uniformMatrix4fv(fbProgram.uniforms.projectionMatrix, false, projection);
        
        // Set model view matrix (identity)
        const modelView = this._identityMatrix();
        gl.uniformMatrix4fv(fbProgram.uniforms.modelViewMatrix, false, modelView);
        
        // Bind line texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.line);
        gl.uniform1i(fbProgram.uniforms.texture, 0);
        
        // Draw all buffered lines with decay - oldest first, newest last
        let buffersDrawn = 0;
        for (let i = this.decaySteps - 1; i >= 0; i--) {
            const bufIdx = (this.step - i - 1 + this.decaySteps) % this.decaySteps;
            if (this.bufferNPoints[bufIdx] === 0) continue;
            
            // Calculate decay based on how many frames old this is
            // i = 0 means newest (just about to be overwritten), i = decaySteps-1 means oldest
            let alpha = 1.0;
            if (i === 0) {
                // Newest frame - full brightness
                alpha = 1.0;
            } else {
                // Apply exponential decay
                alpha = Math.pow(this.decay, i);
            }
            
            buffersDrawn++;
            
            // Debug: log every 60 frames
            if (this.frameCount % 60 === 0 && buffersDrawn === 1) {
                console.log(`Drawing ${buffersDrawn} buffers, decay=${this.decay}, steps=${this.decaySteps}, current step=${this.step}`);
                console.log(`Buffer ${bufIdx}: age=${i}, alpha=${alpha.toFixed(3)}, points=${this.bufferNPoints[bufIdx]}`);
            }
            
            gl.uniform1f(fbProgram.uniforms.alpha, alpha);
            
            // Setup vertex attributes
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[bufIdx]);
            
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0); // position
            
            gl.enableVertexAttribArray(1);
            gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 36, 12); // color
            
            gl.enableVertexAttribArray(2);
            gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 36, 28); // texcoord
            
            gl.drawArrays(gl.TRIANGLES, 0, this.bufferNPoints[bufIdx]);
        }
        
        // Debug: log total buffers drawn
        if (this.frameCount % 60 === 0 && buffersDrawn > 0) {
            console.log(`Total buffers drawn: ${buffersDrawn}`);
        }
        
        // Apply glow effect if brightness > 0
        if (this.brightness > 0) {
            this._applyGlow();
        }
        
        // Blit to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.width, this.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Reset to normal blending for screen composite
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        const screenProgram = this.programs.screen;
        gl.useProgram(screenProgram);
        
        gl.uniformMatrix4fv(screenProgram.uniforms.projectionMatrix, false, projection);
        gl.uniformMatrix4fv(screenProgram.uniforms.modelViewMatrix, false, modelView);
        gl.uniform1f(screenProgram.uniforms.alpha, 1.0);
        gl.uniform1f(screenProgram.uniforms.mult, 1.0);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.scene);
        gl.uniform1i(screenProgram.uniforms.texture, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.screen);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 20, 12);
        gl.disableVertexAttribArray(1);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Add glow on top with additive blending
        if (this.brightness > 0) {
            gl.blendFunc(gl.ONE, gl.ONE);
            gl.uniform1f(screenProgram.uniforms.mult, this._glowFinMult || 1.25);
            gl.bindTexture(gl.TEXTURE_2D, this.textures.glow1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
    
    _applyGlow() {
        const gl = this.gl;
        const blurProgram = this.programs.blur;
        
        // Calculate glow multipliers like the original
        const glowIterMult = 1.05 + ((this.brightness - 1.0) / 5.0);
        const glowFinMult = 1.25 + ((this.brightness - 1.0) / 2.0);
        
        // Setup matrices for glow
        const projection = this._orthoMatrix(0, this.glowWidth, this.glowHeight, 0, -1, 1);
        const modelView = this._identityMatrix();
        
        gl.useProgram(blurProgram);
        gl.uniformMatrix4fv(blurProgram.uniforms.projectionMatrix, false, projection);
        gl.uniformMatrix4fv(blurProgram.uniforms.modelViewMatrix, false, modelView);
        gl.uniform1f(blurProgram.uniforms.alpha, 1.0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers.glow);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 20, 12);
        
        // Multiple blur passes based on brightness (like original)
        const npasses = Math.floor(this.brightness * 4);
        
        // First pass: downsample scene to glow1
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.glow1);
        gl.viewport(0, 0, this.glowWidth, this.glowHeight);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.uniform2f(blurProgram.uniforms.scale, 1.0 / this.width, 1.0 / this.height);
        gl.uniform1f(blurProgram.uniforms.mult, glowIterMult);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.scene);
        gl.uniform1i(blurProgram.uniforms.texture, 0);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Multiple blur passes ping-ponging between buffers
        for (let pass = 0; pass < npasses; pass++) {
            // Horizontal blur: glow1 -> glow0
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.glow0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(blurProgram.uniforms.scale, 1.0 / this.glowWidth, 0);
            gl.uniform1f(blurProgram.uniforms.mult, glowIterMult);
            gl.bindTexture(gl.TEXTURE_2D, this.textures.glow1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            
            // Vertical blur: glow0 -> glow1
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.glow1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(blurProgram.uniforms.scale, 0, 1.0 / this.glowHeight);
            gl.uniform1f(blurProgram.uniforms.mult, glowIterMult);
            gl.bindTexture(gl.TEXTURE_2D, this.textures.glow0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        
        // Store final glow multiplier for screen composite
        this._glowFinMult = glowFinMult;
    }
    
    _getEffectiveThickness() {
        if (this.thickness !== null) {
            return this.thickness * this.scale;
        } else {
            // Auto-calculate thickness - matching original
            const v = 0.01 * (this.width + this.height) / 2.0 * this.scale;
            return Math.max(v, 6);
        }
    }
    
    _orthoMatrix(left, right, bottom, top, near, far) {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);
        
        return new Float32Array([
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, 2 * nf, 0,
            (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
        ]);
    }
    
    _identityMatrix() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    
    // Public API methods
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.glowWidth = Math.floor(width / 3);
        this.glowHeight = Math.floor(height / 3);
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Reinitialize framebuffers with new size
        this._initFramebuffers();
        this._initVertexBuffers();
        this.clear();
    }
    
    setColor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
    
    setTransform(offsetX, offsetY, scale) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.scale = scale;
    }
    
    setDecaySteps(steps) {
        steps = Math.min(60, Math.max(1, steps));
        this.decaySteps = steps;
        
        // Reinitialize buffers
        const gl = this.gl;
        this.buffers = [];
        this.bufferNPoints = [];
        for (let i = 0; i < steps; i++) {
            this.buffers[i] = gl.createBuffer();
            this.bufferNPoints[i] = 0;
        }
        this.step = 0;
    }
    
    setDecay(decay) {
        this.decay = decay;
    }
    
    setInitialDecay(decay) {
        this.initialDecay = decay;
    }
    
    setBrightness(brightness) {
        this.brightness = brightness;
    }
    
    setThickness(thickness) {
        this.thickness = thickness;
    }
    
    setDefaultThickness() {
        this.thickness = null;
    }
    
    getSize() {
        return { width: this.width, height: this.height };
    }
}
