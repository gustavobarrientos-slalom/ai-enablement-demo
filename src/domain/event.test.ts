import { describe, expect, it } from 'vitest';
import {
  createEmptyEventsState,
  createEvent,
  eventParticipantCount,
  eventTotalCents,
  filterEvents,
  findEvent,
  isEventEditable,
  migrateLegacyGroupState,
  parseEventsState,
  renameEvent,
  setEventStatus,
  sortEventsByUpdatedAt,
  touchEvent,
} from './event';
import { DEFAULT_EVENT_NAME } from './group';
import type { SplitEvent } from './types';

const T1 = '2026-01-01T00:00:00.000Z';
const T2 = '2026-01-02T00:00:00.000Z';
const T3 = '2026-01-03T00:00:00.000Z';

function unwrap(event: ReturnType<typeof createEvent>): SplitEvent {
  if (!event.ok) {
    throw new Error(`expected a valid event, got ${event.error}`);
  }

  return event.value;
}

function firstEventOf(state: { events: SplitEvent[] }): SplitEvent {
  const [event] = state.events;

  if (!event) {
    throw new Error('expected at least one event');
  }

  return event;
}

function makeEvent(overrides: Partial<SplitEvent> = {}): SplitEvent {
  return { ...unwrap(createEvent('e1', 'Trip', T1)), ...overrides };
}

describe('createEvent', () => {
  it('uses the default name when none is provided', () => {
    const event = unwrap(createEvent('e1', undefined, T1));

    expect(event.name).toBe(DEFAULT_EVENT_NAME);
    expect(DEFAULT_EVENT_NAME).toBe('New event');
  });

  it('trims a provided name', () => {
    expect(unwrap(createEvent('e1', '  Trip to Oaxaca  ', T1)).name).toBe(
      'Trip to Oaxaca',
    );
  });

  it('rejects an explicitly blank name', () => {
    const result = createEvent('e1', '   ', T1);

    expect(result).toEqual({ ok: false, error: 'EMPTY_EVENT_NAME' });
  });

  it('rejects a name longer than 60 characters after trimming', () => {
    const result = createEvent('e1', `  ${'a'.repeat(61)}  `, T1);

    expect(result).toEqual({ ok: false, error: 'EVENT_NAME_TOO_LONG' });
  });

  it('accepts a name of exactly 60 characters', () => {
    expect(unwrap(createEvent('e1', 'a'.repeat(60), T1)).name).toHaveLength(60);
  });

  it('sets both timestamps to the creation time and starts open and empty', () => {
    const event = unwrap(createEvent('e1', 'Trip', T1));

    expect(event.createdAt).toBe(T1);
    expect(event.updatedAt).toBe(T1);
    expect(event.status).toBe('open');
    expect(event.participants).toEqual([]);
    expect(event.expenses).toEqual([]);
  });
});

describe('renameEvent', () => {
  it('renames an open event and advances updatedAt only', () => {
    const renamed = renameEvent(makeEvent(), '  Weekend trip  ', T2);

    expect(renamed.ok && renamed.value.name).toBe('Weekend trip');
    expect(renamed.ok && renamed.value.updatedAt).toBe(T2);
    expect(renamed.ok && renamed.value.createdAt).toBe(T1);
  });

  it('keeps the previous name when the new one is invalid', () => {
    const event = makeEvent();

    expect(renameEvent(event, '   ', T2)).toEqual({
      ok: false,
      error: 'EMPTY_EVENT_NAME',
    });
    expect(renameEvent(event, 'a'.repeat(61), T2)).toEqual({
      ok: false,
      error: 'EVENT_NAME_TOO_LONG',
    });
    expect(event.name).toBe('Trip');
  });

  it('refuses to rename an archived event', () => {
    const archived = makeEvent({ status: 'archived' });

    expect(renameEvent(archived, 'New name', T2)).toEqual({
      ok: false,
      error: 'EVENT_ARCHIVED',
    });
    expect(archived.name).toBe('Trip');
  });

  it('does not advance updatedAt when the name is unchanged', () => {
    const renamed = renameEvent(makeEvent(), 'Trip', T2);

    expect(renamed.ok && renamed.value.updatedAt).toBe(T1);
  });
});

describe('setEventStatus', () => {
  it('archives and unarchives, advancing updatedAt', () => {
    const archived = setEventStatus(makeEvent(), 'archived', T2);

    expect(archived.status).toBe('archived');
    expect(archived.updatedAt).toBe(T2);

    const reopened = setEventStatus(archived, 'open', T3);

    expect(reopened.status).toBe('open');
    expect(reopened.updatedAt).toBe(T3);
    expect(isEventEditable(reopened)).toBe(true);
  });

  it('leaves timestamps untouched when the status already matches', () => {
    expect(setEventStatus(makeEvent(), 'open', T2).updatedAt).toBe(T1);
  });

  it('marks archived events as not editable', () => {
    expect(isEventEditable(makeEvent({ status: 'archived' }))).toBe(false);
  });
});

describe('touchEvent', () => {
  it('advances only updatedAt', () => {
    const touched = touchEvent(makeEvent(), T2);

    expect(touched.updatedAt).toBe(T2);
    expect(touched.createdAt).toBe(T1);
  });
});

describe('sortEventsByUpdatedAt', () => {
  it('orders newest first', () => {
    const older = makeEvent({ id: 'a', updatedAt: T1 });
    const newer = makeEvent({ id: 'b', updatedAt: T3 });

    expect(sortEventsByUpdatedAt([older, newer]).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('keeps stored order for equal timestamps', () => {
    const first = makeEvent({ id: 'a', updatedAt: T2 });
    const second = makeEvent({ id: 'b', updatedAt: T2 });

    expect(sortEventsByUpdatedAt([first, second]).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input', () => {
    const events = [makeEvent({ id: 'a', updatedAt: T1 }), makeEvent({ id: 'b', updatedAt: T3 })];

    sortEventsByUpdatedAt(events);

    expect(events.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('filterEvents', () => {
  const open = makeEvent({ id: 'a' });
  const archived = makeEvent({ id: 'b', status: 'archived' });

  it('filters by status without changing the events', () => {
    expect(filterEvents([open, archived], 'all').map((e) => e.id)).toEqual(['a', 'b']);
    expect(filterEvents([open, archived], 'open').map((e) => e.id)).toEqual(['a']);
    expect(filterEvents([open, archived], 'archived').map((e) => e.id)).toEqual(['b']);
  });
});

describe('findEvent', () => {
  it('finds by id and returns null for a missing or null id', () => {
    const events = [makeEvent({ id: 'a' })];

    expect(findEvent(events, 'a')?.id).toBe('a');
    expect(findEvent(events, 'missing')).toBeNull();
    expect(findEvent(events, null)).toBeNull();
  });
});

describe('event derived values', () => {
  it('counts participants and totals expenses in cents', () => {
    const event = makeEvent({
      participants: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Luis' },
      ],
      expenses: [
        {
          id: 'x1',
          concept: 'Dinner',
          amountCents: 10000,
          payerId: 'p1',
          splitMode: 'equal',
          shares: [
            { participantId: 'p1', amountCents: 5000 },
            { participantId: 'p2', amountCents: 5000 },
          ],
          tip: null,
          category: 'other',
        },
      ],
    });

    expect(eventParticipantCount(event)).toBe(2);
    expect(eventTotalCents(event)).toBe(10000);
  });

  it('includes tips in the event total', () => {
    const event = makeEvent({
      participants: [
        { id: 'p1', name: 'Ana' },
        { id: 'p2', name: 'Luis' },
      ],
      expenses: [
        {
          id: 'x1',
          concept: 'Dinner',
          amountCents: 10000,
          payerId: 'p1',
          splitMode: 'equal',
          shares: [
            { participantId: 'p1', amountCents: 5000 },
            { participantId: 'p2', amountCents: 5000 },
          ],
          tip: { kind: 'percent', percent: 10, amountCents: 1000 },
          category: 'other',
        },
      ],
    });

    expect(eventTotalCents(event)).toBe(11000);
  });
});

describe('parseEventsState', () => {
  function persisted(event: SplitEvent) {
    return {
      events: [
        {
          id: event.id,
          name: event.name,
          status: event.status,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          participants: event.participants,
          expenses: event.expenses,
        },
      ],
      lastActiveEventId: event.id,
    };
  }

  it('restores a valid collection', () => {
    const parsed = parseEventsState(persisted(makeEvent()));

    expect(parsed?.events).toHaveLength(1);
    expect(parsed?.lastActiveEventId).toBe('e1');
  });

  it('accepts an empty collection', () => {
    expect(parseEventsState({ events: [], lastActiveEventId: null })).toEqual({
      events: [],
      lastActiveEventId: null,
    });
  });

  it('clears an orphan last active id instead of discarding the events', () => {
    const payload = { ...persisted(makeEvent()), lastActiveEventId: 'missing' };
    const parsed = parseEventsState(payload);

    expect(parsed?.events).toHaveLength(1);
    expect(parsed?.lastActiveEventId).toBeNull();
  });

  it('rejects duplicate event ids', () => {
    const payload = persisted(makeEvent());

    expect(parseEventsState({ ...payload, events: [payload.events[0], payload.events[0]] })).toBeNull();
  });

  it('rejects an unknown status', () => {
    const payload = persisted(makeEvent());

    expect(
      parseEventsState({
        ...payload,
        events: [{ ...payload.events[0], status: 'deleted' }],
      }),
    ).toBeNull();
  });

  it('rejects malformed timestamps', () => {
    const payload = persisted(makeEvent());

    expect(
      parseEventsState({
        ...payload,
        events: [{ ...payload.events[0], updatedAt: 'not-a-date' }],
      }),
    ).toBeNull();
  });

  it('rejects an invalid event name', () => {
    const payload = persisted(makeEvent());

    expect(
      parseEventsState({ ...payload, events: [{ ...payload.events[0], name: '   ' }] }),
    ).toBeNull();
  });

  it('rejects expenses referencing participants outside their own event', () => {
    const payload = persisted(
      makeEvent({
        participants: [{ id: 'p1', name: 'Ana' }],
        expenses: [
          {
            id: 'x1',
            concept: 'Dinner',
            amountCents: 1000,
            payerId: 'ghost',
            splitMode: 'equal',
            shares: [{ participantId: 'p1', amountCents: 1000 }],
            tip: null,
            category: 'other',
          },
        ],
      }),
    );

    expect(parseEventsState(payload)).toBeNull();
  });

  it('rejects non-object and non-array shapes', () => {
    expect(parseEventsState(null)).toBeNull();
    expect(parseEventsState('nope')).toBeNull();
    expect(parseEventsState({ events: 'nope' })).toBeNull();
    expect(parseEventsState({ events: [], lastActiveEventId: 7 })).toBeNull();
  });

  it('normalizes an expense saved before tips existed', () => {
    const payload = persisted(
      makeEvent({
        participants: [{ id: 'p1', name: 'Ana' }],
        expenses: [],
      }),
    );

    const target = payload.events[0] as { expenses: unknown };

    target.expenses = [
      {
        id: 'x1',
        concept: 'Dinner',
        amountCents: 1000,
        payerId: 'p1',
        splitMode: 'equal',
        shares: [{ participantId: 'p1', amountCents: 1000 }],
      },
    ] as never;

    expect(parseEventsState(payload)?.events[0]?.expenses[0]?.tip ?? null).toBeNull();
  });
});

describe('migrateLegacyGroupState', () => {
  const legacy = {
    eventName: 'Trip to Oaxaca',
    participants: [
      { id: 'p1', name: 'Ana' },
      { id: 'p2', name: 'Luis' },
    ],
    expenses: [
      {
        id: 'x1',
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
  };

  it('wraps a nonempty legacy group into the first active event', () => {
    const state = migrateLegacyGroupState(legacy, 'e1', T1);

    expect(state.events).toHaveLength(1);
    expect(state.lastActiveEventId).toBe('e1');

    const event = firstEventOf(state);

    expect(event.name).toBe('Trip to Oaxaca');
    expect(event.status).toBe('open');
    expect(event.createdAt).toBe(T1);
    expect(event.updatedAt).toBe(T1);
    expect(event.participants.map((p) => p.name)).toEqual(['Ana', 'Luis']);
    expect(event.expenses[0]?.shares).toHaveLength(2);
    expect(eventTotalCents(event)).toBe(10000);
  });

  it('keeps a legacy group that has participants but no expenses', () => {
    const state = migrateLegacyGroupState({ ...legacy, expenses: [] }, 'e1', T1);

    expect(state.events).toHaveLength(1);
  });

  it('keeps a legacy group that has expenses but no listed participants is invalid', () => {
    const state = migrateLegacyGroupState({ ...legacy, participants: [] }, 'e1', T1);

    expect(state.events).toEqual([]);
  });

  it('discards an untouched legacy group even with a custom name', () => {
    const state = migrateLegacyGroupState(
      { eventName: 'Custom name', participants: [], expenses: [] },
      'e1',
      T1,
    );

    expect(state).toEqual(createEmptyEventsState());
  });

  it('discards malformed legacy data rather than inventing an event', () => {
    expect(migrateLegacyGroupState(null, 'e1', T1).events).toEqual([]);
    expect(migrateLegacyGroupState({ eventName: '' }, 'e1', T1).events).toEqual([]);
    expect(migrateLegacyGroupState('nope', 'e1', T1).events).toEqual([]);
  });

  it('preserves a legacy expense that predates tips', () => {
    const state = migrateLegacyGroupState(
      {
        ...legacy,
        expenses: [
          {
            id: 'x1',
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
      'e1',
      T1,
    );

    expect(firstEventOf(state).expenses[0]?.tip).toBeNull();
    expect(eventTotalCents(firstEventOf(state))).toBe(10000);
  });
});
