import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The sample doesn't fix the public path. With a relative path, assets load from any folder
  base: './',
  build: {
    // three.js alone is about 700KB. This is a sample, so we don't split it. We only raise the warning limit
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    // '/src' starts from the project root.
    // fileURLToPath would need @types/node. This form needs no extra dependency.
    // vitest uses this config too, so the tests don't need the same setting.
    alias: { '@': '/src' },
  },
});
