import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesTab } from './ExpensesTab';
import { seedActiveEvent } from '../test/factories';
import {
  resetAppStore,
  selectExpenses,
  useAppStore,
} from '../store/useAppStore';
import { CATEGORIES } from '../domain/category';
import type { Category } from '../domain/types';

function state() {
  return useAppStore.getState();
}

function seedGroup(): void {
  state().addParticipant('Ana');
  state().addParticipant('Luis');
}

async function addExpense(
  user: ReturnType<typeof userEvent.setup>,
  concept: string,
  amount: string,
  category?: Category,
): Promise<void> {
  await openForm(user);
  await user.type(screen.getByLabelText('Concept'), concept);
  await user.type(screen.getByLabelText('Amount'), amount);

  if (category) {
    await user.selectOptions(screen.getByLabelText('Category'), category);
  }

  for (const name of ['Ana', 'Luis']) {
    await user.click(screen.getByLabelText(name));
  }

  await user.click(screen.getByRole('button', { name: 'Add expense' }));
}

async function openForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  if (!screen.queryByRole('dialog', { name: 'New expense' })) {
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
  }
}

/** Font Awesome renders the icon name into `data-icon` on the svg it emits. */
function iconNameIn(element: HTMLElement): string | null {
  const svg = element.tagName.toLowerCase() === 'svg' ? element : element.querySelector('svg');

  return svg?.getAttribute('data-icon') ?? null;
}

const EXPECTED_ICONS: Record<Category, string> = {
  food: 'utensils',
  drinks: 'martini-glass',
  transport: 'car',
  lodging: 'bed',
  entertainment: 'ticket',
  other: 'tag',
};

const EXPECTED_LABELS: Record<Category, string> = {
  food: 'Food',
  drinks: 'Drinks',
  transport: 'Transport',
  lodging: 'Lodging',
  entertainment: 'Entertainment',
  other: 'Other',
};

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('category selector', () => {
  it('offers exactly the six categories with their labels', async () => {
    seedGroup();
    render(<ExpensesTab />);
    await openForm(userEvent.setup());

    const options = within(screen.getByLabelText('Category')).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual(
      CATEGORIES.map((category) => EXPECTED_LABELS[category]),
    );
  });

  it('defaults to Other', async () => {
    seedGroup();
    render(<ExpensesTab />);
    await openForm(userEvent.setup());

    expect(screen.getByLabelText('Category')).toHaveValue('other');
  });

  it('previews the icon of each selected category', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await openForm(user);

    for (const category of CATEGORIES) {
      await user.selectOptions(screen.getByLabelText('Category'), category);

      expect(iconNameIn(screen.getByTestId('category-preview'))).toBe(
        EXPECTED_ICONS[category],
      );
    }
  });
});

describe('saving a category', () => {
  it('saves Other when the selector is left untouched', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addExpense(user, 'Dinner', '100.00');

    expect(selectExpenses(state())[0]!.category).toBe('other');
  });

  it('saves each chosen category and shows its icon on the row', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addExpense(user, 'Taxi', '100.00', 'transport');

    const expense = selectExpenses(state())[0]!;
    expect(expense.category).toBe('transport');
    expect(iconNameIn(screen.getByTestId(`category-${expense.id}`))).toBe('car');
  });

  it('changes the icon when an expense is recategorized, leaving the rest alone', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addExpense(user, 'Dinner', '100.00', 'food');

    const original = selectExpenses(state())[0]!;
    expect(iconNameIn(screen.getByTestId(`category-${original.id}`))).toBe('utensils');

    await user.click(screen.getByRole('button', { name: /Dinner Paid by/ }));

    const editForm = screen.getByRole('button', { name: 'Save changes' }).closest('form')!;
    await user.selectOptions(within(editForm).getByLabelText('Category'), 'drinks');
    await user.click(within(editForm).getByRole('button', { name: 'Save changes' }));

    const edited = selectExpenses(state())[0]!;
    expect(edited.category).toBe('drinks');
    expect(iconNameIn(screen.getByTestId(`category-${edited.id}`))).toBe('martini-glass');
    // Nothing but the category moved.
    expect({ ...edited, category: 'food' }).toEqual(original);
  });

  it('reopens the edit form on the expense current category', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addExpense(user, 'Hotel', '100.00', 'lodging');
    await user.click(screen.getByRole('button', { name: /Hotel Paid by/ }));

    const editForm = screen.getByRole('button', { name: 'Save changes' }).closest('form')!;
    expect(within(editForm).getByLabelText('Category')).toHaveValue('lodging');
  });
});

describe('category icons in the list', () => {
  it('shows a tip-inclusive amount beside the category icon', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await openForm(user);

    await user.type(screen.getByLabelText('Concept'), 'Dinner');
    await user.type(screen.getByLabelText('Amount'), '250.00');
    await user.selectOptions(screen.getByLabelText('Category'), 'food');

    for (const name of ['Ana', 'Luis']) {
      await user.click(screen.getByLabelText(name));
    }

    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    await user.type(screen.getByLabelText('Tip percentage'), '10');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    const expense = selectExpenses(state())[0]!;
    const row = screen.getByTestId(`category-${expense.id}`).closest('li')!;

    expect(iconNameIn(screen.getByTestId(`category-${expense.id}`))).toBe('utensils');
    expect(within(row).getByText('$275.00')).toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$275.00');
  });

  it('keeps showing the icon on an archived read-only list', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addExpense(user, 'Concert', '100.00', 'entertainment');

    const expense = selectExpenses(state())[0]!;

    act(() => {
      state().archiveEvent(state().activeEventId!);
    });

    await waitFor(() => {
      expect(screen.queryByLabelText('Category')).toBeNull();
    });

    expect(iconNameIn(screen.getByTestId(`category-${expense.id}`))).toBe('ticket');
    expect(screen.queryByRole('button', { name: 'Edit Concert' })).toBeNull();
  });

  it('shows no category icons in the empty state', () => {
    seedGroup();
    render(<ExpensesTab />);

    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    expect(screen.queryByTestId(/^category-e/)).toBeNull();
  });
});
