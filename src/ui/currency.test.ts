import { describe, expect, it } from 'vitest';
import { formatCents } from './currency';

describe('formatCents', () => {
  it.each([
    [0, '$0.00'],
    [7, '$0.07'],
    [70, '$0.70'],
    [100, '$1.00'],
    [123456, '$1,234.56'],
    [-7, '-$0.07'],
    [-123456, '-$1,234.56'],
    [9999999999, '$99,999,999.99'],
  ])('formats %i cents as %s', (cents, expected) => {
    expect(formatCents(cents).replace(/\u00a0/g, ' ')).toBe(expected);
  });

  it('rejects amounts that are not integer cents', () => {
    expect(() => formatCents(10.5)).toThrow();
  });

  it('does not lose precision on large amounts', () => {
    expect(formatCents(1000000001).endsWith('.01')).toBe(true);
  });
});
