import { THEME_COLORS } from '../../pwa-theme-colors.mjs';

export const THEME_STORAGE_KEY = 'split:theme';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export { THEME_COLORS };

/** Theme-invariant colors used for scanner-readable QR output. */
export const QR_COLORS = {
  dark: '#000000',
  light: '#FFFFFF',
} as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type EffectiveTheme = Exclude<ThemePreference, 'system'>;

export function parseThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference)
    ? (value as ThemePreference)
    : 'system';
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): EffectiveTheme {
  return preference === 'system'
    ? systemPrefersDark
      ? 'dark'
      : 'light'
    : preference;
}

export function nextThemePreference(
  preference: ThemePreference,
): ThemePreference {
  const index = THEME_PREFERENCES.indexOf(preference);

  return THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length] ?? 'system';
}
