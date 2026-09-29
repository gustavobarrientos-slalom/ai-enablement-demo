import { describe, expect, it } from 'vitest';
import {
  isTransferPaid,
  isValidTransfer,
  reconcilePaidTransfers,
  sameTransfer,
} from './paidTransfers';
import type { Transfer } from './types';

const luisToAna: Transfer = {
  fromId: 'luis',
  toId: 'ana',
  amountCents: 5000,
};

describe('transfer identity', () => {
  it('matches payer, receiver, and exact integer-cent amount', () => {
    expect(sameTransfer(luisToAna, { ...luisToAna })).toBe(true);
    expect(sameTransfer(luisToAna, { ...luisToAna, fromId: 'carla' })).toBe(false);
    expect(sameTransfer(luisToAna, { ...luisToAna, toId: 'beto' })).toBe(false);
    expect(sameTransfer(luisToAna, { ...luisToAna, amountCents: 5001 })).toBe(false);
  });

  it('validates a positive, directed cent transfer', () => {
    expect(isValidTransfer(luisToAna)).toBe(true);
    expect(isValidTransfer({ ...luisToAna, amountCents: 0 })).toBe(false);
    expect(isValidTransfer({ ...luisToAna, amountCents: 1.5 })).toBe(false);
    expect(isValidTransfer({ ...luisToAna, toId: 'luis' })).toBe(false);
    expect(isValidTransfer(null)).toBe(false);
  });
});

describe('reconcilePaidTransfers', () => {
  it('retains only an identical tuple in the current plan', () => {
    const plan = [
      luisToAna,
      { fromId: 'carla', toId: 'ana', amountCents: 2500 },
    ];

    expect(
      reconcilePaidTransfers(
        [
          luisToAna,
          { ...luisToAna, amountCents: 6000 },
          { ...luisToAna, fromId: 'beto' },
        ],
        plan,
      ),
    ).toEqual([luisToAna]);
  });

  it('returns no marks for an empty plan', () => {
    expect(reconcilePaidTransfers([luisToAna], [])).toEqual([]);
  });

  it('does not revive a mark after its transfer disappears and reappears', () => {
    const afterDisappearance = reconcilePaidTransfers([luisToAna], []);

    expect(reconcilePaidTransfers(afterDisappearance, [luisToAna])).toEqual([]);
  });

  it('keeps identical tuples independent when each event has its own marks', () => {
    const eventA = reconcilePaidTransfers([luisToAna], [luisToAna]);
    const eventB = reconcilePaidTransfers([], [luisToAna]);

    expect(isTransferPaid(luisToAna, eventA)).toBe(true);
    expect(isTransferPaid(luisToAna, eventB)).toBe(false);
  });
});
