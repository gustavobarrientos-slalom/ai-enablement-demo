import type { Expense, Share, Tip } from '../domain/types';

interface ExpenseOverrides {
  id?: string;
  concept?: string;
  amountCents?: number;
  payerId: string;
  beneficiaryIds?: string[];
  shares?: Share[];
  tip?: Tip | null;
}

/**
 * Builds a consistent Expense for tests: when only beneficiaries are given the
 * amount is split so the shares always sum to the total.
 */
export function makeExpense(overrides: ExpenseOverrides): Expense {
  const {
    id = 'e1',
    concept = 'Dinner',
    payerId,
    beneficiaryIds = [],
    shares,
    tip = null,
  } = overrides;

  if (shares) {
    const amountCents =
      overrides.amountCents ?? shares.reduce((sum, share) => sum + share.amountCents, 0);

    return { id, concept, amountCents, payerId, splitMode: 'custom', shares, tip };
  }

  const amountCents = overrides.amountCents ?? 10000;

  if (beneficiaryIds.length === 0) {
    // Payer-only expense: the payer covers the whole amount.
    return {
      id,
      concept,
      amountCents,
      payerId,
      splitMode: 'custom',
      shares: [{ participantId: payerId, amountCents }],
      tip,
    };
  }

  const base = Math.floor(amountCents / beneficiaryIds.length);
  const remainder = amountCents % beneficiaryIds.length;

  return {
    id,
    concept,
    amountCents,
    payerId,
    splitMode: 'equal',
    shares: beneficiaryIds.map((participantId, index) => ({
      participantId,
      amountCents: base + (index < remainder ? 1 : 0),
    })),
    tip,
  };
}
