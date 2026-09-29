import {
  err,
  ok,
  type Expense,
  type GroupState,
  type Participant,
  type Result,
} from './types';

export const DEFAULT_EVENT_NAME = 'New Event';
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
  return { eventName: DEFAULT_EVENT_NAME, participants: [] };
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
      expense.beneficiaryIds.includes(participantId),
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

/** Returns `null` for anything that is not valid persisted group state. */
export function parseGroupState(value: unknown): GroupState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { eventName, participants } = candidate;

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

  return {
    eventName: normalizeName(eventName),
    participants: (participants as Participant[]).map((participant) => ({
      id: participant.id,
      name: normalizeName(participant.name),
    })),
  };
}
