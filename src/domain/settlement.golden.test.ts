import { describe, expect, it } from 'vitest';
import { computeBalances, netsSum } from './balance';
import {
  expenseShares,
  expenseTotalCents,
  isExpenseConsistent,
  validateExpense,
} from './expense';
import { computeTransfers, maxTransfers } from './settle';
import type { Expense, ExpenseDraft, Participant, Transfer } from './types';

/**
 * The reference case from the settlement spec. Expenses are built through
 * validateExpense rather than hand-written shares, so this exercises the real
 * split arithmetic end to end.
 */
const ana: Participant = { id: 'p1', name: 'Ana' };
const luis: Participant = { id: 'p2', name: 'Luis' };
const carla: Participant = { id: 'p3', name: 'Carla' };
const beto: Participant = { id: 'p4', name: 'Beto' };
const diana: Participant = { id: 'p5', name: 'Diana' };

const participants = [ana, luis, carla, beto, diana];
const everyone = participants.map((participant) => participant.id);

function build(id: string, draft: ExpenseDraft): Expense {
  const result = validateExpense(draft, participants, id);

  if (!result.ok) {
    throw new Error(`golden fixture "${id}" failed to validate: ${result.error}`);
  }

  return result.value;
}

const dinnerDraft = {
  concept: 'Dinner',
  amount: '1000.00',
  payerId: ana.id,
  splitMode: 'equal' as const,
  beneficiaryIds: everyone,
  customAmounts: {},
};

const dinner = build('e1', {
  ...dinnerDraft,
  tipMode: 'percent' as const,
  tipValue: '10',
});

/** The same dinner with no tip, so the tip is provably the only difference. */
const dinnerWithoutTip = build('e1', {
  ...dinnerDraft,
  tipMode: 'none' as const,
  tipValue: '',
});

const uber = build('e2', {
  concept: 'Uber',
  amount: '250.00',
  payerId: luis.id,
  splitMode: 'equal',
  beneficiaryIds: [ana.id, luis.id, carla.id],
  customAmounts: {},
  tipMode: 'none' as const,
  tipValue: '',
});

const drinks = build('e3', {
  concept: 'Drinks',
  amount: '600.00',
  payerId: carla.id,
  splitMode: 'custom',
  beneficiaryIds: [beto.id, diana.id, carla.id],
  customAmounts: {
    [beto.id]: '300.00',
    [diana.id]: '200.00',
    [carla.id]: '100.00',
  },
  tipMode: 'none' as const,
  tipValue: '',
});

const dessert = build('e4', {
  concept: 'Dessert',
  amount: '100.01',
  payerId: beto.id,
  splitMode: 'equal',
  beneficiaryIds: everyone,
  customAmounts: {},
  tipMode: 'none' as const,
  tipValue: '',
});

const expenses = [dinner, uber, drinks, dessert];

function shareFor(expense: Expense, participantId: string): number {
  return (
    expense.shares.find((share) => share.participantId === participantId)?.amountCents ?? 0
  );
}

function named(transfers: readonly Transfer[]): string[] {
  const name = (id: string) =>
    participants.find((participant) => participant.id === id)!.name;

  return transfers.map(
    (transfer) =>
      `${name(transfer.fromId)} -> ${name(transfer.toId)} ${transfer.amountCents}`,
  );
}

describe('golden scenario expenses', () => {
  it('splits the dinner evenly with no remainder', () => {
    expect(dinner.shares.map((share) => share.amountCents)).toEqual([
      20000, 20000, 20000, 20000, 20000,
    ]);
  });

  it('splits the uber among Ana, Luis and Carla only', () => {
    expect(uber.shares).toEqual([
      { participantId: ana.id, amountCents: 8334 },
      { participantId: luis.id, amountCents: 8333 },
      { participantId: carla.id, amountCents: 8333 },
    ]);
    expect(shareFor(uber, beto.id)).toBe(0);
    expect(shareFor(uber, diana.id)).toBe(0);
  });

  it('keeps the custom drinks split exactly as entered', () => {
    expect(shareFor(drinks, beto.id)).toBe(30000);
    expect(shareFor(drinks, diana.id)).toBe(20000);
    expect(shareFor(drinks, carla.id)).toBe(10000);
    expect(shareFor(drinks, ana.id)).toBe(0);
  });

  it('gives the dessert leftover cent to the first participant', () => {
    expect(shareFor(dessert, ana.id)).toBe(2001);

    for (const participant of [luis, carla, beto, diana]) {
      expect(shareFor(dessert, participant.id)).toBe(2000);
    }
  });

  it('keeps every expense internally consistent', () => {
    for (const expense of expenses) {
      const base = expense.shares.reduce((sum, share) => sum + share.amountCents, 0);
      const derived = expenseShares(expense).reduce(
        (sum, share) => sum + share.amountCents,
        0,
      );

      expect(base).toBe(expense.amountCents);
      expect(derived).toBe(expenseTotalCents(expense));
      expect(isExpenseConsistent(expense)).toBe(true);
    }
  });

  it('adds a 10 percent tip to the dinner', () => {
    expect(dinner.tip).toEqual({ kind: 'percent', percent: 10, amountCents: 10000 });
    expect(expenseTotalCents(dinner)).toBe(110000);
  });

  it('spreads the dinner tip evenly across the five participants', () => {
    expect(expenseShares(dinner).map((share) => share.amountCents)).toEqual([
      22000, 22000, 22000, 22000, 22000,
    ]);
  });
});

describe('golden scenario balances', () => {
  const balances = computeBalances(participants, expenses);

  it.each([
    ['Ana', ana.id, 77665],
    ['Luis', luis.id, -7333],
    ['Carla', carla.id, 17667],
    ['Beto', beto.id, -43999],
    ['Diana', diana.id, -44000],
  ])('gives %s a net of %i cents', (_name, id, expected) => {
    const balance = balances.find((entry) => entry.participantId === id)!;

    expect(balance.netCents).toBe(expected);
  });

  it('sums the nets to exactly zero', () => {
    expect(netsSum(balances)).toBe(0);
  });

  it('reports the amounts each participant paid', () => {
    expect(balances.map((balance) => balance.paidCents)).toEqual([
      110000, 25000, 60000, 10001, 0,
    ]);
  });

  it('matches the pre tip nets when the dinner tip is removed', () => {
    const untipped = computeBalances(participants, [
      dinnerWithoutTip,
      uber,
      drinks,
      dessert,
    ]);

    expect(untipped.map((balance) => balance.netCents)).toEqual([
      69665, -5333, 19667, -41999, -42000,
    ]);
    expect(netsSum(untipped)).toBe(0);
  });
});

describe('golden scenario transfers', () => {
  const balances = computeBalances(participants, expenses);
  const result = computeTransfers(balances);

  it('produces a plan', () => {
    expect(result.ok).toBe(true);
  });

  it('matches the expected transfers in order', () => {
    expect(result.ok && named(result.value)).toEqual([
      'Diana -> Ana 44000',
      'Beto -> Ana 33665',
      'Beto -> Carla 10334',
      'Luis -> Carla 7333',
    ]);
  });

  it('uses exactly the N-1 bound of 4 transfers', () => {
    expect(result.ok && result.value).toHaveLength(4);
    expect(maxTransfers(participants.length)).toBe(4);
  });

  it('settles every participant to zero', () => {
    if (!result.ok) {
      throw new Error('expected a plan');
    }

    const nets = new Map(
      balances.map((balance) => [balance.participantId, balance.netCents]),
    );

    for (const transfer of result.value) {
      nets.set(transfer.fromId, nets.get(transfer.fromId)! + transfer.amountCents);
      nets.set(transfer.toId, nets.get(transfer.toId)! - transfer.amountCents);
    }

    expect([...nets.values()]).toEqual([0, 0, 0, 0, 0]);
  });
});
