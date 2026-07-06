import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Paimal',
        short_name: 'Paimal',
        description: 'Paimal — Field Service Management',
        theme_color: '#E4881F',
        background_color: '#FBFAF7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: {
    modulePreload: {
      // Vite conservatively modulepreloads every chunk reachable from the
      // import graph, including recharts — even on the login page, before
      // auth. That defeats the point of lazy-loading it; only let it
      // preload truly-critical chunks.
      resolveDependencies: (_filename, deps) => deps.filter((dep) => !dep.includes('recharts')),
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-query': ['@tanstack/react-query'],
          recharts: ['recharts'],
        },
      },
    },
  },
});
