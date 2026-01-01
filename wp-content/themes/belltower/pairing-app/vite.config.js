import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/wp-content/themes/belltower/pairing-app/dist/',
  server: {
    port: 5173,
    proxy: {
      '/wp-json': {
        target: 'http://belltower.local',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: 'index.html'
    }
  }
});
