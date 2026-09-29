import type { Category, Expense, Participant, Share, Tip } from '../domain/types';
import { selectParticipants, useAppStore } from '../store/useAppStore';

interface ExpenseOverrides {
  id?: string;
  concept?: string;
  amountCents?: number;
  payerId: string;
  beneficiaryIds?: string[];
  shares?: Share[];
  tip?: Tip | null;
  category?: Category;
}

/**
 * Builds a consistent Expense for tests: when only beneficiaries are given the
 * amount is split so the shares always sum to the total.
 */
export function makeExpense(overrides: ExpenseOverrides): Expense {
  const {
    id = 'e1',
    concept = 'Dinner',
    payerId,
    beneficiaryIds = [],
    shares,
    tip = null,
    category = 'other',
  } = overrides;

  if (shares) {
    const amountCents =
      overrides.amountCents ?? shares.reduce((sum, share) => sum + share.amountCents, 0);

    return {
      id,
      concept,
      amountCents,
      payerId,
      splitMode: 'custom',
      shares,
      tip,
      category,
    };
  }

  const amountCents = overrides.amountCents ?? 10000;

  if (beneficiaryIds.length === 0) {
    // Payer-only expense: the payer covers the whole amount.
    return {
      id,
      concept,
      amountCents,
      payerId,
      splitMode: 'custom',
      shares: [{ participantId: payerId, amountCents }],
      tip,
      category,
    };
  }

  const base = Math.floor(amountCents / beneficiaryIds.length);
  const remainder = amountCents % beneficiaryIds.length;

  return {
    id,
    concept,
    amountCents,
    payerId,
    splitMode: 'equal',
    shares: beneficiaryIds.map((participantId, index) => ({
      participantId,
      amountCents: base + (index < remainder ? 1 : 0),
    })),
    tip,
    category,
  };
}

/**
 * Creates an event and makes it active, which every group and expense action
 * now requires. Returns the new event id.
 */
export function seedActiveEvent(name?: string): string {
  const id = useAppStore.getState().createEvent(name);

  if (id === null) {
    throw new Error('failed to seed an active event');
  }

  return id;
}

/** Seeds an active event and its participants in insertion order. */
export function seedEventWithParticipants(names: readonly string[]): {
  eventId: string;
  participants: Participant[];
} {
  const eventId = seedActiveEvent();

  for (const name of names) {
    if (!useAppStore.getState().addParticipant(name)) {
      throw new Error(`failed to seed participant ${name}`);
    }
  }

  return { eventId, participants: selectParticipants(useAppStore.getState()) };
}

/** Replaces the active event's participants and expenses wholesale. */
export function setActiveEventData(data: {
  participants?: Participant[];
  expenses?: Expense[];
}): void {
  const state = useAppStore.getState();
  const activeId = state.activeEventId;

  if (!activeId) {
    throw new Error('no active event to write to');
  }

  useAppStore.setState({
    events: state.events.map((event) =>
      event.id === activeId
        ? {
            ...event,
            participants: data.participants ?? event.participants,
            expenses: data.expenses ?? event.expenses,
          }
        : event,
    ),
  });
}
