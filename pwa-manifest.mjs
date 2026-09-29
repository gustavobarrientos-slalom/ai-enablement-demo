import { THEME_COLORS } from './pwa-theme-colors.mjs';

/** The web app manifest for a given base path (`/ai-enablement-demo/` on Pages, `/` on desktop). */
export function buildManifest(basePath) {
  const icon = (src, sizes, purpose) => ({
    src: `${basePath}${src}`,
    sizes,
    type: 'image/png',
    ...(purpose ? { purpose } : {}),
  });

  return {
    name: 'Split',
    short_name: 'Split',
    display: 'standalone',
    scope: basePath,
    start_url: basePath,
    theme_color: THEME_COLORS.light,
    background_color: '#f7f4ef',
    icons: [
      icon('icons/icon-192.png', '192x192'),
      icon('icons/icon-512.png', '512x512'),
      icon('icons/icon-maskable-512.png', '512x512', 'maskable'),
    ],
  };
}
