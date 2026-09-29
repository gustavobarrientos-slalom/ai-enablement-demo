import { parseShareToCents } from './money';
import {
  err,
  ok,
  type ExpenseDraft,
  type ExpenseError,
  type Participant,
  type Result,
  type Share,
} from './types';

/** Orders beneficiaries by participant insertion order, the canonical tie-break. */
function inParticipantOrder(
  beneficiaryIds: readonly string[],
  participants: readonly Participant[],
): string[] {
  const unique = Array.from(new Set(beneficiaryIds));

  return unique.slice().sort((a, b) => {
    const indexA = participants.findIndex((participant) => participant.id === a);
    const indexB = participants.findIndex((participant) => participant.id === b);

    return indexA - indexB;
  });
}

/**
 * Splits `amountCents` evenly, handing the leftover cents out one each in
 * participant order. Parts always sum exactly to the total by construction.
 */
export function splitEqually(
  amountCents: number,
  beneficiaryIds: readonly string[],
  participants: readonly Participant[],
): Result<Share[], ExpenseError> {
  const ordered = inParticipantOrder(beneficiaryIds, participants);

  if (ordered.length === 0) {
    return err('NO_BENEFICIARIES');
  }

  if (ordered.some((id) => !participants.some((participant) => participant.id === id))) {
    return err('UNKNOWN_PARTICIPANT');
  }

  const base = Math.floor(amountCents / ordered.length);
  const remainder = amountCents % ordered.length;

  return ok(
    ordered.map((participantId, index) => ({
      participantId,
      amountCents: base + (index < remainder ? 1 : 0),
    })),
  );
}

export function buildCustomShares(
  beneficiaryIds: readonly string[],
  customAmounts: Readonly<Record<string, string>>,
  participants: readonly Participant[],
): Result<Share[], ExpenseError> {
  const ordered = inParticipantOrder(beneficiaryIds, participants);

  if (ordered.length === 0) {
    return err('NO_BENEFICIARIES');
  }

  if (ordered.some((id) => !participants.some((participant) => participant.id === id))) {
    return err('UNKNOWN_PARTICIPANT');
  }

  const shares: Share[] = [];

  for (const participantId of ordered) {
    const parsed = parseShareToCents(customAmounts[participantId] ?? '');

    if (!parsed.ok) {
      return err(parsed.error);
    }

    shares.push({ participantId, amountCents: parsed.value });
  }

  return ok(shares);
}

export function sharesTotal(shares: readonly Share[]): number {
  return shares.reduce((total, share) => total + share.amountCents, 0);
}

/** Negative means cents remaining; positive means cents over. */
export function splitDifference(
  shares: readonly Share[],
  amountCents: number,
): number {
  return sharesTotal(shares) - amountCents;
}

/** Single entry point so create and edit always build shares identically. */
export function buildShares(
  draft: Pick<ExpenseDraft, 'splitMode' | 'beneficiaryIds' | 'customAmounts'>,
  amountCents: number,
  participants: readonly Participant[],
): Result<Share[], ExpenseError> {
  if (draft.splitMode === 'equal') {
    return splitEqually(amountCents, draft.beneficiaryIds, participants);
  }

  const custom = buildCustomShares(
    draft.beneficiaryIds,
    draft.customAmounts,
    participants,
  );

  if (!custom.ok) {
    return custom;
  }

  if (splitDifference(custom.value, amountCents) !== 0) {
    return err('SHARES_DO_NOT_SUM');
  }

  return custom;
}
