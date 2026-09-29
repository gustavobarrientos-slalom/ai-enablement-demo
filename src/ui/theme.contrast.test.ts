import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_COLORS } from './theme';

const css = readFileSync('src/index.css', 'utf8');

function tokenSet(selector: string): Record<string, string> {
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]+)\\}`))?.[1];

  if (!block) {
    throw new Error(`Missing theme token block: ${selector}`);
  }

  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[\da-fA-F]{6})/g)].map(
      ([, name, value]) => [name!, value!],
    ),
  );
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);

  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

const themes = {
  light: tokenSet(':root'),
  dark: tokenSet(':root.dark'),
};
const statusTokenPairs: [string, string][] = [
  ['primary-contrast', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['success-fg', 'success-bg'],
  ['warning-fg', 'warning-bg'],
  ['danger-fg', 'danger-bg'],
];

describe('theme color contrast', () => {
  it('coordinates surface chrome, primary actions, and quiet dividers in both modes', () => {
    expect(themes.light.surface).toBe(THEME_COLORS.light);
    expect(themes.dark.surface).toBe(THEME_COLORS.dark);
    expect(themes.light.primary).not.toBe(themes.light.text);
    expect(themes.dark.primary).not.toBe(themes.dark.text);
    for (const tokens of Object.values(themes)) {
      expect(tokens.divider).toBeDefined();
      expect(contrast(tokens.divider!, tokens.surface!)).toBeLessThan(
        contrast(tokens.border!, tokens.surface!),
      );
    }
  });

  it('keeps selected controls readable in both palettes', () => {
    for (const tokens of Object.values(themes)) {
      expect(contrast(tokens['on-primary-container']!, tokens['primary-container']!))
        .toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['primary-contrast']!, tokens.primary!))
        .toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens.text!, tokens['surface-muted']!))
        .toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens.primary!, tokens.surface!)).toBeGreaterThanOrEqual(3);
    }
  });

  it('renders expense segments as one connected outlined pill with a filled selection', () => {
    const track = css.match(/\.md-segmented\s*\{([^}]+)\}/)?.[1];
    const segment = css.match(/\.md-segment\s*\{([^}]+)\}/)?.[1];
    const highlight = css.match(/\.md-segmented::before\s*\{([^}]+)\}/)?.[1];
    const selected = css.match(/\.md-segment\[aria-checked='true'\]\s*\{([^}]+)\}/)?.[1];
    expect(track).toContain('relative flex w-full rounded-full border border-border bg-surface-muted p-0.5 shadow-inner');
    expect(track).not.toMatch(/\bgap-/);
    expect(segment).toContain('mobile-target');
    expect(segment).toContain('flex-1');
    expect(segment).toContain('rounded-full');
    expect(segment).toContain('px-1.5');
    expect(highlight).toContain('pointer-events-none');
    expect(highlight).toContain('bg-primary');
    expect(highlight).toContain('width: calc((100% - 4px) / 3)');
    expect(highlight).toMatch(/transition: transform \d+ms cubic-bezier/);
    expect(css).toContain(".md-segmented[data-segments='2']::before");
    expect(css).toContain(".md-segmented[data-selected-index='1']::before");
    expect(css).toContain(".md-segmented[data-selected-index='2']::before");
    expect(selected).toContain('text-primary-contrast');
    expect(css).toContain('.md-segment:focus-visible');
    expect(css).toContain(".md-segment[aria-checked='true']:focus-visible");
    expect(css).toContain('@apply outline-primary-contrast');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration: 0\.01ms !important/);
  });

  it('retains visible focus, error, and disabled treatments', () => {
    expect(css).toContain(".md-field[aria-invalid='true']:focus-visible");
    expect(css).toContain(".md-choice[aria-checked='true']");
    expect(css).toContain(".md-choice[aria-pressed='true']");
    expect(css).toContain(".md-segment[aria-checked='true']");
    expect(css).toContain('.md-segment:focus-visible');
    expect(css).toContain('.md-filled-button:disabled');
    expect(css).toContain('.md-check:disabled');
  });

  it('uses filled fields with floating labels, an underline, and legible error states', () => {
    const field = css.match(/\.md-field\s*\{([^}]+)\}/)?.[1];
    expect(field).toContain('rounded-t-lg rounded-b-none');
    expect(field).toContain('border-0 border-b-2 border-border bg-surface-muted');
    expect(css).toContain('.md-field:placeholder-shown:not(:focus) + .md-field-label');
    expect(css).toContain('.md-field:focus + .md-field-label');
    expect(css).toContain(".md-field[aria-invalid='true'] + .md-field-label");
    expect(css).toMatch(/\.md-field-label\s*\{[^}]*transition: top 200ms ease, transform 200ms ease, font-size 200ms ease, color 200ms ease/);
    expect(css).not.toContain('.md-field:focus::placeholder');
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*transition-duration: 0\.01ms !important/);
    expect(css).toContain('.md-field-compact');
    for (const tokens of Object.values(themes)) {
      expect(contrast(tokens.text!, tokens['surface-muted']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['text-muted']!, tokens['surface-muted']!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['danger-fg']!, tokens['surface-muted']!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(Object.entries(themes))('meets WCAG AA in %s mode', (_mode, tokens) => {
    for (const background of ['canvas', 'surface', 'surface-muted']) {
      expect(contrast(tokens.text!, tokens[background]!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tokens['text-muted']!, tokens[background]!)).toBeGreaterThanOrEqual(
        4.5,
      );
      expect(contrast(tokens.primary!, tokens[background]!)).toBeGreaterThanOrEqual(3);
      for (const foreground of ['success-fg', 'warning-fg', 'danger-fg']) {
        expect(contrast(tokens[foreground]!, tokens[background]!)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }

    for (const [foreground, background] of statusTokenPairs) {
      expect(contrast(tokens[foreground]!, tokens[background]!)).toBeGreaterThanOrEqual(
        4.5,
      );
    }

    for (const background of ['canvas', 'surface', 'surface-muted']) {
      expect(contrast(tokens.border!, tokens[background]!)).toBeGreaterThanOrEqual(3);
    }
  });
});
