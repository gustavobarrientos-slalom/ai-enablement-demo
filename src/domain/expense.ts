import { parseAmountToCents } from './money';
import { buildShares, sharesTotal } from './split';
import {
  err,
  ok,
  type Expense,
  type ExpenseDraft,
  type ExpenseError,
  type Participant,
  type Result,
} from './types';

export const CONCEPT_MAX_LENGTH = 60;

export function createEmptyDraft(payerId = ''): ExpenseDraft {
  return {
    concept: '',
    amount: '',
    payerId,
    splitMode: 'equal',
    beneficiaryIds: [],
    customAmounts: {},
  };
}

export function draftFromExpense(expense: Expense): ExpenseDraft {
  const customAmounts: Record<string, string> = {};

  for (const share of expense.shares) {
    customAmounts[share.participantId] = centsToInput(share.amountCents);
  }

  return {
    concept: expense.concept,
    amount: centsToInput(expense.amountCents),
    payerId: expense.payerId,
    splitMode: expense.splitMode,
    beneficiaryIds: expense.shares.map((share) => share.participantId),
    customAmounts,
  };
}

/** Renders integer cents as a plain decimal string for form inputs. */
export function centsToInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);

  return `${whole}.${String(fraction).padStart(2, '0')}`;
}

export function validateExpense(
  draft: ExpenseDraft,
  participants: readonly Participant[],
  id: string,
): Result<Expense, ExpenseError> {
  const concept = draft.concept.trim();

  if (concept.length === 0) {
    return err('EMPTY_CONCEPT');
  }

  if (concept.length > CONCEPT_MAX_LENGTH) {
    return err('CONCEPT_TOO_LONG');
  }

  const amount = parseAmountToCents(draft.amount);

  if (!amount.ok) {
    return err(amount.error);
  }

  if (!participants.some((participant) => participant.id === draft.payerId)) {
    return err('UNKNOWN_PARTICIPANT');
  }

  if (draft.beneficiaryIds.length === 0) {
    return err('NO_BENEFICIARIES');
  }

  const shares = buildShares(draft, amount.value, participants);

  if (!shares.ok) {
    return err(shares.error);
  }

  return ok({
    id,
    concept,
    amountCents: amount.value,
    payerId: draft.payerId,
    splitMode: draft.splitMode,
    shares: shares.value,
  });
}

export function expensesTotal(expenses: readonly Expense[]): number {
  return expenses.reduce((total, expense) => total + expense.amountCents, 0);
}

export function isExpenseConsistent(expense: Expense): boolean {
  return sharesTotal(expense.shares) === expense.amountCents;
}
