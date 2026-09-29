import { expenseShares, expenseTotalCents } from './expense';
import type { Balance, Expense, Participant } from './types';

/**
 * Derives where every participant stands. Returned in participant order, which
 * is the canonical tie-break used downstream when matching debtors to
 * creditors.
 */
export function computeBalances(
  participants: readonly Participant[],
  expenses: readonly Expense[],
): Balance[] {
  const paid = new Map<string, number>();
  const consumed = new Map<string, number>();

  for (const participant of participants) {
    paid.set(participant.id, 0);
    consumed.set(participant.id, 0);
  }

  for (const expense of expenses) {
    // Both sides must use the tip inclusive view, or tips break the zero sum.
    if (paid.has(expense.payerId)) {
      paid.set(expense.payerId, paid.get(expense.payerId)! + expenseTotalCents(expense));
    }

    for (const share of expenseShares(expense)) {
      if (consumed.has(share.participantId)) {
        consumed.set(
          share.participantId,
          consumed.get(share.participantId)! + share.amountCents,
        );
      }
    }
  }

  return participants.map((participant) => {
    const paidCents = paid.get(participant.id)!;
    const consumedCents = consumed.get(participant.id)!;

    return {
      participantId: participant.id,
      paidCents,
      consumedCents,
      netCents: paidCents - consumedCents,
    };
  });
}

export function netsSum(balances: readonly Balance[]): number {
  return balances.reduce((total, balance) => total + balance.netCents, 0);
}

/**
 * Exact, with no epsilon: shares are integers that sum exactly to each expense
 * amount, so a consistent group always sums to zero as integer arithmetic.
 */
export function areNetsBalanced(balances: readonly Balance[]): boolean {
  return netsSum(balances) === 0;
}

export function isSettledUp(balances: readonly Balance[]): boolean {
  return balances.every((balance) => balance.netCents === 0);
}
