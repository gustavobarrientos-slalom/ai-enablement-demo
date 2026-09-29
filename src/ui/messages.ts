import type { AppError, Participant, TipMode, Transfer } from '../domain/types';
import { formatCents } from './currency';

export const PARTICIPANT_HAS_EXPENSES_MESSAGE = 'Has associated expenses';
export const NO_EXPENSES_MESSAGE = 'No expenses yet';
export const SETTLED_UP_MESSAGE = 'Everyone is settled up';
export const NETS_DO_NOT_SUM_MESSAGE = 'Balances do not add up';

export const BALANCE_HEADINGS = {
  participant: 'Participant',
  paid: 'Paid',
  consumed: 'Consumed',
  net: 'Net',
} as const;

/**
 * Deliberately avoids claiming the plan is the fewest possible transfers; the
 * greedy algorithm guarantees only the N-1 bound. See the settlement design.
 */
export const TRANSFERS_HEADING = 'How to settle up';

export const ERROR_MESSAGES: Record<AppError, string> = {
  EMPTY_EVENT_NAME: 'The event name is required',
  EVENT_NAME_TOO_LONG: 'The event name must be at most 60 characters',
  EMPTY_NAME: 'The name is required',
  NAME_TOO_LONG: 'The name must be at most 30 characters',
  DUPLICATE_NAME: 'A participant with that name already exists',
  PARTICIPANT_HAS_EXPENSES: PARTICIPANT_HAS_EXPENSES_MESSAGE,
  EMPTY_CONCEPT: 'The concept is required',
  CONCEPT_TOO_LONG: 'The concept must be at most 60 characters',
  INVALID_AMOUNT: 'Enter a valid amount',
  AMOUNT_NOT_POSITIVE: 'The amount must be greater than zero',
  TOO_MANY_DECIMALS: 'The amount can have at most 2 decimals',
  NO_BENEFICIARIES: 'Select at least one beneficiary',
  UNKNOWN_PARTICIPANT: 'Select a valid participant',
  NEGATIVE_SHARE: 'Shares cannot be negative',
  SHARES_DO_NOT_SUM: 'The shares must add up to the total',
  NETS_DO_NOT_SUM: NETS_DO_NOT_SUM_MESSAGE,
  NEGATIVE_TIP: 'The tip cannot be negative',
  TIP_PERCENT_OUT_OF_RANGE: 'The tip percentage must be between 0 and 100',
  TIP_PERCENT_NOT_INTEGER: 'The tip percentage must be a whole number',
  TIP_TOO_MANY_DECIMALS: 'The tip can have at most 2 decimals',
};

export const TIP_LABEL = 'Tip';

export const TIP_MODE_LABELS: Record<TipMode, string> = {
  none: 'No tip',
  percent: 'Percentage',
  fixed: 'Fixed amount',
};

/** Shown on an expense row that carries a tip. */
export function tipLabel(tipCents: number): string {
  return `Includes ${formatCents(tipCents)} tip`;
}

export const INVALID_GROUP_HINT = 'Add at least 2 participants to continue';

export function errorMessage(error: AppError | null): string | null {
  return error ? ERROR_MESSAGES[error] : null;
}

/**
 * Turns a signed cent difference into a label: negative means cents are still
 * unassigned, positive means the shares exceed the total.
 */
export function splitDifferenceLabel(differenceCents: number): string | null {
  if (differenceCents === 0) {
    return null;
  }

  return differenceCents < 0
    ? `${formatCents(-differenceCents)} remaining`
    : `${formatCents(differenceCents)} over`;
}

/** Formats a transfer as `Diana -> Ana $420.00`. */
export function transferLabel(
  transfer: Transfer,
  participants: readonly Participant[],
): string {
  const nameOf = (id: string) =>
    participants.find((participant) => participant.id === id)?.name ?? 'Unknown';

  return `${nameOf(transfer.fromId)} -> ${nameOf(transfer.toId)} ${formatCents(
    transfer.amountCents,
  )}`;
}
