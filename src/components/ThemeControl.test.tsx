import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeControl } from './ThemeControl';
import { THEME_STORAGE_KEY } from '../ui/theme';

let systemPrefersDark = false;
let onMediaChange: ((event: MediaQueryListEvent) => void) | undefined;

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      get matches() {
        return systemPrefersDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (
        _type: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        onMediaChange = listener;
      },
      removeEventListener: vi.fn(),
    })),
  });
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  systemPrefersDark = false;
  onMediaChange = undefined;
  vi.restoreAllMocks();
});

describe('ThemeControl', () => {
  it('cycles preferences, renders the matching icon, and persists each choice', () => {
    mockMatchMedia();
    render(<ThemeControl />);

    const button = screen.getByRole('button', {
      name: 'Change theme (currently system)',
    });
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'circle-half-stroke');

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'sun');
    expect(document.documentElement).not.toHaveClass('dark');

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'moon');
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(button.querySelector('svg')).toHaveAttribute('data-icon', 'circle-half-stroke');
  });

  it('restores a valid saved preference when mounted again', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    mockMatchMedia();

    const firstRender = render(<ThemeControl />);
    expect(
      screen.getByRole('button', { name: 'Change theme (currently dark)' }),
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');

    firstRender.unmount();
    render(<ThemeControl />);
    expect(
      screen.getByRole('button', { name: 'Change theme (currently dark)' }),
    ).toBeInTheDocument();
  });

  it('updates the effective theme on system changes only while system is selected', () => {
    mockMatchMedia();
    render(<ThemeControl />);

    systemPrefersDark = true;
    act(() => onMediaChange?.({ matches: true } as MediaQueryListEvent));
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Change theme (currently system)' }));
    expect(document.documentElement).not.toHaveClass('dark');

    systemPrefersDark = true;
    act(() => onMediaChange?.({ matches: true } as MediaQueryListEvent));
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('falls back to system for invalid persisted preferences', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    mockMatchMedia();
    render(<ThemeControl />);

    expect(
      screen.getByRole('button', { name: 'Change theme (currently system)' }),
    ).toBeInTheDocument();
  });
});
