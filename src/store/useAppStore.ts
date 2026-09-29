import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  addParticipant,
  canRemoveParticipant,
  isGroupValid,
  namesMatch,
  removeParticipant,
} from '../domain/group';
import {
  addContact,
  parseContactsState,
  removeContact,
  renameContact,
  setMeContact,
  sortContactsByName,
} from '../domain/contact';
import {
  createEmptyEventsState,
  createEvent,
  findEvent,
  isEventEditable,
  migrateEventsCategories,
  migrateEventsPaidTransfers,
  migrateLegacyGroupState,
  parseEventsState,
  renameEvent,
  setEventStatus,
  sortEventsByUpdatedAt,
  touchEvent,
} from '../domain/event';
import { expensesTotal, validateExpense } from '../domain/expense';
import { computeBalances } from '../domain/balance';
import { computeTransfers } from '../domain/settle';
import {
  isTransferPaid,
  isValidTransfer,
  reconcilePaidTransfers,
} from '../domain/paidTransfers';
import { createId } from '../lib/ids';
import { systemClock, type Clock } from '../lib/clock';
import type { SharePayload } from '../domain/share';
import type {
  AppError,
  Balance,
  Contact,
  EventFilter,
  Expense,
  ExpenseDraft,
  Participant,
  Result,
  SettlementError,
  SplitEvent,
  Transfer,
} from '../domain/types';

export const STORAGE_KEY = 'split:v2';
export const STORAGE_VERSION = 7;

/** The event collection before the contacts directory was added. */
export const PRE_CONTACTS_STORAGE_VERSION = 6;
/** The event collection with expense categories but no payment checklist. */
export const PRE_PAYMENT_STORAGE_VERSION = 5;
/** The event collection that predates categories. */
export const PRE_CATEGORY_STORAGE_VERSION = 4;

/** The single-group schema this version still migrates forward from. */
export const LEGACY_STORAGE_VERSION = 3;

let clock: Clock = systemClock;

/** Tests install a deterministic clock so timestamp assertions cannot flake. */
export function setStoreClock(next: Clock): void {
  clock = next;
}

export function resetStoreClock(): void {
  clock = systemClock;
}

/** Stable empty references keep selectors from re-rendering forever. */
const NO_PARTICIPANTS: Participant[] = [];
const NO_EXPENSES: Expense[] = [];

export interface AppState {
  events: SplitEvent[];
  contacts: Contact[];
  /** Transient view selection. `null` shows the Events home. */
  activeEventId: string | null;
  /** Persisted so a reload reopens the event the user was last in. */
  lastActiveEventId: string | null;
  eventFilter: EventFilter;
  lastError: AppError | null;

  createEvent: (name?: string) => string | null;
  importEvent: (payload: SharePayload) => boolean;
  openEvent: (id: string) => boolean;
  closeEvent: () => void;
  renameEvent: (id: string, raw: string) => boolean;
  archiveEvent: (id: string) => boolean;
  unarchiveEvent: (id: string) => boolean;
  deleteEvent: (id: string) => void;
  setEventFilter: (filter: EventFilter) => void;
  addContact: (raw: string) => boolean;
  renameContact: (id: string, raw: string) => boolean;
  removeContact: (id: string) => void;
  setMeContact: (id: string | null) => boolean;

  setEventName: (raw: string) => boolean;
  addParticipant: (raw: string) => boolean;
  addParticipantsFromContacts: (ids: readonly string[]) => boolean;
  removeParticipant: (id: string) => boolean;
  addExpense: (draft: ExpenseDraft) => boolean;
  updateExpense: (id: string, draft: ExpenseDraft) => boolean;
  removeExpense: (id: string) => boolean;
  toggleTransferPaid: (transfer: Transfer) => boolean;
  clearError: () => void;
}

type PersistedState = Pick<AppState, 'events' | 'lastActiveEventId' | 'contacts'>;

type EventChange = Result<SplitEvent> | SplitEvent;

function initialState() {
  return {
    ...createEmptyEventsState(),
    contacts: [],
    activeEventId: null,
    eventFilter: 'all' as EventFilter,
    lastError: null,
  };
}

function contactsFromEvents(events: readonly SplitEvent[]): Contact[] {
  const contacts: Contact[] = [];

  for (const event of events) {
    for (const participant of event.participants) {
      if (contacts.some((contact) => namesMatch(contact.name, participant.name))) {
        continue;
      }

      contacts.push({ id: createId(), name: participant.name, isMe: false });
    }
  }

  return contacts;
}

function replaceEvent(events: readonly SplitEvent[], next: SplitEvent): SplitEvent[] {
  return events.map((event) => (event.id === next.id ? next : event));
}

function isFailure(result: EventChange): result is { ok: false; error: AppError } {
  return 'ok' in result && result.ok === false;
}

function unwrapChange(result: EventChange): SplitEvent {
  return 'ok' in result ? (result as { ok: true; value: SplitEvent }).value : result;
}

function withReconciledPaidTransfers(event: SplitEvent): SplitEvent {
  const plan = computeTransfers(computeBalances(event.participants, event.expenses));

  return {
    ...event,
    paidTransfers: reconcilePaidTransfers(
      event.paidTransfers,
      plan.ok ? plan.value : [],
    ),
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /**
       * Every group and expense mutation funnels through here, so the archived
       * and no-active-event guards hold even when an action is called directly
       * rather than through the UI.
       */
      function updateActiveEvent(change: (event: SplitEvent) => EventChange): boolean {
        const { events, activeEventId } = get();
        const active = findEvent(events, activeEventId);

        if (!active) {
          set({ lastError: 'EVENT_NOT_FOUND' });
          return false;
        }

        if (!isEventEditable(active)) {
          set({ lastError: 'EVENT_ARCHIVED' });
          return false;
        }

        const result = change(active);

        if (isFailure(result)) {
          set({ lastError: result.error });
          return false;
        }

        const changed = unwrapChange(result);
        const updated =
          changed.participants !== active.participants ||
          changed.expenses !== active.expenses
            ? withReconciledPaidTransfers(changed)
            : changed;

        set({ events: replaceEvent(events, updated), lastError: null });
        return true;
      }

      function updateEventById(
        id: string,
        change: (event: SplitEvent) => EventChange,
      ): boolean {
        const { events } = get();
        const target = findEvent(events, id);

        if (!target) {
          set({ lastError: 'EVENT_NOT_FOUND' });
          return false;
        }

        const result = change(target);

        if (isFailure(result)) {
          set({ lastError: result.error });
          return false;
        }

        set({ events: replaceEvent(events, unwrapChange(result)), lastError: null });
        return true;
      }

      return {
        ...initialState(),

        createEvent: (name) => {
          const result = createEvent(createId(), name, clock());

          if (!result.ok) {
            set({ lastError: result.error });
            return null;
          }

          const event = result.value;

          set({
            events: [...get().events, event],
            activeEventId: event.id,
            lastActiveEventId: event.id,
            lastError: null,
          });

          return event.id;
        },

        importEvent: (payload) => {
          const now = clock();
          const event: SplitEvent = {
            id: createId(),
            name: payload.name,
            status: 'open',
            createdAt: now,
            updatedAt: now,
            participants: payload.participants.map((participant) => ({ ...participant })),
            expenses: payload.expenses.map((expense) => ({
              ...expense,
              shares: expense.shares.map((share) => ({ ...share })),
              tip: expense.tip ? { ...expense.tip } : null,
            })),
            paidTransfers: payload.paidTransfers.map((transfer) => ({ ...transfer })),
          };

          const contacts = get().contacts.slice();
          for (const participant of payload.participants) {
            if (!contacts.some((contact) => namesMatch(contact.name, participant.name))) {
              const added = addContact(contacts, participant.name, createId());
              if (added.ok) contacts.push(added.value[added.value.length - 1]!);
            }
          }

          set({
            events: [...get().events, event],
            contacts,
            activeEventId: event.id,
            lastActiveEventId: event.id,
            lastError: null,
          });
          return true;
        },

        openEvent: (id) => {
          if (!findEvent(get().events, id)) {
            set({ lastError: 'EVENT_NOT_FOUND' });
            return false;
          }

          set({ activeEventId: id, lastActiveEventId: id, lastError: null });
          return true;
        },

        // Leaves `lastActiveEventId` alone so a reload still reopens the event.
        closeEvent: () => set({ activeEventId: null, lastError: null }),

        renameEvent: (id, raw) =>
          updateEventById(id, (event) => renameEvent(event, raw, clock())),

        archiveEvent: (id) =>
          updateEventById(id, (event) => setEventStatus(event, 'archived', clock())),

        unarchiveEvent: (id) =>
          updateEventById(id, (event) => setEventStatus(event, 'open', clock())),

        deleteEvent: (id) => {
          const { events, activeEventId, lastActiveEventId } = get();

          set({
            events: events.filter((event) => event.id !== id),
            activeEventId: activeEventId === id ? null : activeEventId,
            lastActiveEventId: lastActiveEventId === id ? null : lastActiveEventId,
            lastError: null,
          });
        },

        setEventFilter: (filter) => set({ eventFilter: filter }),

        addContact: (raw) => {
          const result = addContact(get().contacts, raw, createId());
          if (!result.ok) {
            set({ lastError: result.error });
            return false;
          }

          set({ contacts: result.value, lastError: null });
          return true;
        },

        renameContact: (id, raw) => {
          const result = renameContact(get().contacts, id, raw);
          if (!result.ok) {
            set({ lastError: result.error });
            return false;
          }

          set({ contacts: result.value, lastError: null });
          return true;
        },

        removeContact: (id) =>
          set({ contacts: removeContact(get().contacts, id), lastError: null }),

        setMeContact: (id) => {
          const result = setMeContact(get().contacts, id);
          if (!result.ok) {
            set({ lastError: result.error });
            return false;
          }

          set({ contacts: result.value, lastError: null });
          return true;
        },

        setEventName: (raw) =>
          updateActiveEvent((event) => renameEvent(event, raw, clock())),

        addParticipant: (raw) => {
          const { events, activeEventId, contacts } = get();
          const event = findEvent(events, activeEventId);

          if (!event) {
            set({ lastError: 'EVENT_NOT_FOUND' });
            return false;
          }

          if (!isEventEditable(event)) {
            set({ lastError: 'EVENT_ARCHIVED' });
            return false;
          }

          const result = addParticipant(event.participants, raw, createId());
          if (!result.ok) {
            set({ lastError: result.error });
            return false;
          }

          const addedName = result.value[result.value.length - 1]!.name;
          const matchingContact = contacts.some((contact) =>
            namesMatch(contact.name, addedName),
          );
          let nextContacts = contacts;
          if (!matchingContact) {
            const contactResult = addContact(contacts, addedName, createId());
            if (!contactResult.ok) {
              set({ lastError: contactResult.error });
              return false;
            }
            nextContacts = contactResult.value;
          }

          set({
            events: replaceEvent(events, {
              ...withReconciledPaidTransfers({
                ...touchEvent(event, clock()),
                participants: result.value,
              }),
            }),
            contacts: nextContacts,
            lastError: null,
          });
          return true;
        },

        addParticipantsFromContacts: (ids) => {
          const { events, activeEventId, contacts } = get();
          const event = findEvent(events, activeEventId);

          if (!event) {
            set({ lastError: 'EVENT_NOT_FOUND' });
            return false;
          }

          if (!isEventEditable(event)) {
            set({ lastError: 'EVENT_ARCHIVED' });
            return false;
          }

          let participants = event.participants;
          for (const id of ids) {
            const contact = contacts.find((candidate) => candidate.id === id);
            if (
              !contact ||
              participants.some((participant) => namesMatch(participant.name, contact.name))
            ) {
              continue;
            }

            const result = addParticipant(participants, contact.name, createId());
            if (!result.ok) {
              set({ lastError: result.error });
              return false;
            }
            participants = result.value;
          }

          if (participants === event.participants) {
            set({ lastError: null });
            return true;
          }

          set({
            events: replaceEvent(events, withReconciledPaidTransfers({
              ...touchEvent(event, clock()),
              participants,
            })),
            lastError: null,
          });
          return true;
        },

        removeParticipant: (id) =>
          updateActiveEvent((event) => {
            if (!event.participants.some((participant) => participant.id === id)) {
              return event;
            }

            const result = removeParticipant(event.participants, id, event.expenses);

            if (!result.ok) {
              return result;
            }

            return { ...touchEvent(event, clock()), participants: result.value };
          }),

        addExpense: (draft) =>
          updateActiveEvent((event) => {
            const result = validateExpense(draft, event.participants, createId());

            if (!result.ok) {
              return result;
            }

            return {
              ...touchEvent(event, clock()),
              expenses: [...event.expenses, result.value],
            };
          }),

        updateExpense: (id, draft) => {
          const active = findEvent(get().events, get().activeEventId);

          // A missing expense is not a validation failure, so it must not
          // overwrite `lastError` with a misleading message.
          if (active && !active.expenses.some((expense) => expense.id === id)) {
            return false;
          }

          return updateActiveEvent((event) => {
            const index = event.expenses.findIndex((expense) => expense.id === id);
            const result = validateExpense(draft, event.participants, id);

            if (!result.ok) {
              return result;
            }

            const expenses = event.expenses.slice();
            expenses[index] = result.value;

            return { ...touchEvent(event, clock()), expenses };
          });
        },

        removeExpense: (id) =>
          updateActiveEvent((event) =>
            event.expenses.some((expense) => expense.id === id)
              ? {
                  ...touchEvent(event, clock()),
                  expenses: event.expenses.filter((expense) => expense.id !== id),
                }
              : event,
          ),

        toggleTransferPaid: (transfer) => {
          const { events, activeEventId } = get();
          const active = findEvent(events, activeEventId);

          if (!active) {
            set({ lastError: 'EVENT_NOT_FOUND' });
            return false;
          }

          if (!isEventEditable(active)) {
            set({ lastError: 'EVENT_ARCHIVED' });
            return false;
          }

          if (!isValidTransfer(transfer)) {
            return false;
          }

          const plan = computeTransfers(
            computeBalances(active.participants, active.expenses),
          );

          if (!plan.ok || !isTransferPaid(transfer, plan.value)) {
            return false;
          }

          const paidTransfers = isTransferPaid(transfer, active.paidTransfers)
            ? active.paidTransfers.filter((paid) => !isTransferPaid(paid, [transfer]))
            : [...active.paidTransfers, transfer];

          set({
            events: replaceEvent(events, { ...active, paidTransfers }),
            lastError: null,
          });
          return true;
        },

        clearError: () => set({ lastError: null }),
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        events: state.events,
        lastActiveEventId: state.lastActiveEventId,
        contacts: state.contacts,
      }),
      /**
       * Recognized predecessors are normalized before strict merge parsing.
       * Anything older or unrecognized carries no trustworthy shape.
       */
      migrate: (persisted, version) => {
        // Each recognized predecessor is normalized to the current shape and
        // then re-validated by `merge`; anything else starts empty.
        if (version === PRE_CATEGORY_STORAGE_VERSION) {
          return migrateEventsPaidTransfers(migrateEventsCategories(persisted));
        }

        if (version === PRE_CONTACTS_STORAGE_VERSION) {
          return persisted;
        }

        if (version === PRE_PAYMENT_STORAGE_VERSION) {
          return migrateEventsPaidTransfers(persisted);
        }

        if (version === LEGACY_STORAGE_VERSION) {
          return migrateLegacyGroupState(persisted, createId(), clock());
        }

        return { ...createEmptyEventsState(), contacts: [] };
      },
      merge: (persisted, current) => {
        const parsed = parseEventsState(persisted) ?? createEmptyEventsState();
        const source =
          typeof persisted === 'object' && persisted !== null
            ? (persisted as Record<string, unknown>)
            : {};
        const hasContacts = Object.prototype.hasOwnProperty.call(source, 'contacts');
        const parsedContacts = parseContactsState({ contacts: source.contacts });
        const contacts = hasContacts
          ? parsedContacts?.contacts ?? []
          : contactsFromEvents(parsed.events);

        return {
          ...current,
          ...parsed,
          contacts,
          // Reopening the last active event is what makes a reload feel
          // continuous; an orphan id was already cleared during parsing.
          activeEventId: parsed.lastActiveEventId,
        };
      },
    },
  ),
);

export function selectActiveEvent(state: AppState): SplitEvent | null {
  return findEvent(state.events, state.activeEventId);
}

export function selectEvents(state: AppState): SplitEvent[] {
  return state.events;
}

/** Newest first, then filtered for display only. */
export function selectVisibleEvents(state: AppState): SplitEvent[] {
  const sorted = sortEventsByUpdatedAt(state.events);

  return state.eventFilter === 'all'
    ? sorted
    : sorted.filter((event) => event.status === state.eventFilter);
}

export function selectEventName(state: AppState): string | null {
  return selectActiveEvent(state)?.name ?? null;
}

export function selectParticipants(state: AppState): Participant[] {
  return selectActiveEvent(state)?.participants ?? NO_PARTICIPANTS;
}

export function selectContacts(state: AppState): Contact[] {
  return sortContactsByName(state.contacts);
}

export function selectMeContact(state: AppState): Contact | null {
  return state.contacts.find((contact) => contact.isMe) ?? null;
}

export function selectEligibleContacts(state: AppState): Contact[] {
  const participants = selectParticipants(state);
  return selectContacts(state).filter(
    (contact) =>
      !participants.some((participant) => namesMatch(participant.name, contact.name)),
  );
}

export function selectContactSuggestions(
  state: AppState,
  prefix: string,
): Contact[] {
  const normalizedPrefix = prefix.trim().toLocaleLowerCase('en');
  if (!normalizedPrefix) return [];

  return selectEligibleContacts(state).filter((contact) =>
    contact.name.toLocaleLowerCase('en').startsWith(normalizedPrefix),
  );
}

export function selectExpenses(state: AppState): Expense[] {
  return selectActiveEvent(state)?.expenses ?? NO_EXPENSES;
}

export function selectIsGroupValid(state: AppState): boolean {
  return isGroupValid(selectParticipants(state));
}

export function selectIsActiveEventEditable(state: AppState): boolean {
  const active = selectActiveEvent(state);

  return active ? isEventEditable(active) : false;
}

export function selectPaidTransfers(state: AppState): Transfer[] {
  return selectActiveEvent(state)?.paidTransfers ?? [];
}

export function selectCanRemoveParticipant(
  state: AppState,
): (participantId: string) => boolean {
  const expenses = selectExpenses(state);

  return (participantId: string) => canRemoveParticipant(participantId, expenses);
}

export function selectExpensesTotal(state: AppState): number {
  return expensesTotal(selectExpenses(state));
}

/**
 * Derived on read. Nothing here is persisted, and these must not be called
 * from inside a Zustand selector: they build new arrays every time, which
 * would make useSyncExternalStore re-render forever. Components select the
 * raw participants and expenses and call these during render instead.
 */
export function selectBalances(state: AppState): Balance[] {
  return computeBalances(selectParticipants(state), selectExpenses(state));
}

export function selectTransfers(
  state: AppState,
): Result<Transfer[], SettlementError> {
  return computeTransfers(selectBalances(state));
}

export function resetAppStore(): void {
  useAppStore.setState(initialState());
}
