import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleHalfStroke, faMoon, faSun } from '../ui/icons';
import { nextThemePreference, type ThemePreference } from '../ui/theme';
import { useTheme } from '../ui/useTheme';

const THEME_ICONS = {
  system: faCircleHalfStroke,
  light: faSun,
  dark: faMoon,
} satisfies Record<ThemePreference, typeof faCircleHalfStroke>;

export function ThemeControl() {
  const { preference, setThemePreference } = useTheme();

  return (
    <button
      type="button"
      aria-label={`Change theme (currently ${preference})`}
      title={`Theme: ${preference}`}
      data-testid="theme-toggle"
      onClick={() => setThemePreference(nextThemePreference(preference))}
      className="ml-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text"
    >
      <FontAwesomeIcon icon={THEME_ICONS[preference]} />
    </button>
  );
}
