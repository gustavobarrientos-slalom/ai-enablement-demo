import type { Transfer } from './types';

/** A transfer is identified by its direction and exact integer-cent amount. */
export function sameTransfer(left: Transfer, right: Transfer): boolean {
  return (
    left.fromId === right.fromId &&
    left.toId === right.toId &&
    left.amountCents === right.amountCents
  );
}

export function isValidTransfer(value: unknown): value is Transfer {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);

  return (
    keys.length === 3 &&
    keys.every((key) => key === 'fromId' || key === 'toId' || key === 'amountCents') &&
    typeof candidate.fromId === 'string' &&
    candidate.fromId.length > 0 &&
    typeof candidate.toId === 'string' &&
    candidate.toId.length > 0 &&
    candidate.fromId !== candidate.toId &&
    typeof candidate.amountCents === 'number' &&
    Number.isSafeInteger(candidate.amountCents) &&
    candidate.amountCents > 0
  );
}

export function isTransferPaid(
  transfer: Transfer,
  paidTransfers: readonly Transfer[],
): boolean {
  return paidTransfers.some((paid) => sameTransfer(paid, transfer));
}

/**
 * Keeps only distinct paid tuples that still exist in the newly computed plan.
 * A discarded tuple cannot revive if the same transfer appears later.
 */
export function reconcilePaidTransfers(
  paidTransfers: readonly Transfer[],
  plan: readonly Transfer[],
): Transfer[] {
  const retained: Transfer[] = [];

  for (const paid of paidTransfers) {
    if (
      isTransferPaid(paid, plan) &&
      !isTransferPaid(paid, retained)
    ) {
      retained.push(paid);
    }
  }

  return retained;
}
