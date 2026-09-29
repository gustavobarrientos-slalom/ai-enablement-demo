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
  NO_EXPENSES_MESSAGE,
  tipLabel,
} from '../ui/messages';
import {
  CATEGORY_ICONS,
  faBoxArchive,
  faCoins,
  faReceipt,
  faTrash,
} from '../ui/icons';
import { ExpenseForm } from './ExpenseForm';
import { BottomSheet } from './shell/BottomSheet';
import { ListRow } from './shell/ListRow';
import { PrimaryAction } from './shell/PrimaryAction';

export function ExpensesTab({ showPrimaryAction = true }: { showPrimaryAction?: boolean }) {
  const participants = useAppStore(selectParticipants);
  const expenses = useAppStore(selectExpenses);
  const isEditable = useAppStore(selectIsActiveEventEditable);
  const total = useAppStore(selectExpensesTotal);
  const addExpense = useAppStore((state) => state.addExpense);
  const updateExpense = useAppStore((state) => state.updateExpense);
  const removeExpense = useAppStore((state) => state.removeExpense);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function submit(action: () => boolean): AppError | null {
    return action() ? null : useAppStore.getState().lastError;
  }

  function handleAdd(draft: ExpenseDraft): AppError | null {
    const failure = submit(() => addExpense(draft));
    if (!failure) setAdding(false);
    return failure;
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
          className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm text-text-muted"
        >
          <FontAwesomeIcon icon={faBoxArchive} />
          {ARCHIVED_READ_ONLY_MESSAGE}
        </p>
      )}

      <BottomSheet open={adding} title="New expense" onClose={() => setAdding(false)}>
          <ExpenseForm
            participants={participants}
            submitLabel="Add expense"
            onSubmit={handleAdd}
          />
      </BottomSheet>
      <BottomSheet open={editingId !== null} title="Edit expense" onClose={() => setEditingId(null)}>
        {expenses.filter((expense) => expense.id === editingId).map((expense) => (
          <ExpenseForm
            key={expense.id}
            participants={participants}
            initialDraft={draftFromExpense(expense)}
            submitLabel="Save changes"
            onSubmit={(draft) => handleUpdate(expense.id, draft)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </BottomSheet>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="md-section-title">Expenses ({expenses.length})</h2>
          <p className="text-base font-semibold text-text">
            Total: <span data-testid="expenses-total">{formatCents(total)}</span>
          </p>
        </div>

        {expenses.length === 0 ? (
          <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-3 py-6 text-sm text-text-muted">
            <FontAwesomeIcon icon={faReceipt} className="text-2xl text-text-muted" />
            {NO_EXPENSES_MESSAGE}
          </p>
        ) : (
          <ul aria-label="Expenses" className="md-card divide-y divide-divider">
            {expenses.map((expense) => (
              <ListRow
                key={expense.id}
                testId={`category-${expense.id}`}
                icon={CATEGORY_ICONS[expense.category]}
                primary={expense.concept}
                secondary={<>
                  <span>Paid by {participantName(expense.payerId)} &middot;{' '}
                    {expense.shares.length}{' '}
                    {expense.shares.length === 1 ? 'beneficiary' : 'beneficiaries'}
                  </span>
                  {expense.tip && expense.tip.amountCents > 0 && (
                    <span className="block" data-testid={`tip-${expense.id}`}>
                      <FontAwesomeIcon icon={faCoins} className="mr-1" />
                      {tipLabel(expense.tip.amountCents)}
                    </span>
                  )}
                </>}
                amount={formatCents(expenseTotalCents(expense))}
                {...(isEditable ? { onSelect: () => setEditingId(expense.id) } : {})}
                {...(isEditable ? {
                  actions: [{
                    label: `Delete ${expense.concept}`,
                    text: 'Delete',
                    icon: faTrash,
                    destructive: true,
                    onClick: () => removeExpense(expense.id),
                  }],
                } : {})}
              />
            ))}
          </ul>
        )}
      </section>
      {isEditable && showPrimaryAction && !adding && editingId === null && (
        <PrimaryAction onClick={() => setAdding(true)}>Add expense</PrimaryAction>
      )}
    </div>
  );
}
