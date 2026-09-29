import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettlementTab } from './SettlementTab';
import { App } from '../App';
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

function seed(names: string[]): string[] {
  for (const name of names) {
    state().addParticipant(name);
  }

  return selectParticipants(state()).map((participant) => participant.id);
}

function addEqual(concept: string, amount: string, payerId: string, beneficiaryIds: string[]) {
  state().addExpense({
    concept,
    amount,
    payerId,
    splitMode: 'equal',
    beneficiaryIds,
    customAmounts: {},
    tipMode: 'none' as const,
    tipValue: '',
    category: 'other' as const,
  });
}

function transferRows(): string[] {
  const list = screen.queryByRole('list', { name: 'Transfers' });

  if (!list) {
    return [];
  }

  // Each row carries a screen-reader label holding the canonical
  // "Diana -> Ana $420.00" form; assert on that rather than on the
  // concatenated textContent of the visual spans.
  return within(list)
    .getAllByRole('listitem')
    .map((row) => row.querySelector('.sr-only')?.textContent?.trim() ?? '');
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
  seedActiveEvent();
});

describe('settled up state', () => {
  it('shows the settled message when there are no expenses', () => {
    seed(['Ana', 'Luis']);
    render(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Transfers' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('transfer-progress')).not.toBeInTheDocument();
    expect(screen.queryByText('All paid — event closed')).not.toBeInTheDocument();
  });

  it('shows the settled message when expenses cancel out', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '50.00', ana!, [ana!, luis!]);
    addEqual('Taxi', '50.00', luis!, [ana!, luis!]);

    render(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
  });
});

describe('PDF export controls', () => {
  it('disables export when the event has no expenses', () => {
    seed(['Ana', 'Luis']);
    render(<SettlementTab />);

    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeDisabled();
  });

  it('enables export when the event has expenses', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);
    render(<SettlementTab />);

    expect(screen.getByRole('button', { name: 'Export PDF' })).toBeEnabled();
  });

});

describe('balance table', () => {
  it('lists participants in insertion order', () => {
    seed(['Ana', 'Luis', 'Carla']);
    render(<SettlementTab />);

    const rows = within(screen.getByRole('list', { name: 'Balances' })).getAllByRole(
      'listitem',
    );

    expect(rows.map((row) => row.textContent?.split('Paid')[0]?.trim())).toEqual([
      'Ana',
      'Luis',
      'Carla',
    ]);
  });

  it('shows paid, consumed and net for each participant', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);

    render(<SettlementTab />);

    expect(screen.getByTestId(`net-${ana}`)).toHaveTextContent('$50.00');
    expect(screen.getByTestId(`net-${luis}`)).toHaveTextContent('-$50.00');
    expect(screen.getByText(/Paid \$100\.00/)).toBeInTheDocument();
  });
});

describe('golden scenario rendering', () => {
  function seedGolden(): string[] {
    const [ana, luis, carla, beto, diana] = seed([
      'Ana',
      'Luis',
      'Carla',
      'Beto',
      'Diana',
    ]);
    const everyone = [ana!, luis!, carla!, beto!, diana!];

    addEqual('Dinner', '1000.00', ana!, everyone);
    addEqual('Uber', '250.00', luis!, [ana!, luis!, carla!]);
    state().addExpense({
      concept: 'Drinks',
      amount: '600.00',
      payerId: carla!,
      splitMode: 'custom',
      beneficiaryIds: [beto!, diana!, carla!],
      customAmounts: {
        [beto!]: '300.00',
        [diana!]: '200.00',
        [carla!]: '100.00',
      },
      tipMode: 'none' as const,
      tipValue: '',
      category: 'other' as const,
    });
    addEqual('Dessert', '100.01', beto!, everyone);

    return everyone;
  }

  it('renders the expected nets', () => {
    const [ana, luis, carla, beto, diana] = seedGolden();
    render(<SettlementTab />);

    expect(screen.getByTestId(`net-${ana}`)).toHaveTextContent('$696.65');
    expect(screen.getByTestId(`net-${luis}`)).toHaveTextContent('-$53.33');
    expect(screen.getByTestId(`net-${carla}`)).toHaveTextContent('$196.67');
    expect(screen.getByTestId(`net-${beto}`)).toHaveTextContent('-$419.99');
    expect(screen.getByTestId(`net-${diana}`)).toHaveTextContent('-$420.00');
  });

  it('renders the expected transfers in order', () => {
    seedGolden();
    render(<SettlementTab />);

    expect(transferRows()).toEqual([
      'Diana -> Ana $420.00',
      'Beto -> Ana $276.65',
      'Beto -> Carla $143.34',
      'Luis -> Carla $53.33',
    ]);
    const rows = within(screen.getByRole('list', { name: 'Transfers' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('$420.00');
    expect(rows[0]?.querySelector('[aria-label="Open"]')).not.toBeInTheDocument();
  });

  it('stays within the N-1 bound', () => {
    seedGolden();
    render(<SettlementTab />);

    expect(transferRows()).toHaveLength(4);
  });
});

describe('recalculation', () => {
  it('updates after an expense is added', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    const { rerender } = render(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();

    act(() => {
      addEqual('Dinner', '100.00', ana!, [ana!, luis!]);
    });
    rerender(<SettlementTab />);

    expect(screen.queryByText('Everyone is settled up')).not.toBeInTheDocument();
    expect(transferRows()).toEqual(['Luis -> Ana $50.00']);
  });

  it('returns to settled up after the last expense is deleted', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);

    const { rerender } = render(<SettlementTab />);
    expect(transferRows()).toHaveLength(1);

    act(() => {
      state().removeExpense(selectExpenses(state())[0]!.id);
    });
    rerender(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
  });

  it('updates after an expense amount is edited', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);

    const { rerender } = render(<SettlementTab />);

    act(() => {
      state().updateExpense(selectExpenses(state())[0]!.id, {
        concept: 'Dinner',
        amount: '40.00',
        payerId: ana!,
        splitMode: 'equal',
        beneficiaryIds: [ana!, luis!],
        customAmounts: {},
        tipMode: 'none' as const,
        tipValue: '',
        category: 'other' as const,
      });
    });
    rerender(<SettlementTab />);

    expect(transferRows()).toEqual(['Luis -> Ana $20.00']);
  });
});

describe('transfer payment checklist', () => {
  function seedOneTransfer(): [string, string] {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);

    return [ana!, luis!];
  }

  it('uses one full-row checkbox with a trailing checked indicator', async () => {
    const user = userEvent.setup();
    seedOneTransfer();
    render(<SettlementTab />);

    const row = within(screen.getByRole('list', { name: 'Transfers' })).getByRole('listitem');
    const checkbox = within(row).getByRole('checkbox', { name: 'Paid: Luis -> Ana $50.00' });
    const label = row.querySelector('label')!;
    const visualRow = checkbox.nextElementSibling!;
    const indicator = visualRow.lastElementChild!;

    expect(label).toHaveClass('relative', 'block');
    expect(checkbox).toHaveClass('mobile-input', 'absolute', 'inset-0', 'h-full', 'w-full');
    expect(visualRow).toHaveClass('flex', 'items-center', 'peer-focus-visible:outline');
    expect(indicator).toHaveClass('h-11', 'w-11', 'text-primary');
    expect(indicator).not.toHaveClass('rounded-full', 'border-2', 'bg-primary');
    expect(indicator.querySelector('svg')).toBeNull();
    expect(within(row).getByText('$50.00')).toBeInTheDocument();

    await user.click(label);
    expect(checkbox).toBeChecked();
    expect(indicator).not.toHaveClass('rounded-full', 'border-2', 'bg-primary');
    expect(indicator.querySelector('svg')).toHaveAttribute('data-icon', 'check');
    await user.keyboard(' ');
    expect(checkbox).not.toBeChecked();
    expect(indicator).not.toHaveClass('rounded-full', 'border-2', 'bg-primary');
    expect(indicator.querySelector('svg')).toBeNull();
  });

  it('checks and unchecks a transfer and shows full progress without changing settlement', async () => {
    const user = userEvent.setup();
    const [ana, luis] = seedOneTransfer();
    const { rerender } = render(<SettlementTab />);
    const checkbox = screen.getByRole('checkbox', {
      name: 'Paid: Luis -> Ana $50.00',
    });

    await user.click(checkbox);
    rerender(<SettlementTab />);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 of 1 paid')).toBeInTheDocument();
    expect(screen.getByText('All paid — event closed')).toBeInTheDocument();
    expect(state().events[0]!.status).toBe('open');
    expect(state().events[0]!.participants.map((participant) => participant.id)).toEqual([
      ana,
      luis,
    ]);
    expect(state().events[0]!.expenses).toHaveLength(1);
    expect(screen.getByTestId(`net-${ana}`)).toHaveTextContent('$50.00');
    expect(screen.getByTestId(`net-${luis}`)).toHaveTextContent('-$50.00');

    await user.click(checkbox);
    rerender(<SettlementTab />);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('0 of 1 paid')).toBeInTheDocument();
    expect(screen.queryByText('All paid — event closed')).not.toBeInTheDocument();
  });

  it('shows partial progress for a multi-transfer plan', async () => {
    const user = userEvent.setup();
    const [ana, beto, carla] = seed(['Ana', 'Beto', 'Carla']);
    addEqual('Dinner', '100.00', ana!, [beto!]);
    addEqual('Taxi', '40.00', carla!, [beto!]);
    render(<SettlementTab />);

    expect(screen.getByText('0 of 2 paid')).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Paid: Beto -> Ana $100.00',
      }),
    );

    expect(screen.getByText('1 of 2 paid')).toBeInTheDocument();
    expect(screen.queryByText('All paid — event closed')).not.toBeInTheDocument();
  });

  it('keeps archived payments visible with disabled checkboxes', async () => {
    const user = userEvent.setup();
    seedOneTransfer();
    state().toggleTransferPaid({
      fromId: selectParticipants(state())[1]!.id,
      toId: selectParticipants(state())[0]!.id,
      amountCents: 5000,
    });
    state().archiveEvent(state().activeEventId!);

    render(<SettlementTab />);

    const checkbox = screen.getByRole('checkbox', {
      name: 'Paid: Luis -> Ana $50.00',
    });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.nextElementSibling?.lastElementChild?.querySelector('svg'))
      .toHaveAttribute('data-icon', 'check');
    expect(screen.getByText('1 of 1 paid')).toBeInTheDocument();
    expect(screen.getByText('All paid — event closed')).toBeInTheDocument();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('restores checked state after reload', async () => {
    const user = userEvent.setup();
    seedOneTransfer();
    const { unmount } = render(<SettlementTab />);
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Paid: Luis -> Ana $50.00',
      }),
    );
    const stored = localStorage.getItem('split:v2');

    unmount();
    resetAppStore();
    localStorage.setItem('split:v2', stored!);
    await act(async () => {
      await useAppStore.persist.rehydrate();
    });
    render(<SettlementTab />);

    expect(
      screen.getByRole('checkbox', { name: 'Paid: Luis -> Ana $50.00' }),
    ).toBeChecked();
    expect(screen.getByText('1 of 1 paid')).toBeInTheDocument();
  });

  it('recomputes progress when a paid transfer changes amount', async () => {
    const user = userEvent.setup();
    const [ana, luis] = seedOneTransfer();
    render(<SettlementTab />);

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Paid: Luis -> Ana $50.00',
      }),
    );
    act(() => {
      state().updateExpense(selectExpenses(state())[0]!.id, {
        concept: 'Dinner',
        amount: '120.00',
        payerId: ana,
        splitMode: 'equal',
        beneficiaryIds: [ana, luis],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other',
      });
    });

    expect(screen.getByText('0 of 1 paid')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', {
        name: 'Paid: Luis -> Ana $60.00',
      }),
    ).not.toBeChecked();
  });
});

describe('tab availability', () => {
  it('keeps the Settlement tab disabled below two participants', async () => {
    const user = userEvent.setup();
    seed(['Ana']);
    render(<App />);

    const tab = screen.getByRole('tab', { name: 'Settlement' });
    expect(tab).toBeDisabled();

    act(() => {
      state().addParticipant('Luis');
    });

    await user.click(screen.getByRole('tab', { name: 'Settlement' }));

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
  });
});
