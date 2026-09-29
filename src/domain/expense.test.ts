import { describe, expect, it } from 'vitest';
import {
  CONCEPT_MAX_LENGTH,
  centsToInput,
  createEmptyDraft,
  draftFromExpense,
  expensesTotal,
  isExpenseConsistent,
  validateExpense,
} from './expense';
import type { Expense, ExpenseDraft, Participant } from './types';

const ana: Participant = { id: '1', name: 'Ana' };
const luis: Participant = { id: '2', name: 'Luis' };
const carla: Participant = { id: '3', name: 'Carla' };
const participants = [ana, luis, carla];

function draft(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return {
    concept: 'Dinner',
    amount: '250.00',
    payerId: ana.id,
    splitMode: 'equal',
    beneficiaryIds: [ana.id, luis.id, carla.id],
    customAmounts: {},
    ...overrides,
  };
}

describe('validateExpense', () => {
  it('builds an expense from a valid draft', () => {
    const result = validateExpense(draft(), participants, 'e1');

    expect(result).toEqual({
      ok: true,
      value: {
        id: 'e1',
        concept: 'Dinner',
        amountCents: 25000,
        payerId: ana.id,
        splitMode: 'equal',
        shares: [
          { participantId: ana.id, amountCents: 8334 },
          { participantId: luis.id, amountCents: 8333 },
          { participantId: carla.id, amountCents: 8333 },
        ],
      },
    });
  });

  it('trims the concept', () => {
    const result = validateExpense(draft({ concept: '  Taxi  ' }), participants, 'e1');

    expect(result.ok && result.value.concept).toBe('Taxi');
  });

  it.each([
    ['empty concept', { concept: '' }, 'EMPTY_CONCEPT'],
    ['whitespace-only concept', { concept: '   ' }, 'EMPTY_CONCEPT'],
    ['concept too long', { concept: 'x'.repeat(CONCEPT_MAX_LENGTH + 1) }, 'CONCEPT_TOO_LONG'],
    ['empty amount', { amount: '' }, 'INVALID_AMOUNT'],
    ['non-numeric amount', { amount: 'abc' }, 'INVALID_AMOUNT'],
    ['zero amount', { amount: '0' }, 'AMOUNT_NOT_POSITIVE'],
    ['negative amount', { amount: '-10' }, 'AMOUNT_NOT_POSITIVE'],
    ['three decimals', { amount: '10.005' }, 'TOO_MANY_DECIMALS'],
    ['unknown payer', { payerId: 'missing' }, 'UNKNOWN_PARTICIPANT'],
    ['no beneficiaries', { beneficiaryIds: [] }, 'NO_BENEFICIARIES'],
  ])('rejects %s', (_label, overrides, expected) => {
    const result = validateExpense(draft(overrides), participants, 'e1');

    expect(result).toEqual({ ok: false, error: expected });
  });

  it('rejects an unknown beneficiary', () => {
    const result = validateExpense(
      draft({ beneficiaryIds: [ana.id, 'missing'] }),
      participants,
      'e1',
    );

    expect(result).toEqual({ ok: false, error: 'UNKNOWN_PARTICIPANT' });
  });

  it('accepts a payer who is not a beneficiary', () => {
    const result = validateExpense(
      draft({ amount: '100.00', payerId: ana.id, beneficiaryIds: [luis.id, carla.id] }),
      participants,
      'e1',
    );

    expect(result.ok && result.value.shares).toEqual([
      { participantId: luis.id, amountCents: 5000 },
      { participantId: carla.id, amountCents: 5000 },
    ]);
  });

  it('accepts a custom split that sums exactly to the total', () => {
    const result = validateExpense(
      draft({
        amount: '100.00',
        splitMode: 'custom',
        beneficiaryIds: [ana.id, luis.id],
        customAmounts: { [ana.id]: '60.00', [luis.id]: '40.00' },
      }),
      participants,
      'e1',
    );

    expect(result.ok && result.value.shares).toEqual([
      { participantId: ana.id, amountCents: 6000 },
      { participantId: luis.id, amountCents: 4000 },
    ]);
  });

  it.each([
    ['under the total', { [ana.id]: '60.00', [luis.id]: '30.00' }],
    ['over the total', { [ana.id]: '60.00', [luis.id]: '50.00' }],
  ])('rejects a custom split that is %s', (_label, customAmounts) => {
    const result = validateExpense(
      draft({
        amount: '100.00',
        splitMode: 'custom',
        beneficiaryIds: [ana.id, luis.id],
        customAmounts,
      }),
      participants,
      'e1',
    );

    expect(result).toEqual({ ok: false, error: 'SHARES_DO_NOT_SUM' });
  });

  it('rejects a negative custom share', () => {
    const result = validateExpense(
      draft({
        amount: '100.00',
        splitMode: 'custom',
        beneficiaryIds: [ana.id, luis.id],
        customAmounts: { [ana.id]: '-20.00', [luis.id]: '120.00' },
      }),
      participants,
      'e1',
    );

    expect(result).toEqual({ ok: false, error: 'NEGATIVE_SHARE' });
  });

  it('produces shares that always sum to the amount', () => {
    for (const amount of ['0.01', '0.02', '10.00', '33.33', '250.00', '999.99']) {
      const result = validateExpense(draft({ amount }), participants, 'e1');

      expect(result.ok).toBe(true);

      if (result.ok) {
        expect(isExpenseConsistent(result.value)).toBe(true);
      }
    }
  });
});

describe('expensesTotal', () => {
  function expense(amountCents: number, id: string): Expense {
    return {
      id,
      concept: 'Item',
      amountCents,
      payerId: ana.id,
      splitMode: 'custom',
      shares: [{ participantId: ana.id, amountCents }],
    };
  }

  it('is zero for an empty list', () => {
    expect(expensesTotal([])).toBe(0);
  });

  it('sums every expense amount in cents', () => {
    expect(expensesTotal([expense(8334, 'a'), expense(8333, 'b'), expense(8333, 'c')])).toBe(25000);
  });

  it('stays exact where floating point would drift', () => {
    expect(expensesTotal([expense(1010, 'a'), expense(2020, 'b'), expense(3030, 'c')])).toBe(6060);
  });
});

describe('drafts', () => {
  it('creates an empty draft defaulting to equal split', () => {
    expect(createEmptyDraft(ana.id)).toEqual({
      concept: '',
      amount: '',
      payerId: ana.id,
      splitMode: 'equal',
      beneficiaryIds: [],
      customAmounts: {},
    });
  });

  it('round-trips an expense back into an editable draft', () => {
    const original = validateExpense(draft(), participants, 'e1');

    expect(original.ok).toBe(true);

    if (!original.ok) {
      return;
    }

    const editable = draftFromExpense(original.value);

    expect(editable).toEqual({
      concept: 'Dinner',
      amount: '250.00',
      payerId: ana.id,
      splitMode: 'equal',
      beneficiaryIds: [ana.id, luis.id, carla.id],
      customAmounts: {
        [ana.id]: '83.34',
        [luis.id]: '83.33',
        [carla.id]: '83.33',
      },
    });

    const revalidated = validateExpense(editable, participants, 'e1');

    expect(revalidated).toEqual(original);
  });

  it.each([
    [0, '0.00'],
    [5, '0.05'],
    [50, '0.50'],
    [100, '1.00'],
    [8334, '83.34'],
  ])('renders %i cents as %s', (cents, expected) => {
    expect(centsToInput(cents)).toBe(expected);
  });
});
