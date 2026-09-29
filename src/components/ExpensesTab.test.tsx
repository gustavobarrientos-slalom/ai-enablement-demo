import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpensesTab } from './ExpensesTab';
import { resetAppStore, useAppStore } from '../store/useAppStore';

function state() {
  return useAppStore.getState();
}

function seedGroup(): void {
  state().addParticipant('Ana');
  state().addParticipant('Luis');
  state().addParticipant('Carla');
}

async function fillBasics(user: ReturnType<typeof userEvent.setup>, concept: string, amount: string) {
  await user.type(screen.getByLabelText('Concept'), concept);
  await user.type(screen.getByLabelText('Amount'), amount);
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
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

    const shares = state().expenses[0]!.shares.map((share) => share.amountCents);
    expect(shares).toEqual([8334, 8333, 8333]);

    expect(screen.queryByText('No expenses yet')).not.toBeInTheDocument();
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$250.00');
  });

  it('shows an error when the concept is empty', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await user.type(screen.getByLabelText('Amount'), '50.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The concept is required');
    expect(state().expenses).toEqual([]);
  });

  it('shows an error when no beneficiary is selected', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Taxi', '50.00');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one beneficiary');
  });

  it('clears the form after a successful add', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await fillBasics(user, 'Taxi', '50.00');
    await user.click(screen.getByLabelText('Ana'));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByLabelText('Concept')).toHaveValue('');
    expect(screen.getByLabelText('Amount')).toHaveValue('');
  });
});

describe('custom split', () => {
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

    expect(state().expenses[0]!.shares).toEqual([
      { participantId: state().participants[0]!.id, amountCents: 6000 },
      { participantId: state().participants[1]!.id, amountCents: 4000 },
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
    await user.click(screen.getByRole('button', { name: 'Edit Dinner' }));

    // Two forms are mounted (create + edit), so scope to the expense row.
    const row = within(
      within(screen.getByRole('list', { name: 'Expenses' })).getAllByRole('listitem')[0]!,
    );
    const concept = row.getByLabelText('Concept');
    await user.clear(concept);
    await user.type(concept, 'Brunch');
    await user.click(row.getByRole('button', { name: 'Save changes' }));

    expect(state().expenses).toHaveLength(1);
    expect(state().expenses[0]!.concept).toBe('Brunch');
    expect(screen.getByText('Brunch')).toBeInTheDocument();
  });

  it('cancels editing without changing the expense', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);
    await user.click(screen.getByRole('button', { name: 'Edit Dinner' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(state().expenses[0]!.concept).toBe('Dinner');
    expect(screen.getByRole('button', { name: 'Edit Dinner' })).toBeInTheDocument();
  });

  it('deletes an expense and updates the total', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addDinner(user);
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$100.00');

    await user.click(screen.getByRole('button', { name: 'Delete Dinner' }));

    expect(state().expenses).toEqual([]);
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
});
