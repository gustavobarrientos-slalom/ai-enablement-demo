import { describe, expect, it } from 'vitest';
import {
  buildCustomShares,
  buildShares,
  distributeProportionally,
  sharesTotal,
  splitDifference,
  splitEqually,
} from './split';
import type { Participant, Share } from './types';

const participants: Participant[] = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Luis' },
  { id: 'p3', name: 'Carla' },
  { id: 'p4', name: 'Mario' },
];

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) {
    throw new Error(`Expected success, got ${result.error}`);
  }

  return result.value;
}

function amounts(shares: readonly Share[]): number[] {
  return shares.map((share) => share.amountCents);
}

describe('splitEqually', () => {
  it('gives the leftover cent to the first beneficiary in participant order', () => {
    const shares = unwrap(splitEqually(25000, ['p1', 'p2', 'p3'], participants));

    expect(shares).toEqual([
      { participantId: 'p1', amountCents: 8334 },
      { participantId: 'p2', amountCents: 8333 },
      { participantId: 'p3', amountCents: 8333 },
    ]);
    expect(sharesTotal(shares)).toBe(25000);
  });

  it('divides evenly when there is no remainder', () => {
    const shares = unwrap(splitEqually(10000, ['p1', 'p2', 'p3', 'p4'], participants));

    expect(amounts(shares)).toEqual([2500, 2500, 2500, 2500]);
  });

  it('gives the full amount to a single beneficiary', () => {
    const shares = unwrap(splitEqually(3777, ['p2'], participants));

    expect(shares).toEqual([{ participantId: 'p2', amountCents: 3777 }]);
  });

  it('distributes two leftover cents to the first two in participant order', () => {
    const shares = unwrap(splitEqually(10, ['p1', 'p2', 'p3', 'p4'], participants));

    expect(amounts(shares)).toEqual([3, 3, 2, 2]);
    expect(sharesTotal(shares)).toBe(10);
  });

  it('follows participant order, not beneficiary selection order', () => {
    const shares = unwrap(splitEqually(25000, ['p3', 'p1', 'p2'], participants));

    expect(shares[0]).toEqual({ participantId: 'p1', amountCents: 8334 });
    expect(amounts(shares)).toEqual([8334, 8333, 8333]);
  });

  it('rejects an empty beneficiary list', () => {
    expect(splitEqually(1000, [], participants)).toEqual({
      ok: false,
      error: 'NO_BENEFICIARIES',
    });
  });

  it('rejects an unknown beneficiary', () => {
    expect(splitEqually(1000, ['nope'], participants)).toEqual({
      ok: false,
      error: 'UNKNOWN_PARTICIPANT',
    });
  });

  it('always sums exactly to the total across many inputs', () => {
    const ids = participants.map((participant) => participant.id);

    for (let amount = 1; amount <= 1000; amount += 7) {
      for (let count = 1; count <= ids.length; count += 1) {
        const shares = unwrap(splitEqually(amount, ids.slice(0, count), participants));

        expect(sharesTotal(shares)).toBe(amount);
        expect(shares).toHaveLength(count);
        const spread = Math.max(...amounts(shares)) - Math.min(...amounts(shares));
        expect(spread).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('buildCustomShares', () => {
  it('builds shares from explicit amounts', () => {
    const shares = unwrap(
      buildCustomShares(['p1', 'p2'], { p1: '60.00', p2: '40.00' }, participants),
    );

    expect(amounts(shares)).toEqual([6000, 4000]);
  });

  it('treats a missing amount as zero', () => {
    const shares = unwrap(buildCustomShares(['p1', 'p2'], { p1: '100' }, participants));

    expect(amounts(shares)).toEqual([10000, 0]);
  });

  it('rejects a negative share', () => {
    expect(buildCustomShares(['p1'], { p1: '-1' }, participants)).toEqual({
      ok: false,
      error: 'NEGATIVE_SHARE',
    });
  });
});

describe('splitDifference', () => {
  const shares: Share[] = [
    { participantId: 'p1', amountCents: 6000 },
    { participantId: 'p2', amountCents: 3000 },
  ];

  it('is negative when the parts are under the total', () => {
    expect(splitDifference(shares, 10000)).toBe(-1000);
  });

  it('is positive when the parts exceed the total', () => {
    expect(splitDifference(shares, 8000)).toBe(1000);
  });

  it('is zero when balanced', () => {
    expect(splitDifference(shares, 9000)).toBe(0);
  });
});

describe('buildShares', () => {
  it('dispatches to the equal split', () => {
    const shares = unwrap(
      buildShares(
        { splitMode: 'equal', beneficiaryIds: ['p1', 'p2', 'p3'], customAmounts: {} },
        25000,
        participants,
      ),
    );

    expect(amounts(shares)).toEqual([8334, 8333, 8333]);
  });

  it('accepts a balanced custom split', () => {
    const shares = unwrap(
      buildShares(
        {
          splitMode: 'custom',
          beneficiaryIds: ['p1', 'p2'],
          customAmounts: { p1: '60.00', p2: '40.00' },
        },
        10000,
        participants,
      ),
    );

    expect(amounts(shares)).toEqual([6000, 4000]);
  });

  it('allows a zero custom share', () => {
    const shares = unwrap(
      buildShares(
        {
          splitMode: 'custom',
          beneficiaryIds: ['p1', 'p2'],
          customAmounts: { p1: '100.00', p2: '0' },
        },
        10000,
        participants,
      ),
    );

    expect(amounts(shares)).toEqual([10000, 0]);
  });

  it('rejects a custom split under the total', () => {
    expect(
      buildShares(
        {
          splitMode: 'custom',
          beneficiaryIds: ['p1', 'p2'],
          customAmounts: { p1: '60.00', p2: '30.00' },
        },
        10000,
        participants,
      ),
    ).toEqual({ ok: false, error: 'SHARES_DO_NOT_SUM' });
  });

  it('rejects a custom split over the total', () => {
    expect(
      buildShares(
        {
          splitMode: 'custom',
          beneficiaryIds: ['p1', 'p2'],
          customAmounts: { p1: '60.00', p2: '50.00' },
        },
        10000,
        participants,
      ),
    ).toEqual({ ok: false, error: 'SHARES_DO_NOT_SUM' });
  });
});

describe('distributeProportionally', () => {
  it('distributes in proportion to consumption on a custom split', () => {
    // Drinks 600.00 split 300/200/100 with a 10% tip.
    expect(distributeProportionally(6000, [30000, 20000, 10000])).toEqual([
      3000, 2000, 1000,
    ]);
  });

  it('degenerates to an equal division when weights are equal', () => {
    expect(distributeProportionally(10000, [20000, 20000, 20000, 20000, 20000])).toEqual([
      2000, 2000, 2000, 2000, 2000,
    ]);
  });

  it('hands leftover cents out by largest remainder', () => {
    // 250.00 equally three ways gives base shares 8334/8333/8333.
    expect(distributeProportionally(2500, [8334, 8333, 8333])).toEqual([834, 833, 833]);
  });

  it('gives nothing to a beneficiary who consumed nothing', () => {
    expect(distributeProportionally(1000, [5000, 0, 5000])).toEqual([500, 0, 500]);
  });

  it('breaks remainder ties by index order', () => {
    // Three equal weights over 2 cents: the first two get the leftovers.
    expect(distributeProportionally(2, [100, 100, 100])).toEqual([1, 1, 0]);
  });

  it('returns zeros when every weight is zero rather than dividing by zero', () => {
    expect(distributeProportionally(1000, [0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('returns zeros for a zero total', () => {
    expect(distributeProportionally(0, [100, 200])).toEqual([0, 0]);
  });

  it('returns an empty list for no weights', () => {
    expect(distributeProportionally(1000, [])).toEqual([]);
  });

  it('always sums exactly to the total', () => {
    const cases: Array<[number, number[]]> = [
      [1, [1, 1, 1]],
      [7, [3, 5, 11]],
      [2500, [8334, 8333, 8333]],
      [99, [1, 2, 3, 4, 5, 6, 7]],
      [10000, [1]],
      [333, [7, 7, 7, 7, 7, 7]],
    ];

    for (const [total, weights] of cases) {
      const parts = distributeProportionally(total, weights);

      expect(parts.reduce((sum, part) => sum + part, 0)).toBe(total);
      expect(parts.every((part) => part >= 0)).toBe(true);
    }
  });
});
