import { describe, expect, it } from 'vitest';
import {
  parseAmountToCents,
  parseShareToCents,
  parseTipFixed,
  parseTipPercent,
  tipCentsFromPercent,
} from './money';

describe('parseAmountToCents', () => {
  it.each([
    ['250', 25000],
    ['250.00', 25000],
    ['0.07', 7],
    ['10.5', 1050],
    ['10.50', 1050],
    ['.99', 99],
    ['  37.77  ', 3777],
    ['1000000', 100000000],
  ])('parses %s as %i cents', (raw, expected) => {
    expect(parseAmountToCents(raw)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['0', 'AMOUNT_NOT_POSITIVE'],
    ['0.00', 'AMOUNT_NOT_POSITIVE'],
    ['-5', 'AMOUNT_NOT_POSITIVE'],
    ['-0.01', 'AMOUNT_NOT_POSITIVE'],
    ['10.999', 'TOO_MANY_DECIMALS'],
    ['abc', 'INVALID_AMOUNT'],
    ['', 'INVALID_AMOUNT'],
    ['   ', 'INVALID_AMOUNT'],
    ['1,000', 'INVALID_AMOUNT'],
    ['1.2.3', 'INVALID_AMOUNT'],
  ])('rejects %s with %s', (raw, error) => {
    expect(parseAmountToCents(raw)).toEqual({ ok: false, error });
  });

  it('stays exact for known floating-point traps', () => {
    // Math.round(10.075 * 100) yields 1007, not 1008.
    expect(parseAmountToCents('10.07')).toEqual({ ok: true, value: 1007 });
    expect(parseAmountToCents('10.08')).toEqual({ ok: true, value: 1008 });
    expect(parseAmountToCents('0.1')).toEqual({ ok: true, value: 10 });
    expect(parseAmountToCents('0.2')).toEqual({ ok: true, value: 20 });
    expect(parseAmountToCents('0.29')).toEqual({ ok: true, value: 29 });
    expect(parseAmountToCents('1.005')).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
  });

  it('never relies on multiplying a float by 100', () => {
    // 8.115 * 100 === 811.4999999999999 in IEEE-754.
    expect(parseAmountToCents('8.11')).toEqual({ ok: true, value: 811 });
    expect(parseAmountToCents('8.12')).toEqual({ ok: true, value: 812 });
  });
});

describe('parseShareToCents', () => {
  it('treats an empty share as zero', () => {
    expect(parseShareToCents('')).toEqual({ ok: true, value: 0 });
  });

  it('allows an explicit zero', () => {
    expect(parseShareToCents('0')).toEqual({ ok: true, value: 0 });
  });

  it('parses a positive share', () => {
    expect(parseShareToCents('60.00')).toEqual({ ok: true, value: 6000 });
  });

  it('rejects a negative share', () => {
    expect(parseShareToCents('-1')).toEqual({ ok: false, error: 'NEGATIVE_SHARE' });
  });

  it('rejects more than two decimals', () => {
    expect(parseShareToCents('1.234')).toEqual({ ok: false, error: 'TOO_MANY_DECIMALS' });
  });
});

describe('tipCentsFromPercent', () => {
  it('converts a whole percentage', () => {
    expect(tipCentsFromPercent(25000, 10)).toBe(2500);
  });

  it('floors so the tip never exceeds the stated percentage', () => {
    // 15% of 10001 cents is 1500.15 cents.
    expect(tipCentsFromPercent(10001, 15)).toBe(1500);
  });

  it('floors a 10 percent tip on an odd amount', () => {
    // 10% of 10001 cents is 1000.1 cents.
    expect(tipCentsFromPercent(10001, 10)).toBe(1000);
  });

  it('returns zero for a zero percent tip', () => {
    expect(tipCentsFromPercent(10000, 0)).toBe(0);
  });

  it('returns the whole amount for a 100 percent tip', () => {
    expect(tipCentsFromPercent(10000, 100)).toBe(10000);
  });
});

describe('parseTipPercent', () => {
  it('parses a whole percentage', () => {
    expect(parseTipPercent('10')).toEqual({ ok: true, value: 10 });
  });

  it('treats an empty value as no tip', () => {
    expect(parseTipPercent('')).toEqual({ ok: true, value: 0 });
  });

  it('accepts zero', () => {
    expect(parseTipPercent('0')).toEqual({ ok: true, value: 0 });
  });

  it('accepts the upper bound', () => {
    expect(parseTipPercent('100')).toEqual({ ok: true, value: 100 });
  });

  it('rejects a fractional percentage', () => {
    expect(parseTipPercent('12.5')).toEqual({
      ok: false,
      error: 'TIP_PERCENT_NOT_INTEGER',
    });
  });

  it('accepts a trailing zero decimal as a whole number', () => {
    expect(parseTipPercent('10.0')).toEqual({ ok: true, value: 10 });
  });

  it('rejects a percentage above 100', () => {
    expect(parseTipPercent('101')).toEqual({
      ok: false,
      error: 'TIP_PERCENT_OUT_OF_RANGE',
    });
  });

  it('rejects a negative percentage', () => {
    expect(parseTipPercent('-5')).toEqual({ ok: false, error: 'NEGATIVE_TIP' });
  });

  it('rejects non-numeric input', () => {
    expect(parseTipPercent('abc')).toEqual({
      ok: false,
      error: 'TIP_PERCENT_NOT_INTEGER',
    });
  });
});

describe('parseTipFixed', () => {
  it('parses a fixed tip into cents', () => {
    expect(parseTipFixed('10.00')).toEqual({ ok: true, value: 1000 });
  });

  it('treats an empty value as no tip', () => {
    expect(parseTipFixed('')).toEqual({ ok: true, value: 0 });
  });

  it('accepts zero', () => {
    expect(parseTipFixed('0')).toEqual({ ok: true, value: 0 });
  });

  it('rejects a negative fixed tip', () => {
    expect(parseTipFixed('-10.00')).toEqual({ ok: false, error: 'NEGATIVE_TIP' });
  });

  it('rejects more than two decimals', () => {
    expect(parseTipFixed('10.999')).toEqual({
      ok: false,
      error: 'TIP_TOO_MANY_DECIMALS',
    });
  });

  it('does not use floating point for values that would corrupt', () => {
    expect(parseTipFixed('10.07')).toEqual({ ok: true, value: 1007 });
  });
});
