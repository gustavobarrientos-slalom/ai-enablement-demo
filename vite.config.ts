import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base` must match the GitHub Pages repository name so assets resolve.
export default defineConfig({
  base: '/ai-enablement-demo/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
