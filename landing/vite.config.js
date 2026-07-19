import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Baked identically into the client and SSR bundles so the prerendered
    // copyright year hydrates cleanly; the client then corrects it live.
    __BUILD_YEAR__: new Date().getFullYear(),
  },
});
