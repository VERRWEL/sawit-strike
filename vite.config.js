import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relatif biar bisa di-host di subfolder
export default defineConfig({ 
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000
  },
  server: {
    allowedHosts: ['.trycloudflare.com'],
  }
});
