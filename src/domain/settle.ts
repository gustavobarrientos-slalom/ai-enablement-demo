import { areNetsBalanced } from './balance';
import {
  err,
  ok,
  type Balance,
  type Result,
  type SettlementError,
  type Transfer,
} from './types';

interface Position {
  participantId: string;
  /** Participant insertion order, the tie-break for both selections. */
  order: number;
  netCents: number;
}

/**
 * Picks the participant owing the most. Ties go to the earliest participant so
 * the plan is deterministic across runs.
 */
function largestDebtor(positions: readonly Position[]): Position | null {
  let best: Position | null = null;

  for (const position of positions) {
    if (position.netCents >= 0) {
      continue;
    }

    if (
      best === null ||
      position.netCents < best.netCents ||
      (position.netCents === best.netCents && position.order < best.order)
    ) {
      best = position;
    }
  }

  return best;
}

/** Mirror of largestDebtor for the credit side. */
function largestCreditor(positions: readonly Position[]): Position | null {
  let best: Position | null = null;

  for (const position of positions) {
    if (position.netCents <= 0) {
      continue;
    }

    if (
      best === null ||
      position.netCents > best.netCents ||
      (position.netCents === best.netCents && position.order < best.order)
    ) {
      best = position;
    }
  }

  return best;
}

/**
 * Greedy settlement: repeatedly match the largest debtor with the largest
 * creditor and move the smaller of the two absolute amounts, which zeroes at
 * least one of them per step and so terminates within N-1 transfers.
 *
 * This is deliberately not the minimum possible number of transfers; finding
 * that is NP-hard. See design.md.
 */
export function computeTransfers(
  balances: readonly Balance[],
): Result<Transfer[], SettlementError> {
  if (!areNetsBalanced(balances)) {
    return err('NETS_DO_NOT_SUM');
  }

  const positions: Position[] = balances.map((balance, index) => ({
    participantId: balance.participantId,
    order: index,
    netCents: balance.netCents,
  }));

  const transfers: Transfer[] = [];

  for (;;) {
    const debtor = largestDebtor(positions);
    const creditor = largestCreditor(positions);

    if (debtor === null || creditor === null) {
      break;
    }

    const amountCents = Math.min(-debtor.netCents, creditor.netCents);

    debtor.netCents += amountCents;
    creditor.netCents -= amountCents;

    transfers.push({
      fromId: debtor.participantId,
      toId: creditor.participantId,
      amountCents,
    });
  }

  return ok(transfers);
}

export function maxTransfers(participantCount: number): number {
  return Math.max(0, participantCount - 1);
}
