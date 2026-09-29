import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VITE_BASE_PATH } from '../pwa-base.mjs';
import { THEME_COLORS } from './ui/theme';

const manifest = JSON.parse(
  readFileSync('public/manifest.webmanifest', 'utf8'),
) as {
  name: string;
  short_name: string;
  display: string;
  scope: string;
  start_url: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    purpose?: string;
  }>;
};

describe('PWA manifest', () => {
  it('declares the standalone Split app and required icons', () => {
    expect(manifest.name).toBe('Split');
    expect(manifest.short_name).toBe('Split');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe(THEME_COLORS.light);
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );
    expect(
      manifest.icons.some((icon) => icon.purpose?.includes('maskable')),
    ).toBe(true);
  });

  it('base-prefixes every manifest URL', () => {
    expect(manifest.scope.startsWith(VITE_BASE_PATH)).toBe(true);
    expect(manifest.start_url.startsWith(VITE_BASE_PATH)).toBe(true);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith(VITE_BASE_PATH)).toBe(true);
    }
  });

});

describe('PWA document integration', () => {
  it('links the manifest, Apple icon, and required meta tags', () => {
    const html = readFileSync('index.html', 'utf8');

    expect(html).toContain(
      '<link rel="manifest" href="%BASE_URL%manifest.webmanifest" />',
    );
    expect(html).toContain(
      '<link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />',
    );
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
    );
    expect(html).toContain(
      '<meta name="apple-mobile-web-app-title" content="Split" />',
    );
    expect(html).toContain('viewport-fit=cover');
  });

  it('does not register a service worker', () => {
    expect(readFileSync('src/main.tsx', 'utf8')).not.toMatch(
      /serviceWorker\.register/,
    );
  });
});
