/// <reference path="./pwa-modules.d.ts" />

import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { assertDesktopEnv, resolveBasePath } from './pwa-base.mjs';

// Pages needs `base` to equal the repository name; the Tauri webview serves from `/`.
export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };

  assertDesktopEnv(env, command);

  return {
    base: resolveBasePath(env),
    plugins: [react()],
    // Keep Tauri's own messages visible and use a fixed port for `devUrl`.
    clearScreen: false,
    server: { port: 5173, strictPort: true },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
