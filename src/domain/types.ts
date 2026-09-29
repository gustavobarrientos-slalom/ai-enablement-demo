export interface Participant {
  id: string;
  name: string;
}

export type SplitMode = 'equal' | 'custom';

export interface Share {
  participantId: string;
  amountCents: number;
}

export type TipMode = 'none' | 'percent' | 'fixed';

/**
 * A percentage tip keeps the percentage the user chose alongside the resolved
 * cents, so reopening the form shows `10%` rather than a back-computed figure.
 * `amountCents` is always recomputed on save, never carried over.
 */
export type Tip =
  | { kind: 'percent'; percent: number; amountCents: number }
  | { kind: 'fixed'; amountCents: number };

export interface Expense {
  id: string;
  concept: string;
  /** The base amount the user typed, excluding any tip. */
  amountCents: number;
  payerId: string;
  splitMode: SplitMode;
  shares: Share[];
  tip: Tip | null;
}

/** Unvalidated form input, before it becomes an Expense. */
export interface ExpenseDraft {
  concept: string;
  amount: string;
  payerId: string;
  splitMode: SplitMode;
  beneficiaryIds: string[];
  customAmounts: Record<string, string>;
  tipMode: TipMode;
  tipValue: string;
}

/** Derived from expenses on read; never stored. */
export interface Balance {
  participantId: string;
  paidCents: number;
  consumedCents: number;
  netCents: number;
}

/** A directional payment that moves one participant closer to settled. */
export interface Transfer {
  fromId: string;
  toId: string;
  amountCents: number;
}

export interface GroupState {
  eventName: string;
  participants: Participant[];
  expenses: Expense[];
}

export type GroupError =
  | 'EMPTY_EVENT_NAME'
  | 'EVENT_NAME_TOO_LONG'
  | 'EMPTY_NAME'
  | 'NAME_TOO_LONG'
  | 'DUPLICATE_NAME'
  | 'PARTICIPANT_HAS_EXPENSES';

export type ExpenseError =
  | 'EMPTY_CONCEPT'
  | 'CONCEPT_TOO_LONG'
  | 'INVALID_AMOUNT'
  | 'AMOUNT_NOT_POSITIVE'
  | 'TOO_MANY_DECIMALS'
  | 'NO_BENEFICIARIES'
  | 'UNKNOWN_PARTICIPANT'
  | 'NEGATIVE_SHARE'
  | 'SHARES_DO_NOT_SUM'
  | 'NEGATIVE_TIP'
  | 'TIP_PERCENT_OUT_OF_RANGE'
  | 'TIP_PERCENT_NOT_INTEGER'
  | 'TIP_TOO_MANY_DECIMALS';

export type SettlementError = 'NETS_DO_NOT_SUM';

export type AppError = GroupError | ExpenseError | SettlementError;

export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function beneficiaryIds(expense: Expense): string[] {
  return expense.shares.map((share) => share.participantId);
}
