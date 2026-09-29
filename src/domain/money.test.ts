import { describe, expect, it } from 'vitest';
import { parseAmountToCents, parseShareToCents } from './money';

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
