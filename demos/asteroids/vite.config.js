import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'vector-display': path.resolve(__dirname, '../../src/index.js')
    }
  }
});