import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the local Worker in dev — no CORS headers needed
      '/auth': 'http://localhost:8787',
      '/tables': 'http://localhost:8787',
      '/game': 'http://localhost:8787',
    },
  },
});
