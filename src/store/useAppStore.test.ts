import { beforeEach, describe, expect, it } from 'vitest';
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  resetAppStore,
  selectBalances,
  selectCanRemoveParticipant,
  selectTransfers,
  selectExpensesTotal,
  selectIsGroupValid,
  useAppStore,
} from './useAppStore';
import { DEFAULT_EVENT_NAME } from '../domain/group';
import { makeExpense } from '../test/factories';

function state() {
  return useAppStore.getState();
}

function participantNames(): string[] {
  return state().participants.map((participant) => participant.name);
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

describe('initial state', () => {
  it('uses the default event name and has no participants', () => {
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
    expect(state().expenses).toEqual([]);
  });
});

describe('setEventName', () => {
  it('stores a valid trimmed name', () => {
    expect(state().setEventName('  Trip to Oaxaca  ')).toBe(true);
    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(state().lastError).toBeNull();
  });

  it('rejects an empty name and keeps the previous one', () => {
    state().setEventName('Trip to Oaxaca');

    expect(state().setEventName('   ')).toBe(false);
    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(state().lastError).toBe('EMPTY_EVENT_NAME');
  });

  it('rejects a name longer than 60 characters', () => {
    expect(state().setEventName('a'.repeat(61))).toBe(false);
    expect(state().lastError).toBe('EVENT_NAME_TOO_LONG');
  });
});

describe('addParticipant', () => {
  it('adds participants in insertion order with unique ids', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Sofia');

    expect(participantNames()).toEqual(['Ana', 'Luis', 'Sofia']);
    expect(new Set(state().participants.map((p) => p.id)).size).toBe(3);
  });

  it('rejects duplicates case-insensitively', () => {
    state().addParticipant('Ana');

    expect(state().addParticipant('  ANA  ')).toBe(false);
    expect(participantNames()).toEqual(['Ana']);
    expect(state().lastError).toBe('DUPLICATE_NAME');
  });

  it('rejects empty or overly long names', () => {
    expect(state().addParticipant('  ')).toBe(false);
    expect(state().lastError).toBe('EMPTY_NAME');

    expect(state().addParticipant('a'.repeat(31))).toBe(false);
    expect(state().lastError).toBe('NAME_TOO_LONG');

    expect(state().participants).toEqual([]);
  });

  it('clears the error after a successful action', () => {
    state().addParticipant('');
    expect(state().lastError).toBe('EMPTY_NAME');

    state().addParticipant('Ana');
    expect(state().lastError).toBeNull();
  });
});

describe('removeParticipant', () => {
  it('removes a participant without expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana] = state().participants;

    expect(state().removeParticipant(ana!.id)).toBe(true);
    expect(participantNames()).toEqual(['Luis']);
  });

  it('blocks removing someone with associated expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana, luis] = state().participants;
    useAppStore.setState({
      expenses: [makeExpense({ payerId: ana!.id, beneficiaryIds: [luis!.id] })],
    });

    expect(state().removeParticipant(ana!.id)).toBe(false);
    expect(state().removeParticipant(luis!.id)).toBe(false);
    expect(participantNames()).toEqual(['Ana', 'Luis']);
    expect(state().lastError).toBe('PARTICIPANT_HAS_EXPENSES');
  });
});

describe('derived selectors', () => {
  it('computes group validity without storing it', () => {
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Ana');
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Luis');
    expect(selectIsGroupValid(state())).toBe(true);

    const [ana] = state().participants;
    state().removeParticipant(ana!.id);
    expect(selectIsGroupValid(state())).toBe(false);

    expect(Object.keys(state())).not.toContain('isGroupValid');
  });

  it('reports whether a participant can be removed', () => {
    state().addParticipant('Ana');
    const [ana] = state().participants;
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(true);

    useAppStore.setState({
      expenses: [makeExpense({ payerId: ana!.id })],
    });
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(false);
  });
});

describe('persistence', () => {
  it('saves state to localStorage under a versioned key', async () => {
    state().setEventName('Trip to Oaxaca');
    state().addParticipant('Ana');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const stored = JSON.parse(raw!);
    expect(stored.version).toBe(STORAGE_VERSION);
    expect(stored.state.eventName).toBe('Trip to Oaxaca');
    expect(stored.state.participants).toHaveLength(1);
    expect(stored.state.expenses).toEqual([]);
  });

  it('restores state and order on reload', async () => {
    state().setEventName('Trip to Oaxaca');
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Sofia');

    const stored = localStorage.getItem(STORAGE_KEY)!;
    resetAppStore();
    expect(state().participants).toEqual([]);

    // Simulates a reload: storage still holds what was saved before.
    localStorage.setItem(STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();

    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(participantNames()).toEqual(['Ana', 'Luis', 'Sofia']);
  });

  it('discards corrupted data without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, state: { eventName: 42, participants: 'nope' } }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('discards invalid JSON without crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json');

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('discards an unknown version without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 99,
        state: { eventName: 'Old', participants: [{ id: '1', name: 'Ana' }] },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().participants).toEqual([]);
  });

  it('keeps store actions after rehydrating', async () => {
    await useAppStore.persist.rehydrate();
    expect(typeof state().addParticipant).toBe('function');
  });
});

describe('expenses', () => {
  function seedParticipants(): [string, string, string] {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Carla');

    const [ana, luis, carla] = state().participants;

    return [ana!.id, luis!.id, carla!.id];
  }

  function equalDraft(payerId: string, beneficiaryIds: string[], amount = '250.00') {
    return {
      concept: 'Dinner',
      amount,
      payerId,
      splitMode: 'equal' as const,
      beneficiaryIds,
      customAmounts: {},
      tipMode: 'none' as const,
      tipValue: '',
    };
  }

  it('adds an expense with shares summing to the amount', () => {
    const [ana, luis, carla] = seedParticipants();

    expect(state().addExpense(equalDraft(ana, [ana, luis, carla]))).toBe(true);
    expect(state().expenses).toHaveLength(1);

    const expense = state().expenses[0]!;
    expect(expense.amountCents).toBe(25000);
    expect(expense.shares.map((share) => share.amountCents)).toEqual([8334, 8333, 8333]);
    expect(state().lastError).toBeNull();
  });

  it('rejects an invalid expense and leaves state unchanged', () => {
    const [ana, luis] = seedParticipants();

    expect(state().addExpense(equalDraft(ana, [ana, luis], '0'))).toBe(false);
    expect(state().expenses).toEqual([]);
    expect(state().lastError).toBe('AMOUNT_NOT_POSITIVE');
  });

  it('updates an existing expense in place', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    const id = state().expenses[0]!.id;

    expect(
      state().updateExpense(id, {
        ...equalDraft(luis, [ana, luis], '50.00'),
        concept: 'Taxi',
      }),
    ).toBe(true);

    expect(state().expenses).toHaveLength(1);

    const expense = state().expenses[0]!;
    expect(expense.id).toBe(id);
    expect(expense.concept).toBe('Taxi');
    expect(expense.amountCents).toBe(5000);
    expect(expense.payerId).toBe(luis);
  });

  it('leaves the expense untouched when an edit is invalid', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    const before = state().expenses[0]!;

    expect(state().updateExpense(before.id, equalDraft(ana, [], '100.00'))).toBe(false);
    expect(state().expenses[0]).toEqual(before);
    expect(state().lastError).toBe('NO_BENEFICIARIES');
  });

  it('ignores updates for an unknown expense id', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    expect(state().updateExpense('missing', equalDraft(ana, [ana, luis]))).toBe(false);
    expect(state().expenses).toHaveLength(1);
  });

  it('removes an expense and updates the total', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));
    state().addExpense(equalDraft(luis, [ana, luis], '40.00'));

    expect(selectExpensesTotal(state())).toBe(14000);

    const id = state().expenses[0]!.id;
    state().removeExpense(id);

    expect(state().expenses).toHaveLength(1);
    expect(selectExpensesTotal(state())).toBe(4000);
  });

  it('blocks removing a participant referenced by an expense', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    expect(selectCanRemoveParticipant(state())(ana)).toBe(false);
    expect(state().removeParticipant(ana)).toBe(false);
    expect(state().lastError).toBe('PARTICIPANT_HAS_EXPENSES');
  });

  it('computes the total without storing it', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    expect(selectExpensesTotal(state())).toBe(10000);
    expect(Object.keys(state())).not.toContain('total');
    expect(Object.keys(state())).not.toContain('balances');
  });
});

describe('expense persistence', () => {
  async function reload(): Promise<void> {
    const stored = localStorage.getItem(STORAGE_KEY)!;
    resetAppStore();
    localStorage.setItem(STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();
  }

  it('restores expenses in order across a reload', async () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [ana, luis] = state().participants;

    for (const concept of ['First', 'Second', 'Third']) {
      state().addExpense({
        concept,
        amount: '30.00',
        payerId: ana!.id,
        splitMode: 'equal',
        beneficiaryIds: [ana!.id, luis!.id],
        customAmounts: {},
        tipMode: 'none' as const,
        tipValue: '',
      });
    }

    await reload();

    expect(state().expenses.map((expense) => expense.concept)).toEqual([
      'First',
      'Second',
      'Third',
    ]);
    expect(selectExpensesTotal(state())).toBe(9000);
  });

  it('discards expenses whose shares do not sum to the amount', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        state: {
          eventName: 'Trip',
          participants: [{ id: '1', name: 'Ana' }],
          expenses: [
            {
              id: 'e1',
              concept: 'Dinner',
              amountCents: 10000,
              payerId: '1',
              splitMode: 'equal',
              shares: [{ participantId: '1', amountCents: 9999 }],
            },
          ],
        },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().expenses).toEqual([]);
  });

  it('discards expenses referencing an unknown participant', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        state: {
          eventName: 'Trip',
          participants: [{ id: '1', name: 'Ana' }],
          expenses: [
            {
              id: 'e1',
              concept: 'Dinner',
              amountCents: 10000,
              payerId: '1',
              splitMode: 'equal',
              shares: [{ participantId: 'ghost', amountCents: 10000 }],
            },
          ],
        },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().expenses).toEqual([]);
    expect(state().participants).toEqual([]);
  });

  it('discards a version 1 payload instead of crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { eventName: 'Old trip', participants: [{ id: '1', name: 'Ana' }] },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
    expect(state().expenses).toEqual([]);
  });
});

describe('settlement selectors', () => {
  function seed(): [string, string] {
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [ana, luis] = state().participants;

    return [ana!.id, luis!.id];
  }

  function dinner(payerId: string, beneficiaryIds: string[], amount: string) {
    return {
      concept: 'Dinner',
      amount,
      payerId,
      splitMode: 'equal' as const,
      beneficiaryIds,
      customAmounts: {},
      tipMode: 'none' as const,
      tipValue: '',
    };
  }

  function netFor(participantId: string): number {
    return selectBalances(state()).find(
      (balance) => balance.participantId === participantId,
    )!.netCents;
  }

  it('reports zero balances before any expense', () => {
    const [ana, luis] = seed();

    expect(netFor(ana)).toBe(0);
    expect(netFor(luis)).toBe(0);
  });

  it('produces no transfers when everyone is even', () => {
    seed();

    const result = selectTransfers(state());

    expect(result).toEqual({ ok: true, value: [] });
  });

  it('recalculates balances after adding an expense', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    expect(netFor(ana)).toBe(5000);
    expect(netFor(luis)).toBe(-5000);
  });

  it('recalculates transfers after adding an expense', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    const result = selectTransfers(state());

    expect(result).toEqual({
      ok: true,
      value: [{ fromId: luis, toId: ana, amountCents: 5000 }],
    });
  });

  it('recalculates after editing an expense amount', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    const id = state().expenses[0]!.id;
    state().updateExpense(id, dinner(ana, [ana, luis], '40.00'));

    expect(netFor(ana)).toBe(2000);

    const result = selectTransfers(state());
    expect(result.ok && result.value).toEqual([
      { fromId: luis, toId: ana, amountCents: 2000 },
    ]);
  });

  it('returns to settled up after deleting the only expense', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));
    state().removeExpense(state().expenses[0]!.id);

    expect(netFor(ana)).toBe(0);
    expect(netFor(luis)).toBe(0);
    expect(selectTransfers(state())).toEqual({ ok: true, value: [] });
  });

  it('keeps balances in participant insertion order', () => {
    const [ana, luis] = seed();

    expect(selectBalances(state()).map((balance) => balance.participantId)).toEqual([
      ana,
      luis,
    ]);
  });

  it('never writes settlement values to storage', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    selectBalances(state());
    selectTransfers(state());

    const raw = localStorage.getItem(STORAGE_KEY)!;

    expect(raw).not.toContain('netCents');
    expect(raw).not.toContain('consumedCents');
    expect(raw).not.toContain('paidCents');
    expect(raw).not.toContain('fromId');

    const stored = JSON.parse(raw);
    expect(Object.keys(stored.state)).toEqual(['eventName', 'participants', 'expenses']);
  });

  it('recomputes the same result after a reload', async () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    const before = selectTransfers(state());

    const stored = localStorage.getItem(STORAGE_KEY)!;
    resetAppStore();
    localStorage.setItem(STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();

    expect(selectTransfers(state())).toEqual(before);
    expect(netFor(ana)).toBe(5000);
    expect(netFor(luis)).toBe(-5000);
  });
});

describe('tip persistence', () => {
  /** A literal version 2 payload, written by hand so it cannot drift. */
  const V2_PAYLOAD = {
    version: 2,
    state: {
      eventName: 'Trip to Oaxaca',
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
        },
      ],
    },
  };

  it('migrates version 2 expenses forward with no tip', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(V2_PAYLOAD));

    await useAppStore.persist.rehydrate();

    expect(state().eventName).toBe('Trip to Oaxaca');
    expect(state().expenses).toHaveLength(1);
    expect(state().expenses[0]!.tip).toBeNull();
    expect(selectExpensesTotal(state())).toBe(10000);
  });

  it('still discards an unknown version', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...V2_PAYLOAD, version: 99 }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().expenses).toEqual([]);
    expect(state().eventName).toBe(DEFAULT_EVENT_NAME);
  });

  it('discards a malformed tip rather than loading an inconsistent expense', async () => {
    const withBadTip = structuredClone(V2_PAYLOAD) as typeof V2_PAYLOAD & {
      version: number;
      state: { expenses: Array<Record<string, unknown>> };
    };

    withBadTip.version = 3;
    withBadTip.state.expenses[0]!.tip = { kind: 'fixed', amountCents: -500 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withBadTip));

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().expenses).toEqual([]);
  });

  it('discards a percent tip with a non integer percentage', async () => {
    const withBadTip = structuredClone(V2_PAYLOAD) as typeof V2_PAYLOAD & {
      version: number;
      state: { expenses: Array<Record<string, unknown>> };
    };

    withBadTip.version = 3;
    withBadTip.state.expenses[0]!.tip = {
      kind: 'percent',
      percent: 12.5,
      amountCents: 1250,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withBadTip));

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().expenses).toEqual([]);
  });

  it('round trips a tipped expense through storage', async () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [anaP, luisP] = state().participants;
    const ana = anaP!.id;
    const luis = luisP!.id;

    state().addExpense({
      concept: 'Dinner',
      amount: '250.00',
      payerId: ana,
      splitMode: 'equal',
      beneficiaryIds: [ana, luis],
      customAmounts: {},
      tipMode: 'percent',
      tipValue: '10',
    });

    const stored = localStorage.getItem(STORAGE_KEY)!;

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, stored);
    await useAppStore.persist.rehydrate();

    expect(state().expenses[0]!.tip).toEqual({
      kind: 'percent',
      percent: 10,
      amountCents: 2500,
    });
    expect(selectExpensesTotal(state())).toBe(27500);
  });
});
