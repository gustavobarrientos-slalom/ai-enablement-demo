import { describe, expect, it } from 'vitest';
import {
  CONCEPT_MAX_LENGTH,
  centsToInput,
  createEmptyDraft,
  draftFromExpense,
  expenseShares,
  expenseTotalCents,
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
    tipMode: 'none' as const,
    tipValue: '',
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
        tip: null,
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
      tip: null,
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
      tipMode: 'none' as const,
      tipValue: '',
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
      tipMode: 'none' as const,
      tipValue: '',
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

describe('expense tip', () => {
  function tipped(overrides: Partial<ExpenseDraft>) {
    const result = validateExpense(draft(overrides), participants, 'e1');

    if (!result.ok) {
      throw new Error(`expected a valid expense, got ${result.error}`);
    }

    return result.value;
  }

  it('saves an expense with no tip when the tip is left empty', () => {
    const expense = tipped({ amount: '100.00' });

    expect(expense.tip).toBeNull();
    expect(expenseTotalCents(expense)).toBe(10000);
  });

  it('converts a percentage tip to cents', () => {
    const expense = tipped({ amount: '250.00', tipMode: 'percent', tipValue: '10' });

    expect(expense.tip).toEqual({ kind: 'percent', percent: 10, amountCents: 2500 });
    expect(expenseTotalCents(expense)).toBe(27500);
  });

  it('floors a percentage tip to whole cents', () => {
    const expense = tipped({ amount: '100.01', tipMode: 'percent', tipValue: '15' });

    // 15% of 10001 cents is 1500.15 cents.
    expect(expense.tip?.amountCents).toBe(1500);
  });

  it('accepts a fixed tip', () => {
    const expense = tipped({ amount: '100.00', tipMode: 'fixed', tipValue: '10.00' });

    expect(expense.tip).toEqual({ kind: 'fixed', amountCents: 1000 });
    expect(expenseTotalCents(expense)).toBe(11000);
  });

  it('accepts a zero percent tip', () => {
    const expense = tipped({ amount: '100.00', tipMode: 'percent', tipValue: '0' });

    expect(expense.tip?.amountCents).toBe(0);
    expect(expenseTotalCents(expense)).toBe(10000);
  });

  it.each([
    ['a negative percentage', { tipMode: 'percent' as const, tipValue: '-5' }, 'NEGATIVE_TIP'],
    ['a negative fixed tip', { tipMode: 'fixed' as const, tipValue: '-10.00' }, 'NEGATIVE_TIP'],
    [
      'a percentage above 100',
      { tipMode: 'percent' as const, tipValue: '101' },
      'TIP_PERCENT_OUT_OF_RANGE',
    ],
    [
      'a fractional percentage',
      { tipMode: 'percent' as const, tipValue: '12.5' },
      'TIP_PERCENT_NOT_INTEGER',
    ],
    [
      'a fixed tip with three decimals',
      { tipMode: 'fixed' as const, tipValue: '10.999' },
      'TIP_TOO_MANY_DECIMALS',
    ],
  ])('rejects %s', (_label, overrides, expected) => {
    expect(validateExpense(draft(overrides), participants, 'e1')).toEqual({
      ok: false,
      error: expected,
    });
  });

  it('stores base shares that still sum to the base amount', () => {
    const expense = tipped({ amount: '250.00', tipMode: 'percent', tipValue: '10' });

    expect(expense.shares.map((share) => share.amountCents)).toEqual([8334, 8333, 8333]);
    expect(
      expense.shares.reduce((sum, share) => sum + share.amountCents, 0),
    ).toBe(expense.amountCents);
  });

  it('derives tip inclusive shares that sum to the total', () => {
    const expense = tipped({ amount: '250.00', tipMode: 'percent', tipValue: '10' });

    expect(expenseShares(expense).map((share) => share.amountCents)).toEqual([
      9168, 9166, 9166,
    ]);
    expect(
      expenseShares(expense).reduce((sum, share) => sum + share.amountCents, 0),
    ).toBe(expenseTotalCents(expense));
  });

  it('derives 36.68 / 36.66 / 36.66 for 100.00 with a fixed 10.00 tip', () => {
    const expense = tipped({ amount: '100.00', tipMode: 'fixed', tipValue: '10.00' });

    expect(expenseShares(expense).map((share) => share.amountCents)).toEqual([
      3668, 3666, 3666,
    ]);
    expect(
      expenseShares(expense).reduce((sum, share) => sum + share.amountCents, 0),
    ).toBe(11000);
  });

  it('distributes the tip proportionally over a custom split', () => {
    const expense = tipped({
      amount: '600.00',
      splitMode: 'custom',
      beneficiaryIds: [ana.id, luis.id, carla.id],
      customAmounts: { [ana.id]: '300.00', [luis.id]: '200.00', [carla.id]: '100.00' },
      tipMode: 'percent',
      tipValue: '10',
    });

    expect(expenseShares(expense).map((share) => share.amountCents)).toEqual([
      33000, 22000, 11000,
    ]);
  });

  it('gives no tip to a beneficiary who consumed nothing', () => {
    const expense = tipped({
      amount: '100.00',
      splitMode: 'custom',
      beneficiaryIds: [ana.id, luis.id, carla.id],
      customAmounts: { [ana.id]: '50.00', [luis.id]: '0.00', [carla.id]: '50.00' },
      tipMode: 'fixed',
      tipValue: '10.00',
    });

    const shares = expenseShares(expense);

    expect(shares[1]).toEqual({ participantId: luis.id, amountCents: 0 });
    expect(shares.map((share) => share.amountCents)).toEqual([5500, 0, 5500]);
  });

  it('keeps a tipped expense consistent', () => {
    expect(
      isExpenseConsistent(tipped({ amount: '250.00', tipMode: 'percent', tipValue: '10' })),
    ).toBe(true);
  });

  it('includes tips in the group total', () => {
    const withTip = tipped({ amount: '100.00', tipMode: 'percent', tipValue: '10' });
    const plain = { ...tipped({ amount: '50.00' }), id: 'e2' };

    expect(expensesTotal([withTip, plain])).toBe(16000);
  });

  it('round trips a tipped equal split through the form', () => {
    const original = tipped({ amount: '250.00', tipMode: 'percent', tipValue: '10' });
    const reopened = validateExpense(draftFromExpense(original), participants, 'e1');

    expect(reopened).toEqual({ ok: true, value: original });
  });

  it('round trips a tipped custom split through the form', () => {
    const original = tipped({
      amount: '600.00',
      splitMode: 'custom',
      beneficiaryIds: [ana.id, luis.id, carla.id],
      customAmounts: { [ana.id]: '300.00', [luis.id]: '200.00', [carla.id]: '100.00' },
      tipMode: 'percent',
      tipValue: '10',
    });

    // Regression: storing tip inclusive shares made this fail SHARES_DO_NOT_SUM.
    expect(validateExpense(draftFromExpense(original), participants, 'e1')).toEqual({
      ok: true,
      value: original,
    });
  });

  it('recomputes a percentage tip when the amount is edited', () => {
    const original = tipped({ amount: '100.00', tipMode: 'percent', tipValue: '10' });
    const edited = validateExpense(
      { ...draftFromExpense(original), amount: '200.00' },
      participants,
      'e1',
    );

    expect(edited.ok && edited.value.tip).toEqual({
      kind: 'percent',
      percent: 10,
      amountCents: 2000,
    });
  });

  it('clears the tip when the mode goes back to none', () => {
    const original = tipped({ amount: '100.00', tipMode: 'percent', tipValue: '10' });
    const cleared = validateExpense(
      { ...draftFromExpense(original), tipMode: 'none' },
      participants,
      'e1',
    );

    expect(cleared.ok && cleared.value.tip).toBeNull();
  });

  it('starts an empty draft with no tip', () => {
    expect(createEmptyDraft(ana.id).tipMode).toBe('none');
    expect(createEmptyDraft(ana.id).tipValue).toBe('');
  });
});
