import { terser } from '@rollup/plugin-terser';

export default [
  // ES Module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'es'
    }
  },
  // CommonJS build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs'
    }
  },
  // UMD build (for browser use via script tag)
  {
    input: 'src/index.js',
    output: {
      file: 'dist/vector-display.umd.js',
      format: 'umd',
      name: 'VectorDisplay',
      globals: {}
    }
  },
  // Minified UMD build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/vector-display.umd.min.js',
      format: 'umd',
      name: 'VectorDisplay',
      globals: {}
    },
    plugins: [terser()]
  }
];