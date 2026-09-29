import { describe, expect, it } from 'vitest';
import {
  buildCustomShares,
  buildShares,
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
