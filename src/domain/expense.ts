import { parseAmountToCents, parseTipFixed, parseTipPercent, tipCentsFromPercent } from './money';
import { buildShares, distributeProportionally, sharesTotal } from './split';
import {
  err,
  ok,
  type Expense,
  type ExpenseDraft,
  type ExpenseError,
  type Participant,
  type Result,
  type Share,
  type Tip,
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
    tipMode: 'none',
    tipValue: '',
  };
}

export function draftFromExpense(expense: Expense): ExpenseDraft {
  const customAmounts: Record<string, string> = {};

  // Base shares, not tip inclusive ones, so a custom split round trips.
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
    tipMode: expense.tip?.kind ?? 'none',
    tipValue: tipValueToInput(expense.tip),
  };
}

function tipValueToInput(tip: Tip | null): string {
  if (tip === null) {
    return '';
  }

  return tip.kind === 'percent' ? String(tip.percent) : centsToInput(tip.amountCents);
}

/** Renders integer cents as a plain decimal string for form inputs. */
export function centsToInput(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);

  return `${whole}.${String(fraction).padStart(2, '0')}`;
}

/** The single definition of an expense total: base amount plus tip. */
export function expenseTotalCents(expense: Expense): number {
  return expense.amountCents + (expense.tip?.amountCents ?? 0);
}

/**
 * The shares a participant actually consumed: the stored base share plus that
 * participant's part of the tip, distributed in proportion to consumption.
 * Derived on read; stored `shares` always sum to the base `amountCents`.
 */
export function expenseShares(expense: Expense): Share[] {
  const tipCents = expense.tip?.amountCents ?? 0;

  if (tipCents === 0) {
    return expense.shares.map((share) => ({ ...share }));
  }

  const tipParts = distributeProportionally(
    tipCents,
    expense.shares.map((share) => share.amountCents),
  );

  return expense.shares.map((share, index) => ({
    participantId: share.participantId,
    amountCents: share.amountCents + tipParts[index]!,
  }));
}

/** Parsed after the amount, since a percentage tip is meaningless without one. */
function buildTip(
  draft: Pick<ExpenseDraft, 'tipMode' | 'tipValue'>,
  amountCents: number,
): Result<Tip | null, ExpenseError> {
  if (draft.tipMode === 'none') {
    return ok(null);
  }

  if (draft.tipMode === 'percent') {
    const percent = parseTipPercent(draft.tipValue);

    if (!percent.ok) {
      return err(percent.error);
    }

    // Always recomputed, never carried over, so the pair cannot drift.
    return ok({
      kind: 'percent',
      percent: percent.value,
      amountCents: tipCentsFromPercent(amountCents, percent.value),
    });
  }

  const fixed = parseTipFixed(draft.tipValue);

  if (!fixed.ok) {
    return err(fixed.error);
  }

  return ok({ kind: 'fixed', amountCents: fixed.value });
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

  const tip = buildTip(draft, amount.value);

  if (!tip.ok) {
    return err(tip.error);
  }

  return ok({
    id,
    concept,
    amountCents: amount.value,
    payerId: draft.payerId,
    splitMode: draft.splitMode,
    shares: shares.value,
    tip: tip.value,
  });
}

export function expensesTotal(expenses: readonly Expense[]): number {
  return expenses.reduce((total, expense) => total + expenseTotalCents(expense), 0);
}

export function isExpenseConsistent(expense: Expense): boolean {
  return sharesTotal(expenseShares(expense)) === expenseTotalCents(expense);
}
