import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' supaya hasil build bisa di-host di subfolder mana pun
// (GitHub Pages, Vercel, Netlify, atau dibuka lewat tunnel HTTPS).
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
