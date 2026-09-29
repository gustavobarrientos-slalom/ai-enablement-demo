import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PRE_CATEGORY_STORAGE_VERSION,
  STORAGE_KEY,
  STORAGE_VERSION,
  resetAppStore,
  resetStoreClock,
  selectExpenses,
  selectExpensesTotal,
  useAppStore,
} from './useAppStore';

function state() {
  return useAppStore.getState();
}

/**
 * A literal version 4 event collection, written by hand so it captures the
 * real predecessor shape rather than whatever the current code produces.
 */
const V4_PAYLOAD = {
  version: PRE_CATEGORY_STORAGE_VERSION,
  state: {
    lastActiveEventId: 'ev-open',
    events: [
      {
        id: 'ev-open',
        name: 'Trip to Oaxaca',
        status: 'open',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        participants: [
          { id: 'p1', name: 'Ana' },
          { id: 'p2', name: 'Luis' },
        ],
        expenses: [
          {
            id: 'e1',
            concept: 'Dinner',
            amountCents: 10000,
            payerId: 'p1',
            splitMode: 'equal',
            shares: [
              { participantId: 'p1', amountCents: 5000 },
              { participantId: 'p2', amountCents: 5000 },
            ],
            tip: { kind: 'percent', percent: 10, amountCents: 1000 },
          },
          {
            id: 'e2',
            concept: 'Taxi',
            amountCents: 4000,
            payerId: 'p2',
            splitMode: 'equal',
            shares: [
              { participantId: 'p1', amountCents: 2000 },
              { participantId: 'p2', amountCents: 2000 },
            ],
            tip: null,
          },
        ],
      },
      {
        id: 'ev-archived',
        name: 'Last year',
        status: 'archived',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-02-01T00:00:00.000Z',
        participants: [{ id: 'q1', name: 'Carla' }],
        expenses: [
          {
            id: 'e3',
            concept: 'Hotel',
            amountCents: 25000,
            payerId: 'q1',
            splitMode: 'custom',
            shares: [{ participantId: 'q1', amountCents: 25000 }],
            tip: null,
          },
        ],
      },
    ],
  },
};

const LEGACY_V3_PAYLOAD = {
  version: 3,
  state: {
    eventName: 'Old group',
    participants: [
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Luis' },
    ],
    expenses: [
      {
        id: 'e1',
        concept: 'Dinner',
        amountCents: 10000,
        payerId: 'p1',
        splitMode: 'equal',
        shares: [
          { participantId: 'p1', amountCents: 5000 },
          { participantId: 'p2', amountCents: 5000 },
        ],
        tip: null,
      },
    ],
  },
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function store(payload: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function rehydrate(): Promise<void> {
  await useAppStore.persist.rehydrate();
}

function eventById(id: string) {
  const event = state().events.find((candidate) => candidate.id === id);

  if (!event) {
    throw new Error(`expected event ${id}`);
  }

  return event;
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

afterEach(() => {
  resetStoreClock();
});

describe('migrating a version 4 event collection', () => {
  it('gives every expense in every event the Other category', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    const categories = state().events.flatMap((event) =>
      event.expenses.map((expense) => expense.category),
    );

    expect(categories).toEqual(['other', 'other', 'other']);
  });

  it('migrates archived events too, without changing their status', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    const archived = eventById('ev-archived');

    expect(archived.status).toBe('archived');
    expect(archived.expenses[0]!.category).toBe('other');
  });

  it('preserves event metadata, order, participants, tips and shares', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    expect(state().events.map((event) => event.id)).toEqual(['ev-open', 'ev-archived']);

    const open = eventById('ev-open');

    expect(open.name).toBe('Trip to Oaxaca');
    expect(open.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(open.updatedAt).toBe('2024-01-02T00:00:00.000Z');
    expect(open.participants).toEqual([
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Luis' },
    ]);
    expect(open.expenses.map((expense) => expense.id)).toEqual(['e1', 'e2']);
    expect(open.expenses[0]!.tip).toEqual({
      kind: 'percent',
      percent: 10,
      amountCents: 1000,
    });
    expect(open.expenses[0]!.shares).toEqual([
      { participantId: 'p1', amountCents: 5000 },
      { participantId: 'p2', amountCents: 5000 },
    ]);
  });

  it('keeps the last active event selected and its tip-inclusive total', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    expect(state().activeEventId).toBe('ev-open');
    // 100.00 + its 10.00 tip + 40.00.
    expect(selectExpensesTotal(state())).toBe(15000);
  });

  it('keeps an explicit category already present in a predecessor payload', async () => {
    const payload = clone(V4_PAYLOAD);
    payload.state.events[0]!.expenses[0]!.tip = null;
    (payload.state.events[0]!.expenses[0] as Record<string, unknown>).category = 'food';
    store(payload);
    await rehydrate();

    expect(selectExpenses(state())[0]!.category).toBe('food');
  });

  it('rejects an explicit unknown category even in a predecessor payload', async () => {
    const payload = clone(V4_PAYLOAD);
    (payload.state.events[0]!.expenses[0] as Record<string, unknown>).category =
      'travel';
    store(payload);

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('rejects a predecessor payload whose tip is invalid', async () => {
    const payload = clone(V4_PAYLOAD);
    payload.state.events[0]!.expenses[0]!.tip = {
      kind: 'percent',
      percent: 10,
      amountCents: -1,
    };
    store(payload);

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('writes the collection back under the current version', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    const written = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as {
      version: number;
    };

    expect(written.version).toBe(STORAGE_VERSION);
    expect(STORAGE_VERSION).toBe(5);
  });
});

describe('migrating the version 3 single group', () => {
  it('wraps it into one open event whose expense gains Other', async () => {
    store(LEGACY_V3_PAYLOAD);
    await rehydrate();

    expect(state().events).toHaveLength(1);

    const event = state().events[0]!;

    expect(event.status).toBe('open');
    expect(event.name).toBe('Old group');
    expect(event.expenses[0]!.category).toBe('other');
    expect(event.expenses[0]!.tip).toBeNull();
  });

  it('still discards an untouched legacy group', async () => {
    store({ version: 3, state: { eventName: 'New event', participants: [], expenses: [] } });

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });
});

describe('current version payloads', () => {
  it('reloads a valid current-version collection unchanged', async () => {
    store(V4_PAYLOAD);
    await rehydrate();

    const migrated = localStorage.getItem(STORAGE_KEY)!;

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, migrated);
    await rehydrate();

    expect(state().events.map((event) => event.id)).toEqual(['ev-open', 'ev-archived']);
    expect(selectExpenses(state()).map((expense) => expense.category)).toEqual([
      'other',
      'other',
    ]);
    expect(selectExpensesTotal(state())).toBe(15000);
  });

  it('discards a current-version expense with no category', async () => {
    const payload = clone(V4_PAYLOAD);
    payload.version = STORAGE_VERSION;
    store(payload);

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards a current-version expense with an unknown category', async () => {
    const payload = clone(V4_PAYLOAD);
    payload.version = STORAGE_VERSION;

    for (const event of payload.state.events) {
      for (const expense of event.expenses) {
        (expense as Record<string, unknown>).category = 'travel';
      }
    }

    store(payload);

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });
});

describe('unusable payloads', () => {
  it('discards an unsupported version', async () => {
    store({ ...clone(V4_PAYLOAD), version: 99 });

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
    expect(state().activeEventId).toBeNull();
  });

  it('discards a version older than the supported predecessors', async () => {
    store({ ...clone(LEGACY_V3_PAYLOAD), version: 1 });

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards malformed data without crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ not json');

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards a predecessor expense referencing a missing participant', async () => {
    const payload = clone(V4_PAYLOAD);
    payload.state.events[0]!.expenses[0]!.payerId = 'ghost';
    store(payload);

    await expect(rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });
});
