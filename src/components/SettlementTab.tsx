import { useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  selectExpenses,
  selectIsActiveEventEditable,
  selectActiveEvent,
  selectPaidTransfers,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';
import { computeBalances } from '../domain/balance';
import { computeTransfers } from '../domain/settle';
import { isTransferPaid } from '../domain/paidTransfers';
import { categoryPercent, categoryTotals } from '../domain/category';
import { expensesTotal } from '../domain/expense';
import { formatCents, formatPercent } from '../ui/currency';
import {
  BALANCE_HEADINGS,
  ALL_PAID_EVENT_CLOSED_MESSAGE,
  CATEGORY_BREAKDOWN_HEADING,
  CATEGORY_LABELS,
  NETS_DO_NOT_SUM_MESSAGE,
  SETTLED_UP_MESSAGE,
  TRANSFERS_HEADING,
  transferLabel,
  transferProgressLabel,
} from '../ui/messages';
import { CATEGORY_ICONS, faCircleCheck, faTriangleExclamation } from '../ui/icons';

export function SettlementTab() {
  const activeEvent = useAppStore(selectActiveEvent);
  const participants = useAppStore(selectParticipants);
  const expenses = useAppStore(selectExpenses);
  const paidTransfers = useAppStore(selectPaidTransfers);
  const isEditable = useAppStore(selectIsActiveEventEditable);
  const toggleTransferPaid = useAppStore((state) => state.toggleTransferPaid);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

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

  function nameOf(id: string): string {
    return participants.find((participant) => participant.id === id)?.name ?? '';
  }

  async function exportPdf(): Promise<void> {
    if (!activeEvent || expenses.length === 0 || isExporting) {
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const { downloadSettlementPdf } = await import('../pdf/downloadSettlementPdf');
      await downloadSettlementPdf(activeEvent);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? `PDF export failed: ${error.message}`
          : 'PDF export failed because of an unknown error.',
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text">Balances</h2>
          <button
            type="button"
            onClick={exportPdf}
            disabled={expenses.length === 0 || isExporting}
            className="min-h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-contrast disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
        {exportError && (
          <p role="alert" className="text-sm text-danger-fg">
            {exportError}
          </p>
        )}

        {participants.length === 0 ? (
          <p className="text-sm text-text-muted">No participants yet.</p>
        ) : (
          <ul aria-label="Balances" className="flex flex-col gap-2">
            {balances.map((balance) => (
              <li
                key={balance.participantId}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-base">{nameOf(balance.participantId)}</p>
                  <p className="truncate text-xs text-text-muted">
                    {BALANCE_HEADINGS.paid} {formatCents(balance.paidCents)} &middot;{' '}
                    {BALANCE_HEADINGS.consumed} {formatCents(balance.consumedCents)}
                  </p>
                </div>
                <span
                  data-testid={`net-${balance.participantId}`}
                  className={[
                    'shrink-0 text-base font-semibold',
                    balance.netCents < 0
                      ? 'text-danger-fg'
                      : balance.netCents > 0
                        ? 'text-success-fg'
                        : 'text-text-muted',
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
          <h2 className="text-sm font-semibold text-text">
            {CATEGORY_BREAKDOWN_HEADING}
          </h2>

          <ul aria-label={CATEGORY_BREAKDOWN_HEADING} className="flex flex-col gap-2">
            {breakdown.map((row) => (
              <li
                key={row.category}
                data-testid={`category-total-${row.category}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FontAwesomeIcon
                    icon={CATEGORY_ICONS[row.category]}
                    className="w-5 shrink-0 text-text-muted"
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
                    className="text-xs text-text-muted"
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
        <h2 className="text-sm font-semibold text-text">{TRANSFERS_HEADING}</h2>

        {!plan.ok ? (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg"
          >
            <FontAwesomeIcon icon={faTriangleExclamation} />
            {NETS_DO_NOT_SUM_MESSAGE}
          </p>
        ) : plan.value.length === 0 ? (
          <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-text-muted">
            <FontAwesomeIcon icon={faCircleCheck} className="text-2xl text-success-fg" />
            {SETTLED_UP_MESSAGE}
          </p>
        ) : (
          <>
            <p data-testid="transfer-progress" className="text-sm text-text-muted">
              {transferProgressLabel(
                plan.value.filter((transfer) =>
                  isTransferPaid(transfer, paidTransfers),
                ).length,
                plan.value.length,
              )}
            </p>
            {plan.value.every((transfer) =>
              isTransferPaid(transfer, paidTransfers),
            ) && (
              <p data-testid="all-transfers-paid" className="text-sm font-semibold text-success-fg">
                {ALL_PAID_EVENT_CLOSED_MESSAGE}
              </p>
            )}
            <ul aria-label="Transfers" className="flex flex-col gap-2">
              {plan.value.map((transfer) => {
                const label = transferLabel(transfer, participants);
                const paid = isTransferPaid(transfer, paidTransfers);

                return (
                  <li
                    key={`${transfer.fromId}-${transfer.toId}-${transfer.amountCents}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-base">
                      {nameOf(transfer.fromId)} &rarr; {nameOf(transfer.toId)}
                    </span>
                    <span className="shrink-0 text-base font-semibold">
                      {formatCents(transfer.amountCents)}
                    </span>
                    <label className="flex shrink-0 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        aria-label={`Paid: ${label}`}
                        checked={paid}
                        disabled={!isEditable}
                        onChange={() => toggleTransferPaid(transfer)}
                      />
                      Paid
                    </label>
                    <span className="sr-only">{label}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
