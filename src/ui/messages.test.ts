import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES, NO_EXPENSES_MESSAGE, errorMessage, splitDifferenceLabel } from './messages';

describe('errorMessage', () => {
  it('returns null when there is no error', () => {
    expect(errorMessage(null)).toBeNull();
  });

  it('has non-empty English copy for every error code', () => {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      expect(message, code).toBeTruthy();
    }
  });

  it('maps a referenced participant to the expected copy', () => {
    expect(errorMessage('PARTICIPANT_HAS_EXPENSES')).toBe('Has associated expenses');
  });
});

describe('splitDifferenceLabel', () => {
  it('returns null when the split is balanced', () => {
    expect(splitDifferenceLabel(0)).toBeNull();
  });

  it('reports remaining cents when shares fall short', () => {
    expect(splitDifferenceLabel(-2500)).toBe('$25.00 remaining');
  });

  it('reports excess cents when shares exceed the total', () => {
    expect(splitDifferenceLabel(1)).toBe('$0.01 over');
  });
});

describe('empty state copy', () => {
  it('uses the wording from the spec', () => {
    expect(NO_EXPENSES_MESSAGE).toBe('No expenses yet');
  });
});
