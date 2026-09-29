import { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { selectExpenses, selectParticipants, useAppStore } from '../store/useAppStore';
import { computeBalances, isSettledUp } from '../domain/balance';
import { computeTransfers } from '../domain/settle';
import { categoryPercent, categoryTotals } from '../domain/category';
import { expensesTotal } from '../domain/expense';
import { formatCents, formatPercent } from '../ui/currency';
import {
  BALANCE_HEADINGS,
  CATEGORY_BREAKDOWN_HEADING,
  CATEGORY_LABELS,
  NETS_DO_NOT_SUM_MESSAGE,
  SETTLED_UP_MESSAGE,
  TRANSFERS_HEADING,
  transferLabel,
} from '../ui/messages';
import { CATEGORY_ICONS, faCircleCheck, faTriangleExclamation } from '../ui/icons';

export function SettlementTab() {
  const participants = useAppStore(selectParticipants);
  const expenses = useAppStore(selectExpenses);

  // Derived during render rather than in a selector: these build new arrays
  // every call, which would loop useSyncExternalStore forever.
  const balances = useMemo(
    () => computeBalances(participants, expenses),
    [participants, expenses],
  );
  const plan = useMemo(() => computeTransfers(balances), [balances]);

  // Same reason: derived on render and never persisted.
  const breakdown = useMemo(() => categoryTotals(expenses), [expenses]);
  const groupTotal = useMemo(() => expensesTotal(expenses), [expenses]);

  const settled = isSettledUp(balances);

  function nameOf(id: string): string {
    return participants.find((participant) => participant.id === id)?.name ?? '';
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700">Balances</h2>

        {participants.length === 0 ? (
          <p className="text-sm text-slate-500">No participants yet.</p>
        ) : (
          <ul aria-label="Balances" className="flex flex-col gap-2">
            {balances.map((balance) => (
              <li
                key={balance.participantId}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-base">{nameOf(balance.participantId)}</p>
                  <p className="truncate text-xs text-slate-500">
                    {BALANCE_HEADINGS.paid} {formatCents(balance.paidCents)} &middot;{' '}
                    {BALANCE_HEADINGS.consumed} {formatCents(balance.consumedCents)}
                  </p>
                </div>
                <span
                  data-testid={`net-${balance.participantId}`}
                  className={[
                    'shrink-0 text-base font-semibold',
                    balance.netCents < 0
                      ? 'text-red-600'
                      : balance.netCents > 0
                        ? 'text-emerald-700'
                        : 'text-slate-500',
                  ].join(' ')}
                >
                  {formatCents(balance.netCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {breakdown.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">
            {CATEGORY_BREAKDOWN_HEADING}
          </h2>

          <ul aria-label={CATEGORY_BREAKDOWN_HEADING} className="flex flex-col gap-2">
            {breakdown.map((row) => (
              <li
                key={row.category}
                data-testid={`category-total-${row.category}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FontAwesomeIcon
                    icon={CATEGORY_ICONS[row.category]}
                    className="w-5 shrink-0 text-slate-500"
                  />
                  <span className="truncate text-base">
                    {CATEGORY_LABELS[row.category]}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span
                    data-testid={`category-amount-${row.category}`}
                    className="text-base font-semibold"
                  >
                    {formatCents(row.totalCents)}
                  </span>
                  <span
                    data-testid={`category-percent-${row.category}`}
                    className="text-xs text-slate-500"
                  >
                    {formatPercent(categoryPercent(row.totalCents, groupTotal))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-slate-700">{TRANSFERS_HEADING}</h2>

        {!plan.ok ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {NETS_DO_NOT_SUM_MESSAGE}
          </p>
        ) : settled ? (
          <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-600">
            <FontAwesomeIcon icon={faCircleCheck} className="text-2xl text-emerald-600" />
            {SETTLED_UP_MESSAGE}
          </p>
        ) : (
          <ul aria-label="Transfers" className="flex flex-col gap-2">
            {plan.value.map((transfer) => (
              <li
                key={`${transfer.fromId}-${transfer.toId}-${transfer.amountCents}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 truncate text-base">
                  {nameOf(transfer.fromId)} &rarr; {nameOf(transfer.toId)}
                </span>
                <span className="shrink-0 text-base font-semibold">
                  {formatCents(transfer.amountCents)}
                </span>
                <span className="sr-only">{transferLabel(transfer, participants)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
