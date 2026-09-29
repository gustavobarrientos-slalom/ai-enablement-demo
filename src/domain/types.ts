export interface Participant {
  id: string;
  name: string;
}

/**
 * Minimal shape needed by the Group screen: it only has to know which
 * participants an expense references so they cannot be removed. The Expenses
 * capability fills in the rest.
 */
export interface Expense {
  id: string;
  payerId: string;
  beneficiaryIds: string[];
}

export interface GroupState {
  eventName: string;
  participants: Participant[];
}

export type GroupError =
  | 'EMPTY_EVENT_NAME'
  | 'EVENT_NAME_TOO_LONG'
  | 'EMPTY_NAME'
  | 'NAME_TOO_LONG'
  | 'DUPLICATE_NAME'
  | 'PARTICIPANT_HAS_EXPENSES';

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: GroupError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: GroupError): Result<T> {
  return { ok: false, error };
}
