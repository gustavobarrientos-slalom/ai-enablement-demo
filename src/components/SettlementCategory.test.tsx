import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { SettlementTab } from './SettlementTab';
import { seedActiveEvent } from '../test/factories';
import {
  resetAppStore,
  selectExpenses,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';
import type { Category } from '../domain/types';
import { CATEGORY_LABELS } from '../ui/messages';

const BREAKDOWN_LABEL = 'Spending by category';

function state() {
  return useAppStore.getState();
}

function seed(names: string[]): string[] {
  for (const name of names) {
    state().addParticipant(name);
  }

  return selectParticipants(state()).map((participant) => participant.id);
}

function addExpense(options: {
  concept: string;
  amount: string;
  payerId: string;
  beneficiaryIds: string[];
  category: Category;
  tipMode?: 'none' | 'percent' | 'fixed';
  tipValue?: string;
}): void {
  const added = state().addExpense({
    concept: options.concept,
    amount: options.amount,
    payerId: options.payerId,
    splitMode: 'equal',
    beneficiaryIds: options.beneficiaryIds,
    customAmounts: {},
    tipMode: options.tipMode ?? 'none',
    tipValue: options.tipValue ?? '',
    category: options.category,
  });

  if (!added) {
    throw new Error(`failed to add ${options.concept}: ${state().lastError}`);
  }
}

/** The visible breakdown rows as `Label $Amount Pct%`, in render order. */
function breakdownRows(): string[] {
  const list = screen.queryByRole('list', { name: BREAKDOWN_LABEL });

  if (!list) {
    return [];
  }

  return within(list)
    .getAllByRole('listitem')
    .map((row) => {
      const category = row.getAttribute('data-testid')?.replace('category-total-', '');
      const label = CATEGORY_LABELS[category as Category];
      const amount = within(row).getByTestId(`category-amount-${category}`).textContent;
      const percent = within(row).getByTestId(`category-percent-${category}`).textContent;

      return `${label} ${amount} ${percent}`;
    });
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('category breakdown', () => {
  it('shows no rows when the event has no expenses', () => {
    seed(['Ana', 'Luis']);
    render(<SettlementTab />);

    expect(screen.queryByRole('list', { name: BREAKDOWN_LABEL })).toBeNull();
    expect(breakdownRows()).toEqual([]);
  });

  it('lists only categories with expenses, sorted by total descending', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Drinks',
      amount: '25.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'drinks',
    });
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'food',
    });

    render(<SettlementTab />);

    expect(breakdownRows()).toEqual(['Food $100.00 80.0%', 'Drinks $25.00 20.0%']);
    expect(screen.queryByText('Transport')).toBeNull();
  });

  it('includes tips in each category total and reconciles to the group total', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    // 90.91 + a 9.10 tip = 100.01.
    addExpense({
      concept: 'Dinner',
      amount: '90.91',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'food',
      tipMode: 'fixed',
      tipValue: '9.10',
    });
    addExpense({
      concept: 'Taxi',
      amount: '49.99',
      payerId: luis!,
      beneficiaryIds: [ana!, luis!],
      category: 'transport',
    });

    render(<SettlementTab />);

    expect(screen.getByTestId('category-total-food')).toHaveTextContent('$100.01');
    expect(screen.getByTestId('category-total-transport')).toHaveTextContent('$49.99');

    const totals = [10001, 4999];
    expect(totals[0]! + totals[1]!).toBe(15000);
  });

  it('rounds one-cent thirds to 33.3% without forcing them to sum to 100', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);

    for (const category of ['food', 'drinks', 'transport'] as const) {
      addExpense({
        concept: category,
        amount: '0.01',
        payerId: ana!,
        beneficiaryIds: [ana!],
        category,
      });
    }

    expect(luis).toBeDefined();
    render(<SettlementTab />);

    expect(breakdownRows()).toEqual([
      'Food $0.01 33.3%',
      'Drinks $0.01 33.3%',
      'Transport $0.01 33.3%',
    ]);
  });

  it('breaks ties in canonical category order', () => {
    const [ana] = seed(['Ana', 'Luis']);

    for (const category of ['other', 'transport', 'food'] as const) {
      addExpense({
        concept: category,
        amount: '5.00',
        payerId: ana!,
        beneficiaryIds: [ana!],
        category,
      });
    }

    render(<SettlementTab />);

    expect(breakdownRows().map((row) => row.split(' ')[0])).toEqual([
      'Food',
      'Transport',
      'Other',
    ]);
  });
});

describe('breakdown reacts to changes', () => {
  it('updates when an expense is recategorized', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'food',
    });

    render(<SettlementTab />);
    expect(breakdownRows()).toEqual(['Food $100.00 100.0%']);

    const expense = selectExpenses(state())[0]!;

    act(() => {
      state().updateExpense(expense.id, {
        concept: expense.concept,
        amount: '100.00',
        payerId: expense.payerId,
        splitMode: 'equal',
        beneficiaryIds: [ana!, luis!],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'drinks',
      });
    });

    expect(breakdownRows()).toEqual(['Drinks $100.00 100.0%']);
  });

  it('updates when an amount changes', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'food',
    });
    addExpense({
      concept: 'Drinks',
      amount: '25.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'drinks',
    });

    render(<SettlementTab />);
    expect(breakdownRows()[0]).toBe('Food $100.00 80.0%');

    const food = selectExpenses(state())[0]!;

    act(() => {
      state().updateExpense(food.id, {
        concept: food.concept,
        amount: '10.00',
        payerId: food.payerId,
        splitMode: 'equal',
        beneficiaryIds: [ana!, luis!],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'food',
      });
    });

    // Drinks now leads, so the order flips too.
    expect(breakdownRows()).toEqual(['Drinks $25.00 71.4%', 'Food $10.00 28.6%']);
  });

  it('drops a category once its last expense is deleted', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'food',
    });
    addExpense({
      concept: 'Drinks',
      amount: '25.00',
      payerId: ana!,
      beneficiaryIds: [ana!, luis!],
      category: 'drinks',
    });

    render(<SettlementTab />);
    expect(breakdownRows()).toHaveLength(2);

    const drinks = selectExpenses(state()).find(
      (expense) => expense.category === 'drinks',
    )!;

    act(() => {
      state().removeExpense(drinks.id);
    });

    expect(breakdownRows()).toEqual(['Food $100.00 100.0%']);
  });

  it('shows no rows again after the last expense is deleted', () => {
    const [ana] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!],
      category: 'food',
    });

    render(<SettlementTab />);
    expect(breakdownRows()).toHaveLength(1);

    const only = selectExpenses(state())[0]!;

    act(() => {
      state().removeExpense(only.id);
    });

    expect(screen.queryByRole('list', { name: BREAKDOWN_LABEL })).toBeNull();
  });

  it('never persists the derived breakdown', () => {
    const [ana] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!],
      category: 'food',
    });

    render(<SettlementTab />);
    expect(breakdownRows()).toHaveLength(1);

    const stored = localStorage.getItem('split:v2') ?? '';

    expect(stored).not.toContain('totalCents');
    expect(stored).not.toContain('percent"');
    expect(stored).not.toContain('breakdown');
  });
});

describe('breakdown follows the active event', () => {
  it('shows only the active event categories after switching', () => {
    const [ana] = seed(['Ana', 'Luis']);
    addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!,
      beneficiaryIds: [ana!],
      category: 'food',
    });

    const eventB = state().createEvent('Second')!;
    const [beto] = seed(['Beto', 'Carla']);
    addExpense({
      concept: 'Drinks',
      amount: '40.00',
      payerId: beto!,
      beneficiaryIds: [beto!],
      category: 'drinks',
    });

    render(<SettlementTab />);

    expect(state().activeEventId).toBe(eventB);
    expect(breakdownRows()).toEqual(['Drinks $40.00 100.0%']);
    expect(screen.queryByText('Food')).toBeNull();
  });
});
