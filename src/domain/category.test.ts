import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  categoryPercent,
  categoryTotals,
  isCategory,
} from './category';
import {
  createEmptyDraft,
  draftFromExpense,
  expensesTotal,
  validateExpense,
} from './expense';
import type { Category, Expense, ExpenseDraft, Participant } from './types';

const ana: Participant = { id: 'p1', name: 'Ana' };
const luis: Participant = { id: 'p2', name: 'Luis' };
const participants = [ana, luis];

function draft(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return {
    concept: 'Dinner',
    amount: '100.00',
    payerId: ana.id,
    splitMode: 'equal',
    beneficiaryIds: [ana.id, luis.id],
    customAmounts: {},
    tipMode: 'none',
    tipValue: '',
    category: 'other',
    ...overrides,
  };
}

function expenseWith(
  category: Category,
  amountCents: number,
  id: string = category,
  tipCents = 0,
): Expense {
  return {
    id,
    concept: 'Item',
    amountCents,
    payerId: ana.id,
    splitMode: 'custom',
    shares: [{ participantId: ana.id, amountCents }],
    tip: tipCents === 0 ? null : { kind: 'fixed', amountCents: tipCents },
    category,
  };
}

describe('the fixed category list', () => {
  it('is exactly the six supported categories, in canonical order', () => {
    expect(CATEGORIES).toEqual([
      'food',
      'drinks',
      'transport',
      'lodging',
      'entertainment',
      'other',
    ]);
  });

  it('accepts every category in the list', () => {
    for (const category of CATEGORIES) {
      expect(isCategory(category)).toBe(true);
    }
  });

  it('rejects anything outside the list', () => {
    for (const value of ['Food', 'travel', '', null, undefined, 3, {}]) {
      expect(isCategory(value)).toBe(false);
    }
  });

  it('defaults to Other', () => {
    expect(DEFAULT_CATEGORY).toBe('other');
  });
});

describe('category on drafts and expenses', () => {
  it('defaults a new draft to Other', () => {
    expect(createEmptyDraft(ana.id).category).toBe('other');
  });

  it('saves an expense with the default category when it is left alone', () => {
    const untouched: ExpenseDraft = {
      ...createEmptyDraft(ana.id),
      concept: 'Dinner',
      amount: '100.00',
      beneficiaryIds: [ana.id, luis.id],
    };

    expect(validateExpense(untouched, participants, 'e1')).toMatchObject({
      ok: true,
      value: { category: 'other' },
    });
  });

  it('saves an expense with each of the six categories', () => {
    for (const category of CATEGORIES) {
      const result = validateExpense(draft({ category }), participants, 'e1');

      expect(result.ok && result.value.category).toBe(category);
    }
  });

  it('round trips the category back into an editable draft', () => {
    const saved = validateExpense(draft({ category: 'food' }), participants, 'e1');

    expect(saved.ok).toBe(true);

    if (saved.ok) {
      expect(draftFromExpense(saved.value).category).toBe('food');
    }
  });

  it('changes only the category when an expense is recategorized', () => {
    const original = validateExpense(draft({ category: 'food' }), participants, 'e1');

    expect(original.ok).toBe(true);

    if (!original.ok) {
      return;
    }

    const edited = validateExpense(
      { ...draftFromExpense(original.value), category: 'drinks' },
      participants,
      original.value.id,
    );

    expect(edited.ok).toBe(true);

    if (edited.ok) {
      expect(edited.value.category).toBe('drinks');
      expect({ ...edited.value, category: 'food' }).toEqual(original.value);
    }
  });

  it('rejects a category outside the fixed list', () => {
    const invalid = { ...draft(), category: 'travel' as Category };

    expect(validateExpense(invalid, participants, 'e1')).toEqual({
      ok: false,
      error: 'UNKNOWN_CATEGORY',
    });
  });

  it('rejects a missing category rather than defaulting it', () => {
    const invalid = { ...draft(), category: undefined as unknown as Category };

    expect(validateExpense(invalid, participants, 'e1').ok).toBe(false);
  });
});

describe('categoryTotals', () => {
  it('returns no rows when there are no expenses', () => {
    expect(categoryTotals([])).toEqual([]);
  });

  it('omits categories without expenses and sorts by total descending', () => {
    const totals = categoryTotals([
      expenseWith('drinks', 2500),
      expenseWith('food', 10000),
    ]);

    expect(totals).toEqual([
      { category: 'food', totalCents: 10000 },
      { category: 'drinks', totalCents: 2500 },
    ]);
  });

  it('sums several expenses sharing a category', () => {
    const totals = categoryTotals([
      expenseWith('food', 1000, 'a'),
      expenseWith('food', 2000, 'b'),
    ]);

    expect(totals).toEqual([{ category: 'food', totalCents: 3000 }]);
  });

  it('includes tips in each category total', () => {
    const totals = categoryTotals([
      expenseWith('food', 9091, 'a', 910),
      expenseWith('transport', 4999, 'b'),
    ]);

    expect(totals).toEqual([
      { category: 'food', totalCents: 10001 },
      { category: 'transport', totalCents: 4999 },
    ]);
  });

  it('breaks ties in canonical category order', () => {
    const totals = categoryTotals([
      expenseWith('other', 500),
      expenseWith('transport', 500),
      expenseWith('food', 500),
    ]);

    expect(totals.map((total) => total.category)).toEqual(['food', 'transport', 'other']);
  });

  it('sums to the group total in exact cents, tips included', () => {
    const expenses = [
      expenseWith('food', 9091, 'a', 910),
      expenseWith('transport', 4999, 'b'),
      expenseWith('drinks', 3333, 'c', 1),
    ];

    const sum = categoryTotals(expenses).reduce(
      (total, row) => total + row.totalCents,
      0,
    );

    expect(sum).toBe(expensesTotal(expenses));
  });
});

describe('categoryPercent', () => {
  it('is zero when the group total is zero, never dividing by zero', () => {
    expect(categoryPercent(0, 0)).toBe(0);
  });

  it('reports one decimal place', () => {
    expect(categoryPercent(10000, 12500)).toBe(80);
    expect(categoryPercent(2500, 12500)).toBe(20);
  });

  it('rounds one-cent thirds to 33.3, which need not sum to 100', () => {
    const percents = [1, 1, 1].map((cents) => categoryPercent(cents, 3));

    expect(percents).toEqual([33.3, 33.3, 33.3]);
    expect(percents.reduce((sum, value) => sum + value, 0)).toBeCloseTo(99.9, 10);
  });
});
