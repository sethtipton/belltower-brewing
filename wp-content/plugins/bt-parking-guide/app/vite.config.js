import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/wp-content/plugins/bt-parking-guide/dist/',
  server: {
    port: 5174,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/wp-json': {
        target: 'http://belltower.local',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    manifest: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) {
            return 'three-core';
          }
          if (id.includes('/node_modules/@react-three/fiber/')) {
            return 'r3f-core';
          }
          if (id.includes('/node_modules/@react-three/drei/')) {
            return 'r3f-drei';
          }
          return undefined;
        },
      },
    }
  }
});
