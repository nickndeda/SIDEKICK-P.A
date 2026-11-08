
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],

  root: join(__dirname, 'src/renderer'),

  base: './',

  build: {
    outDir: join(__dirname, 'dist/renderer'),
    emptyOutDir: true
  },

  server: {
    port: 3000
  }
});
