import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettlementTab } from './SettlementTab';
import { App } from '../App';
import { resetAppStore, useAppStore } from '../store/useAppStore';

function state() {
  return useAppStore.getState();
}

function seed(names: string[]): string[] {
  for (const name of names) {
    state().addParticipant(name);
  }

  return state().participants.map((participant) => participant.id);
}

function addEqual(concept: string, amount: string, payerId: string, beneficiaryIds: string[]) {
  state().addExpense({
    concept,
    amount,
    payerId,
    splitMode: 'equal',
    beneficiaryIds,
    customAmounts: {},
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
});

describe('settled up state', () => {
  it('shows the settled message when there are no expenses', () => {
    seed(['Ana', 'Luis']);
    render(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Transfers' })).not.toBeInTheDocument();
  });

  it('shows the settled message when expenses cancel out', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '50.00', ana!, [ana!, luis!]);
    addEqual('Taxi', '50.00', luis!, [ana!, luis!]);

    render(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
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
      state().removeExpense(state().expenses[0]!.id);
    });
    rerender(<SettlementTab />);

    expect(screen.getByText('Everyone is settled up')).toBeInTheDocument();
  });

  it('updates after an expense amount is edited', () => {
    const [ana, luis] = seed(['Ana', 'Luis']);
    addEqual('Dinner', '100.00', ana!, [ana!, luis!]);

    const { rerender } = render(<SettlementTab />);

    act(() => {
      state().updateExpense(state().expenses[0]!.id, {
        concept: 'Dinner',
        amount: '40.00',
        payerId: ana!,
        splitMode: 'equal',
        beneficiaryIds: [ana!, luis!],
        customAmounts: {},
      });
    });
    rerender(<SettlementTab />);

    expect(transferRows()).toEqual(['Luis -> Ana $20.00']);
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
