import { useId, useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES } from '../domain/category';
import { CONCEPT_MAX_LENGTH, createEmptyDraft } from '../domain/expense';
import { parseAmountToCents, parseTipFixed, parseTipPercent, tipCentsFromPercent } from '../domain/money';
import { buildCustomShares, splitDifference } from '../domain/split';
import type { AppError, Category, ExpenseDraft, Participant } from '../domain/types';
import { formatCents } from '../ui/currency';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CATEGORY_ICONS } from '../ui/icons';
import {
  CATEGORY_LABELS,
  ERROR_MESSAGES,
  TIP_LABEL,
  TIP_MODE_LABELS,
  splitDifferenceLabel,
  tipLabel,
} from '../ui/messages';

interface ExpenseFormProps {
  participants: readonly Participant[];
  initialDraft?: ExpenseDraft;
  submitLabel: string;
  /** Returns null on success, or the error to display. */
  onSubmit: (draft: ExpenseDraft) => AppError | null;
  onCancel?: () => void;
}

/**
 * Computes the live remaining/over indicator for a custom split. Returns null
 * when the indicator does not apply (equal split, or an amount not yet valid).
 */
function useCustomDifference(
  draft: ExpenseDraft,
  participants: readonly Participant[],
): number | null {
  return useMemo(() => {
    if (draft.splitMode !== 'custom' || draft.beneficiaryIds.length === 0) {
      return null;
    }

    const amount = parseAmountToCents(draft.amount);

    if (!amount.ok) {
      return null;
    }

    const shares = buildCustomShares(draft.beneficiaryIds, draft.customAmounts, participants);

    if (!shares.ok) {
      return null;
    }

    return splitDifference(shares.value, amount.value);
  }, [draft, participants]);
}

/** Live preview of the resolved tip and the resulting total. */
function useTipPreview(draft: ExpenseDraft): string | null {
  return useMemo(() => {
    if (draft.tipMode === 'none') {
      return null;
    }

    const amount = parseAmountToCents(draft.amount);

    if (!amount.ok) {
      return null;
    }

    const tipCents =
      draft.tipMode === 'percent'
        ? (() => {
            const percent = parseTipPercent(draft.tipValue);

            return percent.ok ? tipCentsFromPercent(amount.value, percent.value) : null;
          })()
        : (() => {
            const fixed = parseTipFixed(draft.tipValue);

            return fixed.ok ? fixed.value : null;
          })();

    if (tipCents === null) {
      return null;
    }

    return `${tipLabel(tipCents)} — total ${formatCents(amount.value + tipCents)}`;
  }, [draft]);
}

export function ExpenseForm({
  participants,
  initialDraft,
  submitLabel,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [draft, setDraft] = useState<ExpenseDraft>(
    () => initialDraft ?? createEmptyDraft(participants[0]?.id ?? ''),
  );
  const [error, setError] = useState<AppError | null>(null);

  // Create and edit forms can be mounted at once, so ids must stay unique.
  const formId = useId();

  const difference = useCustomDifference(draft, participants);
  const tipPreview = useTipPreview(draft);
  const differenceLabel = difference === null ? null : splitDifferenceLabel(difference);
  const unbalanced = difference !== null && difference !== 0;

  function update(patch: Partial<ExpenseDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function toggleBeneficiary(id: string) {
    setDraft((current) => ({
      ...current,
      beneficiaryIds: current.beneficiaryIds.includes(id)
        ? current.beneficiaryIds.filter((beneficiaryId) => beneficiaryId !== id)
        : [...current.beneficiaryIds, id],
    }));
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const failure = onSubmit(draft);

    if (failure) {
      setError(failure);
      return;
    }

    setError(null);

    // Only the create form resets; the edit form is unmounted by its parent.
    if (!initialDraft) {
      setDraft(createEmptyDraft(participants[0]?.id ?? ''));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-concept`} className="text-sm font-semibold text-text">
          Concept
        </label>
        <input
          id={`${formId}-concept`}
          type="text"
          value={draft.concept}
          maxLength={CONCEPT_MAX_LENGTH + 1}
          placeholder="Dinner"
          onChange={(event) => update({ concept: event.target.value })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-amount`} className="text-sm font-semibold text-text">
          Amount
        </label>
        <input
          id={`${formId}-amount`}
          type="text"
          inputMode="decimal"
          value={draft.amount}
          placeholder="0.00"
          onChange={(event) => update({ amount: event.target.value })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">{TIP_LABEL}</legend>

        <div className="flex gap-2" role="radiogroup" aria-label={TIP_LABEL}>
          {(['none', 'percent', 'fixed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={draft.tipMode === mode}
              onClick={() => update({ tipMode: mode })}
              className={[
                'min-h-11 flex-1 rounded-lg border px-2 text-sm',
                draft.tipMode === mode
                  ? 'border-primary bg-primary text-primary-contrast'
                  : 'border-border bg-surface text-text-muted',
              ].join(' ')}
            >
              {TIP_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {draft.tipMode !== 'none' && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`${formId}-tip`}
              className="text-sm font-semibold text-text"
            >
              {draft.tipMode === 'percent' ? 'Tip percentage' : 'Tip amount'}
            </label>
            <input
              id={`${formId}-tip`}
              type="text"
              inputMode="decimal"
              value={draft.tipValue}
              placeholder={draft.tipMode === 'percent' ? '10' : '0.00'}
              onChange={(event) => update({ tipValue: event.target.value })}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
            />
            {tipPreview && (
              <p className="text-sm text-text-muted" data-testid="tip-preview">
                {tipPreview}
              </p>
            )}
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-payer`} className="text-sm font-semibold text-text">
          Paid by
        </label>
        <select
          id={`${formId}-payer`}
          value={draft.payerId}
          onChange={(event) => update({ payerId: event.target.value })}
          className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
        >
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${formId}-category`}
          className="text-sm font-semibold text-text"
        >
          Category
        </label>
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={CATEGORY_ICONS[draft.category]}
            data-testid="category-preview"
            className="w-5 shrink-0 text-text-muted"
          />
          <select
            id={`${formId}-category`}
            value={draft.category}
            onChange={(event) => update({ category: event.target.value as Category })}
            className="min-h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-base focus:border-primary focus:outline-none"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">Split between</legend>

        <div className="flex gap-2" role="radiogroup" aria-label="Split mode">
          {(['equal', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={draft.splitMode === mode}
              onClick={() => update({ splitMode: mode })}
              className={[
                'min-h-11 flex-1 rounded-lg border px-3 text-sm',
                draft.splitMode === mode
                  ? 'border-primary bg-primary text-primary-contrast'
                  : 'border-border bg-surface text-text-muted',
              ].join(' ')}
            >
              {mode === 'equal' ? 'Equally' : 'Custom'}
            </button>
          ))}
        </div>

        <ul className="flex flex-col gap-2">
          {participants.map((participant) => {
            const selected = draft.beneficiaryIds.includes(participant.id);

            return (
              <li
                key={participant.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <input
                  id={`${formId}-beneficiary-${participant.id}`}
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleBeneficiary(participant.id)}
                  className="h-5 w-5"
                />
                <label
                  htmlFor={`${formId}-beneficiary-${participant.id}`}
                  className="min-w-0 flex-1 truncate text-base"
                >
                  {participant.name}
                </label>
                {draft.splitMode === 'custom' && selected && (
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`Amount for ${participant.name}`}
                    value={draft.customAmounts[participant.id] ?? ''}
                    placeholder="0.00"
                    onChange={(event) =>
                      update({
                        customAmounts: {
                          ...draft.customAmounts,
                          [participant.id]: event.target.value,
                        },
                      })
                    }
                    className="min-h-11 w-24 rounded-lg border border-border bg-surface px-2 text-right text-base focus:border-primary focus:outline-none"
                  />
                )}
              </li>
            );
          })}
        </ul>

        {differenceLabel && (
          <p role="status" className="text-sm font-medium text-warning-fg">
            {differenceLabel}
          </p>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-danger-fg">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={unbalanced}
          aria-disabled={unbalanced}
          className={[
            'min-h-11 flex-1 rounded-lg px-3 text-base',
            unbalanced
              ? 'cursor-not-allowed bg-surface-muted text-text-muted'
              : 'bg-primary text-primary-contrast',
          ].join(' ')}
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-border px-3 text-base text-text-muted"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
