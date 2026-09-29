import { DEFAULT_CATEGORY } from './category';
import { computeBalances } from './balance';
import { expensesTotal } from './expense';
import { reconcilePaidTransfers, isValidTransfer } from './paidTransfers';
import { computeTransfers } from './settle';
import {
  DEFAULT_EVENT_NAME,
  normalizeName,
  parseGroupState,
  validateEventName,
} from './group';
import {
  err,
  ok,
  type EventFilter,
  type EventsState,
  type EventStatus,
  type GroupState,
  type Result,
  type SplitEvent,
  type Transfer,
} from './types';

export function createEmptyEventsState(): EventsState {
  return { events: [], lastActiveEventId: null };
}

/**
 * An omitted name takes the default. An explicitly supplied blank name is a
 * validation error, because the user typed something and got it wrong.
 */
export function createEvent(
  id: string,
  rawName: string | undefined,
  now: string,
): Result<SplitEvent> {
  const validation = validateEventName(rawName ?? DEFAULT_EVENT_NAME);

  if (!validation.ok) {
    return err(validation.error);
  }

  return ok({
    id,
    name: validation.value,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    participants: [],
    expenses: [],
    paidTransfers: [],
  });
}

export function isEventEditable(event: SplitEvent): boolean {
  return event.status === 'open';
}

/** Advances `updatedAt` only; callers apply this to successful changes. */
export function touchEvent(event: SplitEvent, now: string): SplitEvent {
  return { ...event, updatedAt: now };
}

export function renameEvent(
  event: SplitEvent,
  raw: string,
  now: string,
): Result<SplitEvent> {
  if (!isEventEditable(event)) {
    return err('EVENT_ARCHIVED');
  }

  const validation = validateEventName(raw);

  if (!validation.ok) {
    return err(validation.error);
  }

  if (validation.value === event.name) {
    return ok(event);
  }

  return ok({ ...touchEvent(event, now), name: validation.value });
}

export function setEventStatus(
  event: SplitEvent,
  status: EventStatus,
  now: string,
): SplitEvent {
  if (event.status === status) {
    return event;
  }

  return { ...touchEvent(event, now), status };
}

export function eventTotalCents(event: SplitEvent): number {
  return expensesTotal(event.expenses);
}

export function eventParticipantCount(event: SplitEvent): number {
  return event.participants.length;
}

/**
 * Newest first. Equal timestamps fall back to the stored order, so a tie never
 * reshuffles the list between renders.
 */
export function sortEventsByUpdatedAt(events: readonly SplitEvent[]): SplitEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const byUpdated =
        Date.parse(b.event.updatedAt) - Date.parse(a.event.updatedAt);

      return byUpdated !== 0 ? byUpdated : a.index - b.index;
    })
    .map((entry) => entry.event);
}

/** Display-only; filtering never changes stored events. */
export function filterEvents(
  events: readonly SplitEvent[],
  filter: EventFilter,
): SplitEvent[] {
  if (filter === 'all') {
    return [...events];
  }

  return events.filter((event) => event.status === filter);
}

export function findEvent(
  events: readonly SplitEvent[],
  id: string | null,
): SplitEvent | null {
  if (id === null) {
    return null;
  }

  return events.find((event) => event.id === id) ?? null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
}

/**
 * Reuses `parseGroupState` so an event's participants and expenses are held to
 * exactly the same rules as before, including the tip normalization that older
 * payloads depend on.
 */
function parseEvent(value: unknown): SplitEvent | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { id, name, status, createdAt, updatedAt } = candidate;

  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }

  if (typeof name !== 'string' || !validateEventName(name).ok) {
    return null;
  }

  if (status !== 'open' && status !== 'archived') {
    return null;
  }

  if (!isIsoTimestamp(createdAt) || !isIsoTimestamp(updatedAt)) {
    return null;
  }

  const group = parseGroupState({
    eventName: name,
    participants: candidate.participants,
    expenses: candidate.expenses,
  });

  if (!group) {
    return null;
  }

  const rawPaidTransfers = candidate.paidTransfers;

  if (
    !Array.isArray(rawPaidTransfers) ||
    !rawPaidTransfers.every(isValidTransfer)
  ) {
    return null;
  }

  const paidTransfers = rawPaidTransfers as Transfer[];
  const paidKeys = new Set(
    paidTransfers.map((transfer) =>
      JSON.stringify([transfer.fromId, transfer.toId, transfer.amountCents]),
    ),
  );

  if (paidKeys.size !== paidTransfers.length) {
    return null;
  }

  const event: SplitEvent = {
    id,
    name: normalizeName(name),
    status,
    createdAt,
    updatedAt,
    participants: group.participants,
    expenses: group.expenses,
    paidTransfers,
  };
  const plan = computeTransfers(computeBalances(event.participants, event.expenses));

  return {
    ...event,
    paidTransfers: reconcilePaidTransfers(
      event.paidTransfers,
      plan.ok ? plan.value : [],
    ),
  };
}

/** Returns `null` for anything that is not a valid persisted event collection. */
export function parseEventsState(value: unknown): EventsState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { events, lastActiveEventId } = candidate;

  if (!Array.isArray(events)) {
    return null;
  }

  const parsed: SplitEvent[] = [];
  const ids = new Set<string>();

  for (const item of events) {
    const event = parseEvent(item);

    if (!event || ids.has(event.id)) {
      return null;
    }

    ids.add(event.id);
    parsed.push(event);
  }

  if (
    lastActiveEventId !== null &&
    lastActiveEventId !== undefined &&
    typeof lastActiveEventId !== 'string'
  ) {
    return null;
  }

  // An orphan pointer is recoverable: show the home instead of discarding
  // every event the user still has.
  const activeId =
    typeof lastActiveEventId === 'string' && ids.has(lastActiveEventId)
      ? lastActiveEventId
      : null;

  return { events: parsed, lastActiveEventId: activeId };
}

/**
 * Wraps a legacy single-group payload into the first event. A group with no
 * participants and no expenses is the untouched default, so it is discarded
 * rather than resurrected as an empty placeholder.
 */
export function migrateLegacyGroupState(
  value: unknown,
  id: string,
  now: string,
): EventsState {
  // The legacy payload predates categories, so it is normalized here rather
  // than by each caller.
  const group: GroupState | null = parseGroupState(migrateLegacyGroupCategories(value));

  if (!group) {
    return createEmptyEventsState();
  }

  if (group.participants.length === 0 && group.expenses.length === 0) {
    return createEmptyEventsState();
  }

  const event: SplitEvent = {
    id,
    name: group.eventName,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    participants: group.participants,
    expenses: group.expenses,
    paidTransfers: [],
  };

  return { events: [event], lastActiveEventId: id };
}

/**
 * Adds the default category to expenses that predate categories, leaving
 * every other field untouched. Only a missing category is defaulted: an
 * explicit unknown value stays invalid so the strict parser can reject it.
 */
function withDefaultCategories(expenses: unknown): unknown {
  if (!Array.isArray(expenses)) {
    return expenses;
  }

  return expenses.map((expense) => {
    if (typeof expense !== 'object' || expense === null) {
      return expense;
    }

    const candidate = expense as Record<string, unknown>;

    if (candidate.category !== undefined) {
      return candidate;
    }

    return { ...candidate, category: DEFAULT_CATEGORY };
  });
}

/**
 * Raw-payload migration for a predecessor event collection: every event keeps
 * its id, name, status, timestamps, participants and expense order, and only
 * gains a default category where one is missing.
 */
export function migrateEventsCategories(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.events)) {
    return candidate;
  }

  return {
    ...candidate,
    events: candidate.events.map((event) => {
      if (typeof event !== 'object' || event === null) {
        return event;
      }

      const raw = event as Record<string, unknown>;

      return { ...raw, expenses: withDefaultCategories(raw.expenses) };
    }),
  };
}

/**
 * Adds an empty checklist to recognized event payloads that predate payment
 * tracking. Existing values are left for the strict current parser to check.
 */
export function migrateEventsPaidTransfers(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.events)) {
    return candidate;
  }

  return {
    ...candidate,
    events: candidate.events.map((event) => {
      if (typeof event !== 'object' || event === null) {
        return event;
      }

      const raw = event as Record<string, unknown>;

      return raw.paidTransfers === undefined
        ? { ...raw, paidTransfers: [] }
        : raw;
    }),
  };
}

/** The same raw migration for the older single-group payload shape. */
export function migrateLegacyGroupCategories(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const candidate = value as Record<string, unknown>;

  return { ...candidate, expenses: withDefaultCategories(candidate.expenses) };
}
