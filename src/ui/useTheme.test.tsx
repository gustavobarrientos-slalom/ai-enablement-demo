import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { THEME_COLORS, THEME_STORAGE_KEY } from './theme';
import { useTheme } from './useTheme';

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

afterEach(() => {
  localStorage.removeItem(THEME_STORAGE_KEY);
  document.documentElement.classList.remove('dark');
  document.head
    .querySelector('meta[name="theme-color"]')
    ?.remove();

  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', originalMatchMedia);
  } else {
    Reflect.deleteProperty(window, 'matchMedia');
  }
});

describe('useTheme theme-color side effect', () => {
  it('sets the theme-color meta tag on load', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);

    renderHook(() => useTheme());

    expect(meta.content).toBe(THEME_COLORS.light);
  });

  it('updates theme-color when the effective theme changes', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setThemePreference('dark');
    });

    expect(meta.content).toBe(THEME_COLORS.dark);
  });
});
