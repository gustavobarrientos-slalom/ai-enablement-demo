import { compressToEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { CATEGORIES } from './category';
import { decodeShare, encodeShare, type SharePayload } from './share';
import type { SplitEvent } from './types';
import { makeExpense } from '../test/factories';

const participants = [
  { id: 'p1', name: 'Ana' },
  { id: 'p2', name: 'Luis' },
  { id: 'p3', name: 'Beto' },
];

function makeEvent(): SplitEvent {
  const equalExpense = makeExpense({
    id: 'equal',
    payerId: 'p1',
    beneficiaryIds: ['p1', 'p2'],
    amountCents: 1001,
    tip: { kind: 'percent', percent: 10, amountCents: 100 },
    category: 'food',
  });
  const customExpense = makeExpense({
    id: 'custom',
    payerId: 'p2',
    amountCents: 3000,
    shares: [
      { participantId: 'p1', amountCents: 1000 },
      { participantId: 'p3', amountCents: 2000 },
    ],
    tip: { kind: 'fixed', amountCents: 250 },
    category: 'drinks',
  });
  const categorizedExpenses = CATEGORIES.slice(2).map((category, index) =>
    makeExpense({
      id: `category-${category}`,
      payerId: 'p1',
      beneficiaryIds: ['p1'],
      amountCents: 100 + index,
      category,
    }),
  );

  return {
    id: 'original-event',
    name: 'Weekend trip',
    status: 'archived',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    participants,
    expenses: [equalExpense, customExpense, ...categorizedExpenses],
    paidTransfers: [{ fromId: 'p2', toId: 'p1', amountCents: 500 }],
  };
}

function payloadFrom(event: SplitEvent): SharePayload {
  return {
    v: 1,
    name: event.name,
    participants: event.participants,
    expenses: event.expenses,
    paidTransfers: event.paidTransfers,
  };
}

function compressed(value: unknown): string {
  return compressToEncodedURIComponent(JSON.stringify(value));
}

describe('event share encoding', () => {
  it('round trips all categories, split modes, tips and paid transfers', () => {
    const event = makeEvent();
    const decoded = decodeShare(encodeShare(event));

    expect(decoded).toEqual({ ok: true, value: payloadFrom(event) });
  });

  it('preserves exact cent amounts and percentage tips', () => {
    const event = makeEvent();
    const exactCentExpenses = [
      makeExpense({
        id: 'one-cent',
        payerId: 'p1',
        beneficiaryIds: ['p1'],
        amountCents: 1,
      }),
      makeExpense({
        id: 'large-amount',
        payerId: 'p2',
        shares: [{ participantId: 'p2', amountCents: 99999999 }],
        tip: { kind: 'percent', percent: 15, amountCents: 15000000 },
      }),
    ];
    const payload = {
      ...payloadFrom(event),
      expenses: exactCentExpenses,
    };
    const decoded = decodeShare(encodeShare({ ...event, expenses: exactCentExpenses }));

    expect(decoded).toEqual({ ok: true, value: payload });
    if (decoded.ok) {
      expect(decoded.value.expenses.map((expense) => expense.amountCents)).toEqual([
        1,
        99999999,
      ]);
      expect(decoded.value.expenses[1]?.tip).toEqual({
        kind: 'percent',
        percent: 15,
        amountCents: 15000000,
      });
    }
  });

  it('rejects truncated and altered payloads', () => {
    const encoded = encodeShare(makeEvent());
    const truncated = encoded.slice(0, -3);
    const altered = `${encoded[0] === 'a' ? 'b' : 'a'}${encoded.slice(1)}`;

    expect(decodeShare(truncated).ok).toBe(false);
    expect(decodeShare(altered).ok).toBe(false);
  });

  it('rejects non-JSON compressed text', () => {
    expect(decodeShare(compressToEncodedURIComponent('not JSON')).ok).toBe(false);
  });

  it('rejects unsupported versions and missing fields', () => {
    const valid = payloadFrom(makeEvent());

    expect(decodeShare(compressed({ ...valid, v: 2 })).ok).toBe(false);
    expect(decodeShare(compressed({ ...valid, expenses: undefined })).ok).toBe(false);
  });

  it('rejects an expense with an unknown payer', () => {
    const payload = payloadFrom(makeEvent());
    payload.expenses[0]!.payerId = 'unknown';

    expect(decodeShare(compressed(payload)).ok).toBe(false);
  });

  it('rejects duplicate participant ids and malformed tips', () => {
    const payload = payloadFrom(makeEvent());
    const duplicateParticipants = { ...payload, participants: [...participants, participants[0]] };
    const malformedTip = {
      ...payload,
      expenses: payload.expenses.map((expense, index) =>
        index === 0 ? { ...expense, tip: { kind: 'percent', percent: 101, amountCents: 10 } } : expense,
      ),
    };

    expect(decodeShare(compressed(duplicateParticipants)).ok).toBe(false);
    expect(decodeShare(compressed(malformedTip)).ok).toBe(false);
  });
});
