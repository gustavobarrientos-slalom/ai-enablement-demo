import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LEGACY_STORAGE_VERSION,
  STORAGE_KEY,
  STORAGE_VERSION,
  resetAppStore,
  resetStoreClock,
  selectActiveEvent,
  selectBalances,
  selectCanRemoveParticipant,
  selectEventName,
  selectExpenses,
  selectExpensesTotal,
  selectIsGroupValid,
  selectPaidTransfers,
  selectParticipants,
  selectTransfers,
  selectVisibleEvents,
  setStoreClock,
  useAppStore,
} from './useAppStore';
import { DEFAULT_EVENT_NAME } from '../domain/group';
import { fixedClock } from '../lib/clock';
import { makeExpense, seedActiveEvent, setActiveEventData } from '../test/factories';
import type { SplitEvent } from '../domain/types';

function state() {
  return useAppStore.getState();
}

function participantNames(): string[] {
  return selectParticipants(state()).map((participant) => participant.name);
}

function activeEvent(): SplitEvent {
  const event = selectActiveEvent(state());

  if (!event) {
    throw new Error('expected an active event');
  }

  return event;
}

function eventById(id: string): SplitEvent {
  const event = state().events.find((candidate) => candidate.id === id);

  if (!event) {
    throw new Error(`expected event ${id}`);
  }

  return event;
}

/** Snapshots storage before resetting, because resetting also writes to it. */
async function reload(): Promise<void> {
  const stored = localStorage.getItem(STORAGE_KEY)!;
  resetAppStore();
  localStorage.setItem(STORAGE_KEY, stored);
  await useAppStore.persist.rehydrate();
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

afterEach(() => {
  resetStoreClock();
});

describe('initial state', () => {
  it('starts with no events and no active event', () => {
    expect(state().events).toEqual([]);
    expect(state().activeEventId).toBeNull();
    expect(state().lastActiveEventId).toBeNull();
    expect(selectActiveEvent(state())).toBeNull();
  });

  it('exposes empty group data while no event is open', () => {
    expect(selectParticipants(state())).toEqual([]);
    expect(selectExpenses(state())).toEqual([]);
    expect(selectEventName(state())).toBeNull();
    expect(selectExpensesTotal(state())).toBe(0);
  });
});

describe('createEvent', () => {
  it('uses the default name when none is given and opens the event', () => {
    const id = state().createEvent();

    expect(id).not.toBeNull();
    expect(activeEvent().name).toBe(DEFAULT_EVENT_NAME);
    expect(state().activeEventId).toBe(id);
    expect(state().lastActiveEventId).toBe(id);
    expect(activeEvent().status).toBe('open');
  });

  it('trims a supplied name', () => {
    state().createEvent('  Trip to Oaxaca  ');

    expect(activeEvent().name).toBe('Trip to Oaxaca');
  });

  it('rejects an explicitly blank or overly long name', () => {
    expect(state().createEvent('   ')).toBeNull();
    expect(state().lastError).toBe('EMPTY_EVENT_NAME');

    expect(state().createEvent('a'.repeat(61))).toBeNull();
    expect(state().lastError).toBe('EVENT_NAME_TOO_LONG');

    expect(state().events).toEqual([]);
  });

  it('sets both timestamps from one clock reading', () => {
    setStoreClock(fixedClock('2026-01-01T00:00:00.000Z'));
    state().createEvent('Trip');

    expect(activeEvent().createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(activeEvent().updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('keeps each created event separate', () => {
    const first = state().createEvent('First');
    const second = state().createEvent('Second');

    expect(state().events).toHaveLength(2);
    expect(state().activeEventId).toBe(second);
    expect(eventById(first!).name).toBe('First');
  });
});

describe('opening and closing events', () => {
  it('opens an existing event and records it as last active', () => {
    const first = seedActiveEvent('First');
    seedActiveEvent('Second');

    expect(state().openEvent(first)).toBe(true);
    expect(state().activeEventId).toBe(first);
    expect(state().lastActiveEventId).toBe(first);
  });

  it('refuses to open an unknown event', () => {
    expect(state().openEvent('missing')).toBe(false);
    expect(state().lastError).toBe('EVENT_NOT_FOUND');
    expect(state().activeEventId).toBeNull();
  });

  it('returns home without deleting or changing the event', () => {
    const id = seedActiveEvent('Trip');
    state().addParticipant('Ana');

    state().closeEvent();

    expect(state().activeEventId).toBeNull();
    expect(state().events).toHaveLength(1);
    expect(eventById(id).participants.map((p) => p.name)).toEqual(['Ana']);
  });

  it('keeps the last active identity after returning home so a reload reopens it', () => {
    const id = seedActiveEvent('Trip');
    state().closeEvent();

    expect(state().lastActiveEventId).toBe(id);
  });
});

describe('renameEvent', () => {
  it('renames an open event and advances only its updatedAt', () => {
    setStoreClock(fixedClock('2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'));
    const id = seedActiveEvent('Trip');

    expect(state().renameEvent(id, '  Weekend trip  ')).toBe(true);
    expect(eventById(id).name).toBe('Weekend trip');
    expect(eventById(id).createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(eventById(id).updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('keeps the previous name when the new one is invalid', () => {
    const id = seedActiveEvent('Trip');

    expect(state().renameEvent(id, '   ')).toBe(false);
    expect(state().lastError).toBe('EMPTY_EVENT_NAME');
    expect(state().renameEvent(id, 'a'.repeat(61))).toBe(false);
    expect(state().lastError).toBe('EVENT_NAME_TOO_LONG');
    expect(eventById(id).name).toBe('Trip');
  });

  it('refuses to rename an unknown event', () => {
    expect(state().renameEvent('missing', 'Nope')).toBe(false);
    expect(state().lastError).toBe('EVENT_NOT_FOUND');
  });
});

describe('archive lifecycle', () => {
  it('archives and unarchives, advancing updatedAt', () => {
    setStoreClock(
      fixedClock(
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
      ),
    );
    const id = seedActiveEvent('Trip');

    expect(state().archiveEvent(id)).toBe(true);
    expect(eventById(id).status).toBe('archived');
    expect(eventById(id).updatedAt).toBe('2026-01-02T00:00:00.000Z');

    expect(state().unarchiveEvent(id)).toBe(true);
    expect(eventById(id).status).toBe('open');
    expect(eventById(id).updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('blocks every group and expense mutation on an archived event', () => {
    const id = seedActiveEvent('Trip');
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [ana, luis] = selectParticipants(state());
    state().addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!.id,
      splitMode: 'equal',
      beneficiaryIds: [ana!.id, luis!.id],
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category: 'other' as const,
    });

    const before = eventById(id);
    state().archiveEvent(id);
    const archived = eventById(id);

    // Direct action calls must be refused, not just hidden in the UI.
    expect(state().addParticipant('Carla')).toBe(false);
    expect(state().lastError).toBe('EVENT_ARCHIVED');
    expect(state().removeParticipant(ana!.id)).toBe(false);
    expect(state().setEventName('Renamed')).toBe(false);
    expect(
      state().addExpense({
        concept: 'Taxi',
        amount: '50.00',
        payerId: ana!.id,
        splitMode: 'equal',
        beneficiaryIds: [ana!.id],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other' as const,
      }),
    ).toBe(false);
    expect(state().removeExpense(before.expenses[0]!.id)).toBe(false);

    const after = eventById(id);

    expect(after.name).toBe(before.name);
    expect(after.participants).toEqual(before.participants);
    expect(after.expenses).toEqual(before.expenses);
    expect(after.updatedAt).toBe(archived.updatedAt);
  });

  it('refuses to rename an archived event', () => {
    const id = seedActiveEvent('Trip');
    state().archiveEvent(id);

    expect(state().renameEvent(id, 'Renamed')).toBe(false);
    expect(state().lastError).toBe('EVENT_ARCHIVED');
    expect(eventById(id).name).toBe('Trip');
  });

  it('keeps an archived event readable', () => {
    const id = seedActiveEvent('Trip');
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().archiveEvent(id);

    expect(participantNames()).toEqual(['Ana', 'Luis']);
    expect(selectIsGroupValid(state())).toBe(true);
  });
});

describe('deleteEvent', () => {
  it('removes the event and its data, leaving others untouched', () => {
    const first = seedActiveEvent('First');
    state().addParticipant('Ana');
    const second = seedActiveEvent('Second');
    state().addParticipant('Luis');

    state().deleteEvent(first);

    expect(state().events).toHaveLength(1);
    expect(eventById(second).participants.map((p) => p.name)).toEqual(['Luis']);
  });

  it('clears the selection when the deleted event was open', () => {
    const id = seedActiveEvent('Trip');

    state().deleteEvent(id);

    expect(state().activeEventId).toBeNull();
    expect(state().lastActiveEventId).toBeNull();
  });

  it('deletes an archived event too', () => {
    const id = seedActiveEvent('Trip');
    state().archiveEvent(id);

    state().deleteEvent(id);

    expect(state().events).toEqual([]);
  });
});

describe('event list ordering and filtering', () => {
  it('lists events by updatedAt descending', () => {
    setStoreClock(
      fixedClock(
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
      ),
    );
    const first = seedActiveEvent('First');
    const second = seedActiveEvent('Second');
    state().renameEvent(first, 'First edited');

    expect(selectVisibleEvents(state()).map((event) => event.id)).toEqual([
      first,
      second,
    ]);
  });

  it('filters by status without changing the events', () => {
    const open = seedActiveEvent('Open one');
    const archived = seedActiveEvent('Archived one');
    state().archiveEvent(archived);

    state().setEventFilter('open');
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual([open]);

    state().setEventFilter('archived');
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual([archived]);

    state().setEventFilter('all');
    expect(selectVisibleEvents(state())).toHaveLength(2);
    expect(state().events).toHaveLength(2);
  });
});

describe('group actions require an active event', () => {
  it('refuses mutations while the Events home is showing', () => {
    expect(state().addParticipant('Ana')).toBe(false);
    expect(state().lastError).toBe('EVENT_NOT_FOUND');
    expect(state().setEventName('Trip')).toBe(false);
    expect(
      state().addExpense({
        concept: 'Dinner',
        amount: '10.00',
        payerId: 'p1',
        splitMode: 'equal',
        beneficiaryIds: ['p1'],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other' as const,
      }),
    ).toBe(false);
    expect(state().events).toEqual([]);
  });
});

describe('setEventName', () => {
  beforeEach(() => {
    seedActiveEvent();
  });

  it('stores a valid trimmed name', () => {
    expect(state().setEventName('  Trip to Oaxaca  ')).toBe(true);
    expect(selectEventName(state())).toBe('Trip to Oaxaca');
    expect(state().lastError).toBeNull();
  });

  it('rejects an empty name and keeps the previous one', () => {
    state().setEventName('Trip to Oaxaca');

    expect(state().setEventName('   ')).toBe(false);
    expect(selectEventName(state())).toBe('Trip to Oaxaca');
    expect(state().lastError).toBe('EMPTY_EVENT_NAME');
  });

  it('rejects a name longer than 60 characters', () => {
    expect(state().setEventName('a'.repeat(61))).toBe(false);
    expect(state().lastError).toBe('EVENT_NAME_TOO_LONG');
  });

  it('renames only the active event', () => {
    const other = seedActiveEvent('Other');
    const first = state().events[0]!.id;
    state().openEvent(first);
    state().setEventName('Renamed');

    expect(eventById(other).name).toBe('Other');
  });
});

describe('addParticipant', () => {
  beforeEach(() => {
    seedActiveEvent();
  });

  it('adds participants in insertion order with unique ids', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Sofia');

    expect(participantNames()).toEqual(['Ana', 'Luis', 'Sofia']);
    expect(new Set(selectParticipants(state()).map((p) => p.id)).size).toBe(3);
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

    expect(selectParticipants(state())).toEqual([]);
  });

  it('clears the error after a successful action', () => {
    state().addParticipant('');
    expect(state().lastError).toBe('EMPTY_NAME');

    state().addParticipant('Ana');
    expect(state().lastError).toBeNull();
  });
});

describe('removeParticipant', () => {
  beforeEach(() => {
    seedActiveEvent();
  });

  it('removes a participant without expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana] = selectParticipants(state());

    expect(state().removeParticipant(ana!.id)).toBe(true);
    expect(participantNames()).toEqual(['Luis']);
  });

  it('blocks removing someone with associated expenses', () => {
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana, luis] = selectParticipants(state());
    setActiveEventData({
      expenses: [makeExpense({ payerId: ana!.id, beneficiaryIds: [luis!.id] })],
    });

    expect(state().removeParticipant(ana!.id)).toBe(false);
    expect(state().removeParticipant(luis!.id)).toBe(false);
    expect(participantNames()).toEqual(['Ana', 'Luis']);
    expect(state().lastError).toBe('PARTICIPANT_HAS_EXPENSES');
  });
});

describe('derived selectors', () => {
  beforeEach(() => {
    seedActiveEvent();
  });

  it('computes group validity without storing it', () => {
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Ana');
    expect(selectIsGroupValid(state())).toBe(false);

    state().addParticipant('Luis');
    expect(selectIsGroupValid(state())).toBe(true);

    const [ana] = selectParticipants(state());
    state().removeParticipant(ana!.id);
    expect(selectIsGroupValid(state())).toBe(false);

    expect(Object.keys(state())).not.toContain('isGroupValid');
  });

  it('reports whether a participant can be removed', () => {
    state().addParticipant('Ana');
    const [ana] = selectParticipants(state());
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(true);

    setActiveEventData({ expenses: [makeExpense({ payerId: ana!.id })] });
    expect(selectCanRemoveParticipant(state())(ana!.id)).toBe(false);
  });
});

describe('timestamps and isolation', () => {
  it('advances only the edited event updatedAt', () => {
    setStoreClock(
      fixedClock(
        '2026-01-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        '2026-01-03T00:00:00.000Z',
      ),
    );
    const first = seedActiveEvent('First');
    const second = seedActiveEvent('Second');

    const secondBefore = eventById(second);

    state().openEvent(first);
    state().addParticipant('Ana');

    expect(eventById(first).updatedAt).toBe('2026-01-03T00:00:00.000Z');
    expect(eventById(first).createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(eventById(second).updatedAt).toBe(secondBefore.updatedAt);
    expect(eventById(second).createdAt).toBe(secondBefore.createdAt);
  });

  it('leaves timestamps untouched when an action is rejected', () => {
    setStoreClock(fixedClock('2026-01-01T00:00:00.000Z', '2026-01-09T00:00:00.000Z'));
    const id = seedActiveEvent('Trip');

    state().addParticipant('   ');

    expect(eventById(id).updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never mixes participants, expenses, totals or settlement between events', () => {
    const a = seedActiveEvent('A');
    state().addParticipant('Ana');
    state().addParticipant('Beto');
    const [ana, beto] = selectParticipants(state());
    state().addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!.id,
      splitMode: 'equal',
      beneficiaryIds: [ana!.id, beto!.id],
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category: 'other' as const,
    });

    const b = seedActiveEvent('B');
    state().addParticipant('Luis');
    state().addParticipant('Carla');
    const [luis, carla] = selectParticipants(state());
    state().addExpense({
      concept: 'Uber',
      amount: '25.00',
      payerId: luis!.id,
      splitMode: 'equal',
      beneficiaryIds: [luis!.id, carla!.id],
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category: 'other' as const,
    });

    state().openEvent(a);
    expect(participantNames()).toEqual(['Ana', 'Beto']);
    expect(selectExpenses(state()).map((e) => e.concept)).toEqual(['Dinner']);
    expect(selectExpensesTotal(state())).toBe(10000);
    expect(selectBalances(state()).map((balance) => balance.netCents)).toEqual([
      5000, -5000,
    ]);

    state().openEvent(b);
    expect(participantNames()).toEqual(['Luis', 'Carla']);
    expect(selectExpenses(state()).map((e) => e.concept)).toEqual(['Uber']);
    expect(selectExpensesTotal(state())).toBe(2500);
    expect(selectBalances(state()).map((balance) => balance.netCents)).toEqual([
      1250, -1250,
    ]);
  });
});

describe('expenses', () => {
  function seedParticipants(): [string, string, string] {
    seedActiveEvent();
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    state().addParticipant('Carla');

    const [ana, luis, carla] = selectParticipants(state());

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
      category: 'other' as const,
    };
  }

  it('adds an expense with shares summing to the amount', () => {
    const [ana, luis, carla] = seedParticipants();

    expect(state().addExpense(equalDraft(ana, [ana, luis, carla]))).toBe(true);
    expect(selectExpenses(state())).toHaveLength(1);

    const expense = selectExpenses(state())[0]!;
    expect(expense.amountCents).toBe(25000);
    expect(expense.shares.map((share) => share.amountCents)).toEqual([8334, 8333, 8333]);
    expect(state().lastError).toBeNull();
  });

  it('rejects an invalid expense and leaves state unchanged', () => {
    const [ana, luis] = seedParticipants();

    expect(state().addExpense(equalDraft(ana, [ana, luis], '0'))).toBe(false);
    expect(selectExpenses(state())).toEqual([]);
    expect(state().lastError).toBe('AMOUNT_NOT_POSITIVE');
  });

  it('updates an existing expense in place', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    const id = selectExpenses(state())[0]!.id;

    expect(
      state().updateExpense(id, {
        ...equalDraft(luis, [ana, luis], '50.00'),
        concept: 'Taxi',
      }),
    ).toBe(true);

    expect(selectExpenses(state())).toHaveLength(1);

    const expense = selectExpenses(state())[0]!;
    expect(expense.id).toBe(id);
    expect(expense.concept).toBe('Taxi');
    expect(expense.amountCents).toBe(5000);
    expect(expense.payerId).toBe(luis);
  });

  it('leaves the expense untouched when an edit is invalid', () => {
    const [ana] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana], '100.00'));

    const before = selectExpenses(state())[0]!;

    expect(state().updateExpense(before.id, equalDraft(ana, [], '100.00'))).toBe(false);
    expect(selectExpenses(state())[0]).toEqual(before);
    expect(state().lastError).toBe('NO_BENEFICIARIES');
  });

  it('ignores updates for an unknown expense id', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));

    expect(state().updateExpense('missing', equalDraft(ana, [ana, luis]))).toBe(false);
    expect(selectExpenses(state())).toHaveLength(1);
  });

  it('removes an expense and updates the total', () => {
    const [ana, luis] = seedParticipants();
    state().addExpense(equalDraft(ana, [ana, luis], '100.00'));
    state().addExpense(equalDraft(luis, [ana, luis], '40.00'));

    expect(selectExpensesTotal(state())).toBe(14000);

    const id = selectExpenses(state())[0]!.id;
    state().removeExpense(id);

    expect(selectExpenses(state())).toHaveLength(1);
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

describe('transfer payment checklist', () => {
  function seedTransfer() {
    seedActiveEvent('Payment test');
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    const [ana, luis] = selectParticipants(state());

    state().addExpense({
      concept: 'Dinner',
      amount: '100.00',
      payerId: ana!.id,
      splitMode: 'equal',
      beneficiaryIds: [ana!.id, luis!.id],
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category: 'other',
    });

    const plan = selectTransfers(state());
    if (!plan.ok || plan.value.length !== 1) {
      throw new Error('expected a single transfer');
    }

    return { ana: ana!, luis: luis!, transfer: plan.value[0]! };
  }

  it('toggles a current transfer without changing balances, plan, status, or timestamps', () => {
    const { transfer } = seedTransfer();
    const beforeBalances = selectBalances(state());
    const beforePlan = selectTransfers(state());
    const event = activeEvent();

    expect(state().toggleTransferPaid(transfer)).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([transfer]);
    expect(selectBalances(state())).toEqual(beforeBalances);
    expect(selectTransfers(state())).toEqual(beforePlan);
    expect(activeEvent().status).toBe('open');
    expect(activeEvent().updatedAt).toBe(event.updatedAt);

    expect(state().toggleTransferPaid(transfer)).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([]);
  });

  it('rejects invalid or absent transfers without changing checklist state', () => {
    const { transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);
    const before = activeEvent();

    expect(
      state().toggleTransferPaid({ ...transfer, amountCents: 0 }),
    ).toBe(false);
    expect(
      state().toggleTransferPaid({ ...transfer, amountCents: 6000 }),
    ).toBe(false);
    expect(activeEvent()).toEqual(before);
  });

  it('keeps marks on failed and no-op expense actions', () => {
    const { transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);
    const expense = selectExpenses(state())[0]!;

    expect(
      state().updateExpense(expense.id, {
        concept: '',
        amount: '100.00',
        payerId: expense.payerId,
        splitMode: 'equal',
        beneficiaryIds: expense.shares.map((share) => share.participantId),
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other',
      }),
    ).toBe(false);
    expect(state().removeExpense('missing')).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([transfer]);
  });

  it('does not reconcile stored marks for no-op mutations', () => {
    const { transfer } = seedTransfer();
    const stale = { ...transfer, amountCents: transfer.amountCents + 1 };
    const event = activeEvent();

    useAppStore.setState({
      events: state().events.map((candidate) =>
        candidate.id === event.id
          ? { ...candidate, paidTransfers: [stale] }
          : candidate,
      ),
    });
    const before = activeEvent();

    expect(state().removeExpense('missing')).toBe(true);
    expect(state().removeParticipant('missing')).toBe(true);
    expect(state().setEventName(before.name)).toBe(true);
    expect(activeEvent()).toEqual(before);
    expect(activeEvent().paidTransfers).toEqual([stale]);
  });

  it('retains unchanged tuples and discards changed and later reappearing tuples', () => {
    const { ana, luis, transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);
    const expense = selectExpenses(state())[0]!;

    expect(
      state().updateExpense(expense.id, {
        concept: 'Renamed dinner',
        amount: '100.00',
        payerId: ana.id,
        splitMode: 'equal',
        beneficiaryIds: [ana.id, luis.id],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other',
      }),
    ).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([transfer]);
    expect(state().addParticipant('Carla')).toBe(true);
    const carla = selectParticipants(state()).find(
      (participant) => participant.name === 'Carla',
    )!;
    expect(state().removeParticipant(carla.id)).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([transfer]);

    expect(
      state().updateExpense(expense.id, {
        concept: 'Renamed dinner',
        amount: '120.00',
        payerId: ana.id,
        splitMode: 'equal',
        beneficiaryIds: [ana.id, luis.id],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other',
      }),
    ).toBe(true);
    const changedPlan = selectTransfers(state());
    expect(changedPlan.ok ? changedPlan.value[0]?.amountCents : null).toBe(6000);
    expect(selectPaidTransfers(state())).toEqual([]);

    state().updateExpense(expense.id, {
      concept: 'Renamed dinner',
      amount: '100.00',
      payerId: ana.id,
      splitMode: 'equal',
      beneficiaryIds: [ana.id, luis.id],
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category: 'other',
    });
    expect(selectPaidTransfers(state())).toEqual([]);
  });

  it('prunes marks when the plan becomes empty', () => {
    const { transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);

    expect(state().removeExpense(selectExpenses(state())[0]!.id)).toBe(true);
    expect(selectPaidTransfers(state())).toEqual([]);
    expect(selectTransfers(state())).toEqual({ ok: true, value: [] });
  });

  it('keeps checklist marks isolated between events', () => {
    const first = seedTransfer();
    const firstEventId = activeEvent().id;
    state().toggleTransferPaid(first.transfer);

    seedActiveEvent('Second event');
    state().addParticipant('Ana');
    state().addParticipant('Luis');
    setActiveEventData({
      participants: [
        { id: first.ana.id, name: 'Ana' },
        { id: first.luis.id, name: 'Luis' },
      ],
      expenses: [
        makeExpense({
          payerId: first.ana.id,
          beneficiaryIds: [first.ana.id, first.luis.id],
          amountCents: 10000,
        }),
      ],
    });

    expect(selectTransfers(state())).toEqual({
      ok: true,
      value: [first.transfer],
    });
    expect(selectPaidTransfers(state())).toEqual([]);
    state().openEvent(firstEventId);
    expect(selectPaidTransfers(state())).toEqual([first.transfer]);
  });

  it('guards archived events in the store while retaining visible marks', () => {
    const { transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);
    const id = activeEvent().id;
    state().archiveEvent(id);
    const archived = activeEvent();

    expect(state().toggleTransferPaid(transfer)).toBe(false);
    expect(state().lastError).toBe('EVENT_ARCHIVED');
    expect(activeEvent().paidTransfers).toEqual([transfer]);
    expect(activeEvent().updatedAt).toBe(archived.updatedAt);
  });

  it('restores valid marks and prunes stale persisted tuples on reload', async () => {
    const { transfer } = seedTransfer();
    state().toggleTransferPaid(transfer);
    await reload();
    expect(selectPaidTransfers(state())).toEqual([transfer]);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.events[0].paidTransfers = [
      { ...transfer, amountCents: transfer.amountCents + 1 },
    ];
    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await useAppStore.persist.rehydrate();

    expect(state().events).toHaveLength(1);
    expect(selectPaidTransfers(state())).toEqual([]);
  });

  it('discards malformed persisted paid tuples without crashing', async () => {
    seedTransfer();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.events[0].paidTransfers = [
      { fromId: 'p1', toId: 'p2', amountCents: 1.5 },
    ];
    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });
});

describe('persistence', () => {
  it('saves the event collection under the versioned key', () => {
    seedActiveEvent('Trip to Oaxaca');
    state().addParticipant('Ana');

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const stored = JSON.parse(raw!);
    expect(stored.version).toBe(STORAGE_VERSION);
    expect(Object.keys(stored.state).sort()).toEqual(['events', 'lastActiveEventId']);
    expect(stored.state.events).toHaveLength(1);
    expect(stored.state.events[0].name).toBe('Trip to Oaxaca');
    expect(stored.state.events[0].participants).toHaveLength(1);
  });

  it('restores events and reopens the last active one', async () => {
    seedActiveEvent('First');
    state().addParticipant('Ana');
    const second = seedActiveEvent('Second');
    state().addParticipant('Luis');

    await reload();

    expect(state().events).toHaveLength(2);
    expect(state().activeEventId).toBe(second);
    expect(selectEventName(state())).toBe('Second');
    expect(participantNames()).toEqual(['Luis']);
  });

  it('keeps each event participants separate across a reload', async () => {
    const first = seedActiveEvent('First');
    state().addParticipant('Ana');
    state().addParticipant('Beto');
    seedActiveEvent('Second');
    state().addParticipant('Luis');

    await reload();

    expect(eventById(first).participants.map((p) => p.name)).toEqual(['Ana', 'Beto']);
    expect(participantNames()).toEqual(['Luis']);
  });

  it('shows the Events home when the last active event no longer exists', async () => {
    seedActiveEvent('First');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.lastActiveEventId = 'missing';

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await useAppStore.persist.rehydrate();

    expect(state().events).toHaveLength(1);
    expect(state().activeEventId).toBeNull();
    expect(selectActiveEvent(state())).toBeNull();
  });

  it('discards corrupted data without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state: { events: 'nope' } }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
    expect(state().activeEventId).toBeNull();
  });

  it('discards invalid JSON without crashing', async () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not json');

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards an unknown version without crashing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 99,
        state: { events: [{ id: 'e1', name: 'Old' }], lastActiveEventId: 'e1' },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards an event with a malformed timestamp', async () => {
    seedActiveEvent('Trip');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.events[0].updatedAt = 'not-a-date';

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();

    expect(state().events).toEqual([]);
  });

  it('discards duplicate event ids', async () => {
    seedActiveEvent('Trip');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.events.push({ ...stored.state.events[0] });

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();

    expect(state().events).toEqual([]);
  });

  it('discards an expense referencing a participant outside its event', async () => {
    seedActiveEvent('Trip');
    state().addParticipant('Ana');
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    stored.state.events[0].expenses = [
      {
        id: 'x1',
        concept: 'Dinner',
        amountCents: 1000,
        payerId: 'ghost',
        splitMode: 'equal',
        shares: [{ participantId: 'ghost', amountCents: 1000 }],
        tip: null,
      },
    ];

    resetAppStore();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();

    expect(state().events).toEqual([]);
  });

  it('restores expenses in order across a reload', async () => {
    seedActiveEvent('Trip');
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [ana, luis] = selectParticipants(state());

    for (const concept of ['First', 'Second', 'Third']) {
      state().addExpense({
        concept,
        amount: '30.00',
        payerId: ana!.id,
        splitMode: 'equal',
        beneficiaryIds: [ana!.id, luis!.id],
        customAmounts: {},
        tipMode: 'none',
        tipValue: '',
        category: 'other' as const,
      });
    }

    await reload();

    expect(selectExpenses(state()).map((expense) => expense.concept)).toEqual([
      'First',
      'Second',
      'Third',
    ]);
    expect(selectExpensesTotal(state())).toBe(9000);
  });

  it('keeps store actions after rehydrating', async () => {
    await useAppStore.persist.rehydrate();
    expect(typeof state().addParticipant).toBe('function');
  });
});

describe('legacy single event migration', () => {
  /** A literal single-group payload, written by hand so it cannot drift. */
  const LEGACY_PAYLOAD = {
    version: LEGACY_STORAGE_VERSION,
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
          tip: { kind: 'percent', percent: 10, amountCents: 1000 },
        },
      ],
    },
  };

  /** A mutable JSON copy, so tests can corrupt or strip individual fields. */
  function cloneLegacyPayload(): {
    version: number;
    state: { expenses: Array<Record<string, unknown>> };
  } {
    return structuredClone(LEGACY_PAYLOAD) as unknown as {
      version: number;
      state: { expenses: Array<Record<string, unknown>> };
    };
  }

  it('migrates a nonempty legacy event into the first active event', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_PAYLOAD));

    await useAppStore.persist.rehydrate();

    expect(state().events).toHaveLength(1);
    expect(selectEventName(state())).toBe('Trip to Oaxaca');
    expect(participantNames()).toEqual(['Ana', 'Luis']);
    expect(selectExpenses(state())).toHaveLength(1);
    expect(activeEvent().status).toBe('open');
    expect(state().activeEventId).toBe(activeEvent().id);
  });

  it('preserves shares, amounts and the tip through migration', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_PAYLOAD));

    await useAppStore.persist.rehydrate();

    const expense = selectExpenses(state())[0]!;

    expect(expense.amountCents).toBe(10000);
    expect(expense.shares.map((share) => share.amountCents)).toEqual([5000, 5000]);
    expect(expense.tip).toEqual({ kind: 'percent', percent: 10, amountCents: 1000 });
    // 100.00 base plus the 10.00 tip.
    expect(selectExpensesTotal(state())).toBe(11000);
  });

  it('migrates a legacy expense that predates tips', async () => {
    const payload = cloneLegacyPayload();

    delete payload.state.expenses[0]!.tip;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    await useAppStore.persist.rehydrate();

    expect(selectExpenses(state())[0]!.tip).toBeNull();
    expect(selectExpensesTotal(state())).toBe(10000);
  });

  it('discards an untouched legacy event and shows an empty home', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: LEGACY_STORAGE_VERSION,
        state: { eventName: DEFAULT_EVENT_NAME, participants: [], expenses: [] },
      }),
    );

    await useAppStore.persist.rehydrate();

    expect(state().events).toEqual([]);
    expect(state().activeEventId).toBeNull();
  });

  it('discards an empty legacy event even with a custom name', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: LEGACY_STORAGE_VERSION,
        state: { eventName: 'Named but unused', participants: [], expenses: [] },
      }),
    );

    await useAppStore.persist.rehydrate();

    expect(state().events).toEqual([]);
  });

  it('discards a malformed legacy payload rather than inventing an event', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: LEGACY_STORAGE_VERSION,
        state: { eventName: 42, participants: 'nope' },
      }),
    );

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards a legacy expense whose shares do not sum to the amount', async () => {
    const payload = cloneLegacyPayload();

    payload.state.expenses[0]!.shares = [{ participantId: 'p1', amountCents: 9999 }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('discards a legacy payload with an invalid tip', async () => {
    const payload = cloneLegacyPayload();

    payload.state.expenses[0]!.tip = { kind: 'fixed', amountCents: -500 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    await expect(useAppStore.persist.rehydrate()).resolves.not.toThrow();
    expect(state().events).toEqual([]);
  });

  it('persists the migrated collection under the new version', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(LEGACY_PAYLOAD));

    await useAppStore.persist.rehydrate();
    state().addParticipant('Carla');

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

    expect(stored.version).toBe(STORAGE_VERSION);
    expect(stored.state.events).toHaveLength(1);
    expect(stored.state.eventName).toBeUndefined();
  });
});

describe('settlement selectors', () => {
  function seed(): [string, string] {
    seedActiveEvent();
    state().addParticipant('Ana');
    state().addParticipant('Luis');

    const [ana, luis] = selectParticipants(state());

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
      category: 'other' as const,
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

    expect(selectTransfers(state())).toEqual({ ok: true, value: [] });
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

    expect(selectTransfers(state())).toEqual({
      ok: true,
      value: [{ fromId: luis, toId: ana, amountCents: 5000 }],
    });
  });

  it('recalculates after editing an expense amount', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    const id = selectExpenses(state())[0]!.id;
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
    state().removeExpense(selectExpenses(state())[0]!.id);

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
    expect(Object.keys(stored.state).sort()).toEqual(['events', 'lastActiveEventId']);
  });

  it('recomputes the same result after a reload', async () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    const before = selectTransfers(state());

    await reload();

    expect(selectTransfers(state())).toEqual(before);
    expect(netFor(ana)).toBe(5000);
    expect(netFor(luis)).toBe(-5000);
  });

  it('settles each event independently', () => {
    const [ana, luis] = seed();
    state().addExpense(dinner(ana, [ana, luis], '100.00'));

    seedActiveEvent('Other');
    state().addParticipant('Carla');
    state().addParticipant('Diana');

    expect(selectTransfers(state())).toEqual({ ok: true, value: [] });

    state().openEvent(eventById(state().events[0]!.id).id);
    expect(selectTransfers(state())).toEqual({
      ok: true,
      value: [{ fromId: luis, toId: ana, amountCents: 5000 }],
    });
  });
});
