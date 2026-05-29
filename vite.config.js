import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the built index.html can load assets via file:// inside Electron.
  base: './',
  server: { port: 5173, strictPort: true },
});
