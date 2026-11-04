import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the same build works at a domain root and under a
  // GitHub Pages project path (/<repo>/). Routing is hash-based, so paths never
  // change after load.
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
  },
});
