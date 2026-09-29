import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesTab } from './ExpensesTab';
import { seedActiveEvent } from '../test/factories';
import {
  resetAppStore,
  selectExpenses,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';

function state() {
  return useAppStore.getState();
}

function seedGroup(): void {
  state().addParticipant('Ana');
  state().addParticipant('Luis');
  state().addParticipant('Carla');
}

async function openExpenseForm(user: ReturnType<typeof userEvent.setup>) {
  if (!screen.queryByRole('dialog', { name: 'New expense' })) {
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
  }
}

async function fillBasics(user: ReturnType<typeof userEvent.setup>, concept: string, amount: string) {
  await openExpenseForm(user);
  await user.type(screen.getByLabelText('Concept'), concept);
  await user.type(screen.getByLabelText('Amount'), amount);
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('empty state', () => {
  it('shows the empty message and a zero total', () => {
    seedGroup();
    render(<ExpensesTab />);

    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$0.00');
  });
});

describe('adding an expense', () => {
  it('splits equally giving leftover cents in participant order', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Dinner', '250.00');

    for (const name of ['Ana', 'Luis', 'Carla']) {
      await user.click(screen.getByLabelText(name));
    }

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    const shares = selectExpenses(state())[0]!.shares.map((share) => share.amountCents);
    expect(shares).toEqual([8334, 8333, 8333]);

    expect(screen.queryByText('No expenses yet')).not.toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$250.00');
  });

  it('shows an error when the concept is empty', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await openExpenseForm(user);
    await user.type(screen.getByLabelText('Amount'), '50.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The concept is required');
    expect(selectExpenses(state())).toEqual([]);
  });

  it('shows an error when no beneficiary is selected', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Taxi', '50.00');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one beneficiary');
  });

  it('validates on blur and clears the field error as the value is corrected', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await openExpenseForm(user);
    const amount = screen.getByLabelText('Amount');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(amount);
    await user.tab();
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    const message = document.getElementById(amount.getAttribute('aria-describedby')!);
    expect(message).toHaveTextContent('Enter a valid amount');
    expect(amount.parentElement?.nextElementSibling).toBe(message);
    expect(screen.getByLabelText('Concept')).not.toHaveAttribute('aria-invalid');

    await user.type(amount, '50.00');
    expect(amount).not.toHaveAttribute('aria-invalid');
    expect(amount).not.toHaveAttribute('aria-describedby');
    expect(message).not.toBeInTheDocument();
  });

  it('shows all invalid fields beneath their controls on submit', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await openExpenseForm(user);
    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    await user.type(screen.getByLabelText('Tip percentage'), '101');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    for (const [label, text] of [
      ['Concept', 'The concept is required'],
      ['Amount', 'Enter a valid amount'],
      ['Tip percentage', 'The tip percentage must be between 0 and 100'],
    ] as const) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute('aria-invalid', 'true');
      const message = document.getElementById(field.getAttribute('aria-describedby')!);
      expect(message).toHaveTextContent(text);
      expect(field.parentElement?.nextElementSibling).toBe(message);
    }
    const split = screen.getByText('Split between').closest('fieldset')!;
    expect(split).toHaveTextContent('Select at least one beneficiary');
    expect(split).toHaveAttribute('aria-describedby');
    expect(screen.getAllByRole('alert')).toHaveLength(4);
    expect(selectExpenses(state())).toEqual([]);

    await user.type(screen.getByLabelText('Concept'), 'Taxi');
    await user.type(screen.getByLabelText('Amount'), '50');
    await user.clear(screen.getByLabelText('Tip percentage'));
    await user.type(screen.getByLabelText('Tip percentage'), '10');
    await user.click(screen.getByLabelText('Ana'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(selectExpenses(state())).toHaveLength(1);
  });

  it('clears the form after a successful add', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Taxi', '50.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.queryByRole('dialog', { name: 'New expense' })).not.toBeInTheDocument();
    await openExpenseForm(user);
    expect(screen.getByLabelText('Concept')).toHaveValue('');
    expect(screen.getByLabelText('Amount')).toHaveValue('');
  });
});

describe('custom split', () => {
  it('places individual share errors below their inputs and the total error below the split', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await fillBasics(user, 'Dinner', '100.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByLabelText('Luis'));
    await user.click(screen.getByRole('radio', { name: 'Custom' }));

    const ana = screen.getByLabelText('Amount for Ana');
    await user.type(ana, '-2');
    await user.tab();
    expect(ana).toHaveAttribute('aria-invalid', 'true');
    const shareError = document.getElementById(ana.getAttribute('aria-describedby')!);
    expect(shareError).toHaveTextContent('Shares cannot be negative');
    expect(ana.nextElementSibling).toBe(shareError);

    await user.clear(ana);
    await user.type(ana, '60');
    await user.tab();
    expect(ana).not.toHaveAttribute('aria-invalid');
    const split = screen.getByText('Split between').closest('fieldset')!;
    expect(split).toHaveTextContent('The shares must add up to the total');
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeDisabled();

    await user.type(screen.getByLabelText('Amount for Luis'), '40');
    expect(split).not.toHaveTextContent('The shares must add up to the total');
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeEnabled();
  });

  it('reports remaining cents and blocks saving until balanced', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Dinner', '100.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByLabelText('Luis'));
    await user.click(screen.getByRole('radio', { name: 'Custom' }));

    await user.type(screen.getByLabelText('Amount for Ana'), '60.00');

    expect(screen.getByRole('status')).toHaveTextContent('$40.00 remaining');
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeDisabled();

    await user.type(screen.getByLabelText('Amount for Luis'), '40.00');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(selectExpenses(state())[0]!.shares).toEqual([
      { participantId: selectParticipants(state())[0]!.id, amountCents: 6000 },
      { participantId: selectParticipants(state())[1]!.id, amountCents: 4000 },
    ]);
  });

  it('reports cents over the total', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Dinner', '100.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.type(screen.getByLabelText('Amount for Ana'), '120.00');

    expect(screen.getByRole('status')).toHaveTextContent('$20.00 over');
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeDisabled();
  });
});

describe('editing and deleting', () => {
  async function addDinner(user: ReturnType<typeof userEvent.setup>) {
    await fillBasics(user, 'Dinner', '100.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByLabelText('Luis'));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
  }

  it('edits an existing expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);
    await user.click(screen.getByRole('button', { name: /Dinner Paid by/ }));

    const row = within(screen.getByRole('dialog', { name: 'Edit expense' }));
    const concept = row.getByLabelText('Concept');
    await user.clear(concept);
    await user.type(concept, 'Brunch');
    await user.click(row.getByRole('button', { name: 'Save changes' }));

    expect(selectExpenses(state())).toHaveLength(1);
    expect(selectExpenses(state())[0]!.concept).toBe('Brunch');
    expect(screen.getByText('Brunch')).toBeInTheDocument();
  });

  it('validates an edited expense on blur without changing the saved expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await addDinner(user);
    await user.click(screen.getByRole('button', { name: /Dinner Paid by/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit expense' }));
    const amount = dialog.getByLabelText('Amount');
    await user.clear(amount);
    await user.tab();
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(selectExpenses(state())[0]!.amountCents).toBe(10000);
    await user.type(amount, '80');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(selectExpenses(state())[0]!.amountCents).toBe(8000);
  });

  it('cancels editing without changing the expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);
    await user.click(screen.getByRole('button', { name: /Dinner Paid by/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(selectExpenses(state())[0]!.concept).toBe('Dinner');
    expect(screen.getByRole('button', { name: /Dinner Paid by/ })).toBeInTheDocument();
  });

  it('deletes an expense and updates the total', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$100.00');

    screen.getByRole('button', { name: /Dinner Paid by/ }).focus();
    await user.keyboard('{ArrowLeft}');
    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }));

    expect(selectExpenses(state())).toEqual([]);
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$0.00');
  });

  it('lists the payer for each expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);

    expect(screen.getByText(/Paid by Ana/)).toBeInTheDocument();
    expect(screen.getByText(/2 beneficiaries/)).toBeInTheDocument();
  });

  it('reveals the destructive action during a left swipe and closes it on a right swipe', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);
    await addDinner(user);
    const row = screen.getByTestId(`category-${selectExpenses(state())[0]!.id}`);
    const surface = row.firstElementChild!;

    expect(screen.queryByRole('button', { name: 'Delete Dinner' })).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Show actions for Dinner' })).toBeNull();
    expect(within(row).queryByRole('button', { name: 'Edit Dinner' })).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: /Dinner Paid by/ }));
    expect(screen.getByRole('dialog', { name: 'Edit expense' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.touchStart(surface, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchMove(surface, { touches: [{ clientX: 145, clientY: 42 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-35px)' });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 100, clientY: 43 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-80px)' });
    const deleteButton = screen.getByRole('button', { name: 'Delete Dinner' });
    expect(deleteButton).toHaveClass('bg-red-700', 'text-white', 'mobile-target');
    expect(deleteButton).toHaveTextContent('Delete');
    expect(deleteButton.querySelector('svg')).toHaveAttribute('data-icon', 'trash');
    await user.click(within(row).getByRole('button', { name: /Dinner Paid by/ }));
    expect(screen.queryByRole('dialog', { name: 'Edit expense' })).toBeNull();
    expect(surface).toHaveStyle({ transform: 'translateX(0px)' });

    fireEvent.touchStart(surface, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 100, clientY: 43 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(-80px)' });

    fireEvent.touchStart(surface, { touches: [{ clientX: 100, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 180, clientY: 43 }] });
    expect(surface).toHaveStyle({ transform: 'translateX(0px)' });
    expect(screen.queryByRole('button', { name: 'Delete Dinner' })).toBeNull();

    fireEvent.touchStart(surface, { touches: [{ clientX: 180, clientY: 40 }] });
    fireEvent.touchEnd(surface, { changedTouches: [{ clientX: 175, clientY: 120 }] });
    expect(screen.queryByRole('button', { name: 'Delete Dinner' })).toBeNull();
    const editRow = within(row).getByRole('button', { name: /Dinner Paid by/ });
    editRow.focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Delete Dinner' })).toBeInTheDocument();
    await user.tab();
    expect(deleteButton).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Delete Dinner' })).toBeNull();
    expect(editRow).toHaveFocus();
  });
});

describe('tips', () => {
  async function addTipped(
    user: ReturnType<typeof userEvent.setup>,
    concept: string,
    amount: string,
    mode: 'Percentage' | 'Fixed amount',
    value: string,
  ) {
    await fillBasics(user, concept, amount);

    for (const name of ['Ana', 'Luis', 'Carla']) {
      await user.click(screen.getByLabelText(name));
    }

    await user.click(screen.getByRole('radio', { name: mode }));
    await user.type(
      screen.getByLabelText(mode === 'Percentage' ? 'Tip percentage' : 'Tip amount'),
      value,
    );
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
  }

  it('saves a percentage tip and shows a tip inclusive total', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '250.00', 'Percentage', '10');

    expect(selectExpenses(state())[0]!.tip).toEqual({
      kind: 'percent',
      percent: 10,
      amountCents: 2500,
    });
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$275.00');
  });

  it('shows the tip on a tipped row', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '250.00', 'Percentage', '10');

    const id = selectExpenses(state())[0]!.id;
    expect(screen.getByTestId(`tip-${id}`)).toHaveTextContent('Includes $25.00 tip');
  });

  it('leaves an untipped row without a tip line', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Taxi', '90.00');

    for (const name of ['Ana', 'Luis', 'Carla']) {
      await user.click(screen.getByLabelText(name));
    }

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    const id = selectExpenses(state())[0]!.id;
    expect(screen.queryByTestId(`tip-${id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$90.00');
  });

  it('sums tips into the group total', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '100.00', 'Percentage', '10');
    await fillBasics(user, 'Taxi', '50.00');

    for (const name of ['Ana', 'Luis', 'Carla']) {
      await user.click(screen.getByLabelText(name));
    }

    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$160.00');
  });

  it('previews the tip and the resulting total before saving', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Dinner', '250.00');
    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    await user.type(screen.getByLabelText('Tip percentage'), '10');

    expect(screen.getByTestId('tip-preview')).toHaveTextContent(
      'Includes $25.00 tip — total $275.00',
    );
  });

  it('blocks saving and explains an invalid tip', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '250.00', 'Percentage', '101');

    expect(selectExpenses(state())).toHaveLength(0);
    expect(
      screen.getByText('The tip percentage must be between 0 and 100'),
    ).toBeInTheDocument();
  });

  it('accepts a fixed tip', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '100.00', 'Fixed amount', '10.00');

    expect(selectExpenses(state())[0]!.tip).toEqual({ kind: 'fixed', amountCents: 1000 });
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$110.00');
  });

  it('hides the tip input until a tip mode is chosen', () => {
    seedGroup();
    render(<ExpensesTab />);

    expect(screen.queryByLabelText('Tip percentage')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tip amount')).not.toBeInTheDocument();
  });

  it('opens an accessible sheet and dismisses it without adding an expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await openExpenseForm(user);
    expect(screen.getByRole('dialog', { name: 'New expense' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add expense' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Close New expense' }));
    expect(screen.queryByRole('dialog', { name: 'New expense' })).not.toBeInTheDocument();
    expect(selectExpenses(state())).toEqual([]);
  });
});
