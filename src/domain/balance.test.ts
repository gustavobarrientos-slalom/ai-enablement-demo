import { describe, expect, it } from 'vitest';
import { areNetsBalanced, computeBalances, isSettledUp, netsSum } from './balance';
import { validateExpense } from './expense';
import type { Expense, Participant } from './types';

const ana: Participant = { id: '1', name: 'Ana' };
const luis: Participant = { id: '2', name: 'Luis' };
const carla: Participant = { id: '3', name: 'Carla' };
const participants = [ana, luis, carla];

function expense(
  concept: string,
  amount: string,
  payerId: string,
  beneficiaryIds: string[],
): Expense {
  const result = validateExpense(
    {
      concept,
      amount,
      payerId,
      splitMode: 'equal',
      beneficiaryIds,
      customAmounts: {},
    },
    participants,
    concept,
  );

  if (!result.ok) {
    throw new Error(`fixture failed to validate: ${result.error}`);
  }

  return result.value;
}

function netFor(balances: ReturnType<typeof computeBalances>, id: string): number {
  return balances.find((balance) => balance.participantId === id)!.netCents;
}

describe('computeBalances', () => {
  it('reports paid, consumed and net for a payer who benefits', () => {
    const balances = computeBalances(participants, [
      expense('Dinner', '100.00', ana.id, [ana.id, luis.id]),
    ]);

    expect(balances[0]).toEqual({
      participantId: ana.id,
      paidCents: 10000,
      consumedCents: 5000,
      netCents: 5000,
    });
  });

  it('reports a beneficiary who paid nothing', () => {
    const balances = computeBalances(participants, [
      expense('Dinner', '100.00', ana.id, [ana.id, luis.id]),
    ]);

    expect(balances[1]).toEqual({
      participantId: luis.id,
      paidCents: 0,
      consumedCents: 5000,
      netCents: -5000,
    });
  });

  it('gives a payer who is not a beneficiary the full amount as credit', () => {
    const balances = computeBalances(participants, [
      expense('Taxi', '60.00', ana.id, [luis.id, carla.id]),
    ]);

    expect(netFor(balances, ana.id)).toBe(6000);
    expect(balances[0]!.consumedCents).toBe(0);
  });

  it('reports zeroes for a participant with no activity', () => {
    const balances = computeBalances(participants, [
      expense('Taxi', '60.00', ana.id, [ana.id]),
    ]);

    expect(balances[2]).toEqual({
      participantId: carla.id,
      paidCents: 0,
      consumedCents: 0,
      netCents: 0,
    });
  });

  it('returns one balance per participant in insertion order', () => {
    const balances = computeBalances(participants, []);

    expect(balances.map((balance) => balance.participantId)).toEqual([
      ana.id,
      luis.id,
      carla.id,
    ]);
  });

  it('accumulates across several expenses', () => {
    const balances = computeBalances(participants, [
      expense('Dinner', '90.00', ana.id, [ana.id, luis.id, carla.id]),
      expense('Taxi', '30.00', luis.id, [ana.id, luis.id, carla.id]),
    ]);

    expect(netFor(balances, ana.id)).toBe(9000 - 3000 - 1000);
    expect(netFor(balances, luis.id)).toBe(3000 - 3000 - 1000);
    expect(netFor(balances, carla.id)).toBe(-3000 - 1000);
  });

  it('ignores expenses referencing participants who are gone', () => {
    const ghost: Expense = {
      id: 'ghost',
      concept: 'Ghost',
      amountCents: 5000,
      payerId: 'missing',
      splitMode: 'custom',
      shares: [{ participantId: 'missing', amountCents: 5000 }],
    };

    const balances = computeBalances(participants, [ghost]);

    expect(balances.every((balance) => balance.netCents === 0)).toBe(true);
  });
});

describe('netsSum', () => {
  it('is zero for an empty group', () => {
    expect(netsSum(computeBalances(participants, []))).toBe(0);
  });

  it.each([
    ['equal split with no remainder', '90.00'],
    ['equal split with one leftover cent', '100.01'],
    ['equal split with two leftover cents', '100.02'],
    ['smallest possible amount', '0.01'],
  ])('sums to exactly zero for an %s', (_label, amount) => {
    const balances = computeBalances(participants, [
      expense('Item', amount, ana.id, [ana.id, luis.id, carla.id]),
    ]);

    expect(netsSum(balances)).toBe(0);
    expect(areNetsBalanced(balances)).toBe(true);
  });

  it('reports unbalanced nets when the data is inconsistent', () => {
    const broken = [
      { participantId: ana.id, paidCents: 100, consumedCents: 0, netCents: 100 },
    ];

    expect(netsSum(broken)).toBe(100);
    expect(areNetsBalanced(broken)).toBe(false);
  });
});

describe('isSettledUp', () => {
  it('is true when there are no expenses', () => {
    expect(isSettledUp(computeBalances(participants, []))).toBe(true);
  });

  it('is true when expenses cancel out', () => {
    const balances = computeBalances(participants, [
      expense('Dinner', '50.00', ana.id, [ana.id, luis.id]),
      expense('Taxi', '50.00', luis.id, [ana.id, luis.id]),
    ]);

    expect(isSettledUp(balances)).toBe(true);
  });

  it('is true for a self funded expense', () => {
    const balances = computeBalances(participants, [
      expense('Coffee', '30.00', ana.id, [ana.id]),
    ]);

    expect(isSettledUp(balances)).toBe(true);
  });

  it('is false when someone owes', () => {
    const balances = computeBalances(participants, [
      expense('Dinner', '50.00', ana.id, [ana.id, luis.id]),
    ]);

    expect(isSettledUp(balances)).toBe(false);
  });
});
