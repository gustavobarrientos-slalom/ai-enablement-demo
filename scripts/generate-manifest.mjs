import { mkdir, writeFile } from 'node:fs/promises';
import { VITE_BASE_PATH } from '../pwa-base.mjs';
import { THEME_COLORS } from '../pwa-theme-colors.mjs';

const icon = (src, sizes, purpose) => ({
  src: `${VITE_BASE_PATH}${src}`,
  sizes,
  type: 'image/png',
  ...(purpose ? { purpose } : {}),
});

const manifest = {
  name: 'Split',
  short_name: 'Split',
  display: 'standalone',
  scope: VITE_BASE_PATH,
  start_url: VITE_BASE_PATH,
  theme_color: THEME_COLORS.light,
  background_color: '#f7f4ef',
  icons: [
    icon('icons/icon-192.png', '192x192'),
    icon('icons/icon-512.png', '512x512'),
    icon('icons/icon-maskable-512.png', '512x512', 'maskable'),
  ],
};

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../public/manifest.webmanifest', import.meta.url),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
