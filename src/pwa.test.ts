import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VITE_BASE_PATH,
  assertDesktopEnv,
  isDesktopBuild,
  resolveBasePath,
} from '../pwa-base.mjs';
import { buildManifest } from '../pwa-manifest.mjs';
import { THEME_COLORS } from './ui/theme';

const manifest = buildManifest(VITE_BASE_PATH);

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

  it('roots every URL at / for the desktop build', () => {
    const desktop = buildManifest(resolveBasePath({ TAURI_ENV_PLATFORM: 'darwin' }));

    expect(desktop.scope).toBe('/');
    expect(desktop.icons.every((icon) => icon.src.startsWith('/icons/'))).toBe(true);
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

describe('build target', () => {
  it('uses the repository base for the Pages build', () => {
    expect(isDesktopBuild({})).toBe(false);
    expect(resolveBasePath({})).toBe('/ai-enablement-demo/');
  });

  it('uses the root base when the Tauri CLI sets TAURI_ENV_PLATFORM', () => {
    expect(isDesktopBuild({ TAURI_ENV_PLATFORM: 'darwin' })).toBe(true);
    expect(resolveBasePath({ TAURI_ENV_PLATFORM: 'windows' })).toBe('/');
  });

  it('fails a desktop build without an absolute https share URL', () => {
    for (const value of [undefined, '', 'not a url', 'http://owner.github.io/app/', '/relative/']) {
      expect(() =>
        assertDesktopEnv({ TAURI_ENV_PLATFORM: 'linux', VITE_SHARE_BASE_URL: value }),
      ).toThrow(/VITE_SHARE_BASE_URL/);
    }
  });

  it('accepts a desktop build with an https share URL', () => {
    expect(() =>
      assertDesktopEnv({
        TAURI_ENV_PLATFORM: 'linux',
        VITE_SHARE_BASE_URL: 'https://owner.github.io/ai-enablement-demo/',
      }),
    ).not.toThrow();
  });

  it('ignores the share URL variable for the Pages build', () => {
    expect(() => assertDesktopEnv({})).not.toThrow();
  });

  it('does not require the share URL for the desktop dev server', () => {
    expect(() => assertDesktopEnv({ TAURI_ENV_PLATFORM: 'darwin' }, 'serve')).not.toThrow();
    expect(() => assertDesktopEnv({ TAURI_ENV_PLATFORM: 'darwin' }, 'build')).toThrow(
      /VITE_SHARE_BASE_URL/,
    );
  });
});
