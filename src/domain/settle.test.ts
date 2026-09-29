import { describe, expect, it } from 'vitest';
import { computeTransfers, maxTransfers } from './settle';
import type { Balance, Transfer } from './types';

/** Builds balances in participant order from [id, net] pairs. */
function balances(...nets: [string, number][]): Balance[] {
  return nets.map(([participantId, netCents]) => ({
    participantId,
    paidCents: netCents > 0 ? netCents : 0,
    consumedCents: netCents < 0 ? -netCents : 0,
    netCents,
  }));
}

function unwrap(result: ReturnType<typeof computeTransfers>): Transfer[] {
  if (!result.ok) {
    throw new Error(`expected a plan, got ${result.error}`);
  }

  return result.value;
}

function applyPlan(input: Balance[], transfers: readonly Transfer[]): Map<string, number> {
  const nets = new Map(input.map((balance) => [balance.participantId, balance.netCents]));

  for (const transfer of transfers) {
    nets.set(transfer.fromId, nets.get(transfer.fromId)! + transfer.amountCents);
    nets.set(transfer.toId, nets.get(transfer.toId)! - transfer.amountCents);
  }

  return nets;
}

describe('computeTransfers', () => {
  it('settles a single debtor against a single creditor', () => {
    const plan = unwrap(computeTransfers(balances(['ana', 5000], ['luis', -5000])));

    expect(plan).toEqual([{ fromId: 'luis', toId: 'ana', amountCents: 5000 }]);
  });

  it('splits one debtor across two creditors, largest creditor first', () => {
    const plan = unwrap(
      computeTransfers(balances(['ana', 6000], ['carla', 4000], ['beto', -10000])),
    );

    expect(plan).toEqual([
      { fromId: 'beto', toId: 'ana', amountCents: 6000 },
      { fromId: 'beto', toId: 'carla', amountCents: 4000 },
    ]);
  });

  it('settles one creditor from two debtors', () => {
    const plan = unwrap(
      computeTransfers(balances(['ana', 10000], ['luis', -6000], ['carla', -4000])),
    );

    expect(plan).toEqual([
      { fromId: 'luis', toId: 'ana', amountCents: 6000 },
      { fromId: 'carla', toId: 'ana', amountCents: 4000 },
    ]);
  });

  it('returns an empty plan when everyone is already even', () => {
    expect(unwrap(computeTransfers(balances(['ana', 0], ['luis', 0])))).toEqual([]);
  });

  it('returns an empty plan for a group with no participants', () => {
    expect(unwrap(computeTransfers([]))).toEqual([]);
  });

  it('breaks a debtor tie by participant order', () => {
    // Luis and Carla owe the same; Luis is earlier, so he is matched first.
    const plan = unwrap(
      computeTransfers(balances(['ana', 6000], ['luis', -3000], ['carla', -3000])),
    );

    expect(plan[0]!.fromId).toBe('luis');
    expect(plan[1]!.fromId).toBe('carla');
  });

  it('breaks a creditor tie by participant order', () => {
    const plan = unwrap(
      computeTransfers(balances(['ana', 3000], ['luis', 3000], ['carla', -6000])),
    );

    expect(plan[0]!.toId).toBe('ana');
    expect(plan[1]!.toId).toBe('luis');
  });

  it('is deterministic across repeated runs', () => {
    const input = balances(
      ['ana', 6000],
      ['luis', -3000],
      ['carla', -3000],
      ['beto', 4000],
      ['diana', -4000],
    );

    const first = unwrap(computeTransfers(input));
    const second = unwrap(computeTransfers(input));

    expect(first).toEqual(second);
  });

  it('does not mutate the balances it is given', () => {
    const input = balances(['ana', 5000], ['luis', -5000]);

    computeTransfers(input);

    expect(input.map((balance) => balance.netCents)).toEqual([5000, -5000]);
  });
});

describe('plan invariants', () => {
  const cases: [string, Balance[]][] = [
    ['single pair', balances(['a', 5000], ['b', -5000])],
    ['one debtor two creditors', balances(['a', 6000], ['b', 4000], ['c', -10000])],
    ['two debtors one creditor', balances(['a', 10000], ['b', -6000], ['c', -4000])],
    [
      'mixed five',
      balances(['a', 69665], ['b', -5333], ['c', 19667], ['d', -41999], ['e', -42000]),
    ],
    ['odd cents', balances(['a', 3334], ['b', -1667], ['c', -1667])],
    ['already settled', balances(['a', 0], ['b', 0], ['c', 0])],
    ['one active pair among idle participants', balances(['a', 100], ['b', -100], ['c', 0])],
  ];

  it.each(cases)('drives every net to zero: %s', (_label, input) => {
    const nets = applyPlan(input, unwrap(computeTransfers(input)));

    for (const net of nets.values()) {
      expect(net).toBe(0);
    }
  });

  it.each(cases)('emits only strictly positive amounts: %s', (_label, input) => {
    for (const transfer of unwrap(computeTransfers(input))) {
      expect(transfer.amountCents).toBeGreaterThan(0);
    }
  });

  it.each(cases)('never exceeds the N-1 bound: %s', (_label, input) => {
    const plan = unwrap(computeTransfers(input));

    expect(plan.length).toBeLessThanOrEqual(maxTransfers(input.length));
  });

  it.each(cases)('never pays a participant their own money: %s', (_label, input) => {
    for (const transfer of unwrap(computeTransfers(input))) {
      expect(transfer.fromId).not.toBe(transfer.toId);
    }
  });
});

describe('unbalanced input', () => {
  it('refuses to produce a plan when the nets do not sum to zero', () => {
    const result = computeTransfers(balances(['ana', 5000], ['luis', -4000]));

    expect(result).toEqual({ ok: false, error: 'NETS_DO_NOT_SUM' });
  });

  it('refuses a single participant holding a non zero net', () => {
    const result = computeTransfers(balances(['ana', 1]));

    expect(result).toEqual({ ok: false, error: 'NETS_DO_NOT_SUM' });
  });

  it('checks the sum before matching, so it cannot loop forever', () => {
    const result = computeTransfers(balances(['ana', 100], ['luis', 100]));

    expect(result.ok).toBe(false);
  });
});

describe('maxTransfers', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [5, 4],
  ])('is N-1 for %i participants', (count, expected) => {
    expect(maxTransfers(count)).toBe(expected);
  });
});
