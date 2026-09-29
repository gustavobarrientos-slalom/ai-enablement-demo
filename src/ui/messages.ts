import type { AppError } from '../domain/types';
import { formatCents } from './currency';

export const PARTICIPANT_HAS_EXPENSES_MESSAGE = 'Has associated expenses';
export const NO_EXPENSES_MESSAGE = 'No expenses yet';

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
};

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
