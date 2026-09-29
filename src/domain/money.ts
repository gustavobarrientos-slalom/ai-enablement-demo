import { err, ok, type ExpenseError, type Result } from './types';

const AMOUNT_PATTERN = /^\d+(\.\d*)?$|^\.\d+$/;

/**
 * Parses a decimal amount string into integer cents using string manipulation.
 * Multiplying by 100 in floating point would corrupt values like 10.075.
 */
export function parseAmountToCents(raw: string): Result<number, ExpenseError> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return err('INVALID_AMOUNT');
  }

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  if (!AMOUNT_PATTERN.test(unsigned)) {
    return err('INVALID_AMOUNT');
  }

  const [wholePart = '', fractionPart = ''] = unsigned.split('.');

  if (fractionPart.length > 2) {
    return err('TOO_MANY_DECIMALS');
  }

  const whole = wholePart === '' ? 0 : Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, '0'), 10);
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents)) {
    return err('INVALID_AMOUNT');
  }

  if (negative || cents <= 0) {
    return err('AMOUNT_NOT_POSITIVE');
  }

  return ok(cents);
}

/**
 * Converts a percentage tip to cents. Integer arithmetic with a floor, so the
 * recorded tip never exceeds the stated percentage: 15% of 10001 is 1500.15
 * cents, which floors to 1500.
 */
export function tipCentsFromPercent(amountCents: number, percent: number): number {
  return Math.floor((amountCents * percent) / 100);
}

/** Whole percentages from 0 to 100. `12.5%` is expressible as a fixed tip. */
export function parseTipPercent(raw: string): Result<number, ExpenseError> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return ok(0);
  }

  if (trimmed.startsWith('-')) {
    return err('NEGATIVE_TIP');
  }

  if (!/^\d+(\.\d*)?$/.test(trimmed)) {
    return err('TIP_PERCENT_NOT_INTEGER');
  }

  if (trimmed.includes('.')) {
    const [, fractionPart = ''] = trimmed.split('.');

    // `10.` and `10.0` still denote a whole number; `12.5` does not.
    if (/[1-9]/.test(fractionPart)) {
      return err('TIP_PERCENT_NOT_INTEGER');
    }
  }

  const percent = Number.parseInt(trimmed.split('.')[0] ?? '', 10);

  if (!Number.isSafeInteger(percent)) {
    return err('TIP_PERCENT_NOT_INTEGER');
  }

  if (percent > 100) {
    return err('TIP_PERCENT_OUT_OF_RANGE');
  }

  return ok(percent);
}

/** A fixed tip in MXN. Unlike an amount, zero is allowed. */
export function parseTipFixed(raw: string): Result<number, ExpenseError> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return ok(0);
  }

  if (trimmed.startsWith('-')) {
    return err('NEGATIVE_TIP');
  }

  if (!AMOUNT_PATTERN.test(trimmed)) {
    return err('INVALID_AMOUNT');
  }

  const [wholePart = '', fractionPart = ''] = trimmed.split('.');

  if (fractionPart.length > 2) {
    return err('TIP_TOO_MANY_DECIMALS');
  }

  const whole = wholePart === '' ? 0 : Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, '0'), 10);
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents)) {
    return err('INVALID_AMOUNT');
  }

  return ok(cents);
}
export function parseShareToCents(raw: string): Result<number, ExpenseError> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return ok(0);
  }

  if (trimmed.startsWith('-')) {
    return err('NEGATIVE_SHARE');
  }

  const [wholePart = '', fractionPart = ''] = trimmed.split('.');

  if (!AMOUNT_PATTERN.test(trimmed)) {
    return err('INVALID_AMOUNT');
  }

  if (fractionPart.length > 2) {
    return err('TOO_MANY_DECIMALS');
  }

  const whole = wholePart === '' ? 0 : Number.parseInt(wholePart, 10);
  const fraction = Number.parseInt(fractionPart.padEnd(2, '0'), 10);
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents)) {
    return err('INVALID_AMOUNT');
  }

  return ok(cents);
}
