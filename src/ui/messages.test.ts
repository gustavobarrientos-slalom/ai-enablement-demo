import { describe, expect, it } from 'vitest';
import {
  ERROR_MESSAGES,
  NO_EXPENSES_MESSAGE,
  SETTLED_UP_MESSAGE,
  TRANSFERS_HEADING,
  errorMessage,
  splitDifferenceLabel,
  transferLabel,
} from './messages';

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

describe('settlement copy', () => {
  const participants = [
    { id: 'p1', name: 'Ana' },
    { id: 'p5', name: 'Diana' },
  ];

  it('uses the settled wording from the spec', () => {
    expect(SETTLED_UP_MESSAGE).toBe('Everyone is settled up');
  });

  it('maps the unbalanced nets error to its message', () => {
    expect(errorMessage('NETS_DO_NOT_SUM')).toBe('Balances do not add up');
  });

  it('formats a transfer as name arrow name amount', () => {
    expect(
      transferLabel({ fromId: 'p5', toId: 'p1', amountCents: 42000 }, participants),
    ).toBe('Diana -> Ana $420.00');
  });

  it('formats sub peso transfers', () => {
    expect(
      transferLabel({ fromId: 'p5', toId: 'p1', amountCents: 1 }, participants),
    ).toBe('Diana -> Ana $0.01');
  });

  it('never renders a negative amount in a transfer label', () => {
    const label = transferLabel(
      { fromId: 'p5', toId: 'p1', amountCents: 5333 },
      participants,
    );

    expect(label).not.toContain('-$');
    expect(label).toContain('$53.33');
  });

  it('does not claim the transfer count is minimal', () => {
    const copy = [TRANSFERS_HEADING, SETTLED_UP_MESSAGE].join(' ').toLowerCase();

    for (const word of ['minimum', 'minimal', 'fewest', 'optimal', 'least']) {
      expect(copy).not.toContain(word);
    }
  });
});
