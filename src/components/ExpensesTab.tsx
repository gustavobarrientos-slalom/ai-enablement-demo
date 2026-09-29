import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  selectExpenses,
  selectExpensesTotal,
  selectIsActiveEventEditable,
  selectParticipants,
  useAppStore,
} from '../store/useAppStore';
import { draftFromExpense, expenseTotalCents } from '../domain/expense';
import type { AppError, ExpenseDraft } from '../domain/types';
import { formatCents } from '../ui/currency';
import {
  ARCHIVED_READ_ONLY_MESSAGE,
  CATEGORY_LABELS,
  NO_EXPENSES_MESSAGE,
  tipLabel,
} from '../ui/messages';
import {
  CATEGORY_ICONS,
  faBoxArchive,
  faCoins,
  faPen,
  faReceipt,
  faTrash,
} from '../ui/icons';
import { ExpenseForm } from './ExpenseForm';

export function ExpensesTab() {
  const participants = useAppStore(selectParticipants);
  const expenses = useAppStore(selectExpenses);
  const isEditable = useAppStore(selectIsActiveEventEditable);
  const total = useAppStore(selectExpensesTotal);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const removeExpense = useAppStore((state) => state.removeExpense);

  const [editingId, setEditingId] = useState<string | null>(null);

  function submit(action: () => boolean): AppError | null {
    return action() ? null : useAppStore.getState().lastError;
  }

  function handleAdd(draft: ExpenseDraft): AppError | null {
    return submit(() => addExpense(draft));
  }

  function handleUpdate(id: string, draft: ExpenseDraft): AppError | null {
    const failure = submit(() => updateExpense(id, draft));

    if (!failure) {
      setEditingId(null);
    }

    return failure;
  }

  function participantName(id: string): string {
    return participants.find((participant) => participant.id === id)?.name ?? '';
  }

  return (
    <div className="flex flex-col gap-6">
      {!isEditable && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700"
        >
          <FontAwesomeIcon icon={faBoxArchive} />
          {ARCHIVED_READ_ONLY_MESSAGE}
        </p>
      )}

      {isEditable && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">New expense</h2>
          <ExpenseForm
            participants={participants}
            submitLabel="Add expense"
            onSubmit={handleAdd}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Expenses ({expenses.length})</h2>
          <p className="text-base font-semibold text-slate-900">
            Total: <span data-testid="expenses-total">{formatCents(total)}</span>
          </p>
        </div>

        {expenses.length === 0 ? (
          <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500">
            <FontAwesomeIcon icon={faReceipt} className="text-2xl text-slate-400" />
            {NO_EXPENSES_MESSAGE}
          </p>
        ) : (
          <ul aria-label="Expenses" className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                {isEditable && editingId === expense.id ? (
                  <ExpenseForm
                    participants={participants}
                    initialDraft={draftFromExpense(expense)}
                    submitLabel="Save changes"
                    onSubmit={(draft) => handleUpdate(expense.id, draft)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <FontAwesomeIcon
                      icon={CATEGORY_ICONS[expense.category]}
                      data-testid={`category-${expense.id}`}
                      title={CATEGORY_LABELS[expense.category]}
                      className="w-5 shrink-0 text-slate-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base">{expense.concept}</p>
                      <p className="truncate text-xs text-slate-500">
                        Paid by {participantName(expense.payerId)} &middot;{' '}
                        {expense.shares.length}{' '}
                        {expense.shares.length === 1 ? 'beneficiary' : 'beneficiaries'}
                      </p>
                      {expense.tip && expense.tip.amountCents > 0 && (
                        <p
                          className="truncate text-xs text-slate-500"
                          data-testid={`tip-${expense.id}`}
                        >
                          <FontAwesomeIcon icon={faCoins} className="mr-1" />
                          {tipLabel(expense.tip.amountCents)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-base font-semibold">
                        {formatCents(expenseTotalCents(expense))}
                      </span>
                      {isEditable && (
                      <>
                      <button
                        type="button"
                        aria-label={`Edit ${expense.concept}`}
                        onClick={() => setEditingId(expense.id)}
                        className="min-h-11 min-w-11 rounded-lg px-3 text-slate-600 hover:bg-slate-100"
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${expense.concept}`}
                        onClick={() => removeExpense(expense.id)}
                        className="min-h-11 min-w-11 rounded-lg px-3 text-slate-600 hover:bg-slate-100 hover:text-red-600"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                      </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
