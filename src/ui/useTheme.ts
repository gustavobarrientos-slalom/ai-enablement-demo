import { useEffect, useState } from 'react';
import {
  parseThemePreference,
  resolveEffectiveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from './theme';

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch (error) {
    console.error('Unable to read the saved theme preference.', error);
    return 'system';
  }
}

function readSystemPreference(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState(readSystemPreference);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');

    if (!media) {
      return;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const effectiveTheme = resolveEffectiveTheme(preference, systemPrefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [effectiveTheme]);

  function setThemePreference(nextPreference: ThemePreference) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    } catch (error) {
      console.error('Unable to save the theme preference.', error);
    }

    setPreference(nextPreference);
  }

  return { preference, effectiveTheme, setThemePreference };
}
