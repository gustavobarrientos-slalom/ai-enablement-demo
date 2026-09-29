import {
  err,
  ok,
  type Expense,
  type GroupState,
  type Participant,
  type Result,
  type Share,
  type SplitMode,
  type Tip,
} from './types';
import { isCategory } from './category';

export const DEFAULT_EVENT_NAME = 'New event';
export const EVENT_NAME_MAX_LENGTH = 60;
export const PARTICIPANT_NAME_MAX_LENGTH = 30;
export const MIN_PARTICIPANTS_FOR_VALID_GROUP = 2;

const COMPARISON_LOCALE = 'en';

export function normalizeName(raw: string): string {
  return raw.trim();
}

export function namesMatch(a: string, b: string): boolean {
  return (
    normalizeName(a).toLocaleLowerCase(COMPARISON_LOCALE) ===
    normalizeName(b).toLocaleLowerCase(COMPARISON_LOCALE)
  );
}

export function createEmptyGroupState(): GroupState {
  return { eventName: DEFAULT_EVENT_NAME, participants: [], expenses: [] };
}

export function validateEventName(raw: string): Result<string> {
  const name = normalizeName(raw);

  if (name.length === 0) {
    return err('EMPTY_EVENT_NAME');
  }

  if (name.length > EVENT_NAME_MAX_LENGTH) {
    return err('EVENT_NAME_TOO_LONG');
  }

  return ok(name);
}

export function validateParticipantName(
  raw: string,
  participants: readonly Participant[],
): Result<string> {
  const name = normalizeName(raw);

  if (name.length === 0) {
    return err('EMPTY_NAME');
  }

  if (name.length > PARTICIPANT_NAME_MAX_LENGTH) {
    return err('NAME_TOO_LONG');
  }

  if (participants.some((participant) => namesMatch(participant.name, name))) {
    return err('DUPLICATE_NAME');
  }

  return ok(name);
}

/** Appends at the end so insertion order stays the canonical ordering. */
export function addParticipant(
  participants: readonly Participant[],
  raw: string,
  id: string,
): Result<Participant[]> {
  const validation = validateParticipantName(raw, participants);

  if (!validation.ok) {
    return err(validation.error);
  }

  return ok([...participants, { id, name: validation.value }]);
}

export function removeParticipant(
  participants: readonly Participant[],
  id: string,
  expenses: readonly Expense[] = [],
): Result<Participant[]> {
  if (isParticipantReferenced(id, expenses)) {
    return err('PARTICIPANT_HAS_EXPENSES');
  }

  return ok(participants.filter((participant) => participant.id !== id));
}

export function isGroupValid(participants: readonly Participant[]): boolean {
  return participants.length >= MIN_PARTICIPANTS_FOR_VALID_GROUP;
}

export function isParticipantReferenced(
  participantId: string,
  expenses: readonly Expense[],
): boolean {
  return expenses.some(
    (expense) =>
      expense.payerId === participantId ||
      expense.shares.some((share) => share.participantId === participantId),
  );
}

export function canRemoveParticipant(
  participantId: string,
  expenses: readonly Expense[],
): boolean {
  return !isParticipantReferenced(participantId, expenses);
}

function isParticipant(value: unknown): value is Participant {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    normalizeName(candidate.name).length > 0 &&
    normalizeName(candidate.name).length <= PARTICIPANT_NAME_MAX_LENGTH
  );
}

function isShare(value: unknown, participantIds: ReadonlySet<string>): value is Share {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.participantId === 'string' &&
    participantIds.has(candidate.participantId) &&
    typeof candidate.amountCents === 'number' &&
    Number.isSafeInteger(candidate.amountCents) &&
    candidate.amountCents >= 0
  );
}

function isTip(value: unknown): value is Tip {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.amountCents !== 'number' ||
    !Number.isSafeInteger(candidate.amountCents) ||
    candidate.amountCents < 0
  ) {
    return false;
  }

  if (candidate.kind === 'fixed') {
    return true;
  }

  return (
    candidate.kind === 'percent' &&
    typeof candidate.percent === 'number' &&
    Number.isSafeInteger(candidate.percent) &&
    candidate.percent >= 0 &&
    candidate.percent <= 100
  );
}

function isExpense(value: unknown, participantIds: ReadonlySet<string>): value is Expense {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const { id, concept, amountCents, payerId, splitMode, shares, tip, category } =
    candidate;

  // Absent means an expense saved before tips existed.
  if (tip !== undefined && tip !== null && !isTip(tip)) {
    return false;
  }

  // Strict at the current version: predecessor payloads are given a default
  // category by an explicit migration before they ever reach this check.
  if (!isCategory(category)) {
    return false;
  }

  if (typeof id !== 'string' || id.length === 0) {
    return false;
  }

  if (
    typeof concept !== 'string' ||
    normalizeName(concept).length === 0 ||
    normalizeName(concept).length > EVENT_NAME_MAX_LENGTH
  ) {
    return false;
  }

  if (
    typeof amountCents !== 'number' ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0
  ) {
    return false;
  }

  if (typeof payerId !== 'string' || !participantIds.has(payerId)) {
    return false;
  }

  if (splitMode !== 'equal' && splitMode !== 'custom') {
    return false;
  }

  if (!Array.isArray(shares) || shares.length === 0) {
    return false;
  }

  if (!shares.every((share) => isShare(share, participantIds))) {
    return false;
  }

  const shareIds = new Set((shares as Share[]).map((share) => share.participantId));

  if (shareIds.size !== shares.length) {
    return false;
  }

  const total = (shares as Share[]).reduce((sum, share) => sum + share.amountCents, 0);

  return total === amountCents;
}

/** Returns `null` for anything that is not valid persisted group state. */
export function parseGroupState(value: unknown): GroupState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { eventName, participants, expenses } = candidate;

  if (typeof eventName !== 'string' || !validateEventName(eventName).ok) {
    return null;
  }

  if (!Array.isArray(participants) || !participants.every(isParticipant)) {
    return null;
  }

  const ids = new Set<string>();
  const names = new Set<string>();

  for (const participant of participants as Participant[]) {
    const normalizedName = normalizeName(participant.name).toLocaleLowerCase(
      COMPARISON_LOCALE,
    );

    if (ids.has(participant.id) || names.has(normalizedName)) {
      return null;
    }

    ids.add(participant.id);
    names.add(normalizedName);
  }

  const rawExpenses = expenses === undefined ? [] : expenses;

  if (!Array.isArray(rawExpenses) || !rawExpenses.every((item) => isExpense(item, ids))) {
    return null;
  }

  const expenseIds = new Set((rawExpenses as Expense[]).map((expense) => expense.id));

  if (expenseIds.size !== rawExpenses.length) {
    return null;
  }

  return {
    eventName: normalizeName(eventName),
    participants: (participants as Participant[]).map((participant) => ({
      id: participant.id,
      name: normalizeName(participant.name),
    })),
    expenses: (rawExpenses as Expense[]).map((expense) => ({
      id: expense.id,
      concept: normalizeName(expense.concept),
      amountCents: expense.amountCents,
      payerId: expense.payerId,
      splitMode: expense.splitMode as SplitMode,
      shares: expense.shares.map((share) => ({ ...share })),
      tip: expense.tip ?? null,
      category: expense.category,
    })),
  };
}
