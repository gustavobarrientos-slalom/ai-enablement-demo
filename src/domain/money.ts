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

/** Like `parseAmountToCents` but allows zero, for individual custom shares. */
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
