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

    expect(state().expenses[0]!.tip).toEqual({
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

    const id = state().expenses[0]!.id;
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

    const id = state().expenses[0]!.id;
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

    expect(state().expenses).toHaveLength(0);
    expect(
      screen.getByText('The tip percentage must be between 0 and 100'),
    ).toBeInTheDocument();
  });

  it('accepts a fixed tip', async () => {
    const user = userEvent.setup();
    seedGroup();
    render(<ExpensesTab />);

    await addTipped(user, 'Dinner', '100.00', 'Fixed amount', '10.00');

    expect(state().expenses[0]!.tip).toEqual({ kind: 'fixed', amountCents: 1000 });
    expect(screen.getByTestId('expenses-total')).toHaveTextContent('$110.00');
  });

  it('hides the tip input until a tip mode is chosen', () => {
    seedGroup();
    render(<ExpensesTab />);

    expect(screen.queryByLabelText('Tip percentage')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tip amount')).not.toBeInTheDocument();
  });
});
