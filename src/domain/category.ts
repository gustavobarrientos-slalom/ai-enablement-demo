import { expenseTotalCents } from './expense';
import type { Category, Expense } from './types';

/**
 * The six fixed categories, in the canonical order used to break ties in the
 * settlement breakdown. Icons live in the UI registry so the domain stays
 * independent of React and Font Awesome.
 */
export const CATEGORIES: readonly Category[] = [
  'food',
  'drinks',
  'transport',
  'lodging',
  'entertainment',
  'other',
];

export const DEFAULT_CATEGORY: Category = 'other';

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORIES.includes(value as Category);
}

export interface CategoryTotal {
  category: Category;
  totalCents: number;
}

/**
 * Aggregates tip-inclusive expense totals into their single category. Only
 * categories with expenses are returned, sorted by cents descending and
 * broken by canonical category order, so the result is deterministic.
 * Derived on read; never persisted.
 */
export function categoryTotals(expenses: readonly Expense[]): CategoryTotal[] {
  const totals = new Map<Category, number>();

  for (const expense of expenses) {
    totals.set(
      expense.category,
      (totals.get(expense.category) ?? 0) + expenseTotalCents(expense),
    );
  }

  return CATEGORIES.filter((category) => totals.has(category))
    .map((category) => ({ category, totalCents: totals.get(category)! }))
    .sort((left, right) => {
      if (right.totalCents !== left.totalCents) {
        return right.totalCents - left.totalCents;
      }

      return CATEGORIES.indexOf(left.category) - CATEGORIES.indexOf(right.category);
    });
}

/**
 * Display-only percentage of the group total, to one decimal place. Never
 * feeds a monetary calculation, so floating point is safe here.
 */
export function categoryPercent(totalCents: number, groupTotalCents: number): number {
  if (groupTotalCents === 0) {
    return 0;
  }

  return Math.round((totalCents / groupTotalCents) * 1000) / 10;
}
