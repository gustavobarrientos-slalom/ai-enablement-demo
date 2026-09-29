import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
  ['success-fg', 'success-bg'],
  ['warning-fg', 'warning-bg'],
  ['danger-fg', 'danger-bg'],
];

describe('theme color contrast', () => {
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
