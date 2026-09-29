import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  nextThemePreference,
  parseThemePreference,
  resolveEffectiveTheme,
  THEME_STORAGE_KEY,
} from './theme';

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

afterEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.classList.remove('dark');

  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  } else {
    Reflect.deleteProperty(window, 'matchMedia');
  }
});

describe('theme preferences', () => {
  it('defaults missing and invalid values to system', () => {
    expect(parseThemePreference(null)).toBe('system');
    expect(parseThemePreference('sepia')).toBe('system');
  });

  it.each(['system', 'light', 'dark'] as const)(
    'accepts the %s preference',
    (preference) => {
      expect(parseThemePreference(preference)).toBe(preference);
    },
  );

  it('resolves system preference from the operating system', () => {
    expect(resolveEffectiveTheme('system', false)).toBe('light');
    expect(resolveEffectiveTheme('system', true)).toBe('dark');
  });

  it('keeps explicit preferences independent of the operating system', () => {
    expect(resolveEffectiveTheme('light', true)).toBe('light');
    expect(resolveEffectiveTheme('dark', false)).toBe('dark');
  });

  it('cycles deterministically from system to light to dark and back', () => {
    expect(nextThemePreference('system')).toBe('light');
    expect(nextThemePreference('light')).toBe('dark');
    expect(nextThemePreference('dark')).toBe('system');
  });

  it('bootstraps the root theme in the document head before the app mounts', () => {
    const html = readFileSync('index.html', 'utf8');
    const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

    if (!bootstrap) {
      throw new Error('The inline theme bootstrap script is missing.');
    }

    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    document.documentElement.classList.remove('dark');
    window.eval(bootstrap);

    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('</head>'));
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<div id="root">'));
    expect(document.documentElement).toHaveClass('dark');
  });

  it('uses the system preference in the inline bootstrap when no choice is stored', () => {
    const html = readFileSync('index.html', 'utf8');
    localStorage.removeItem(THEME_STORAGE_KEY);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });

    const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

    if (!bootstrap) {
      throw new Error('The inline theme bootstrap script is missing.');
    }

    document.documentElement.classList.remove('dark');
    window.eval(bootstrap);

    expect(document.documentElement).toHaveClass('dark');

  });
});
