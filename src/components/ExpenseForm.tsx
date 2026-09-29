import { useId, useMemo, useState, type FormEvent } from 'react';
import { CATEGORIES, isCategory } from '../domain/category';
import { CONCEPT_MAX_LENGTH, createEmptyDraft } from '../domain/expense';
import { parseAmountToCents, parseShareToCents, parseTipFixed, parseTipPercent, tipCentsFromPercent } from '../domain/money';
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
import { SegmentedPill } from './shell/SegmentedPill';

interface ExpenseFormProps {
  participants: readonly Participant[];
  initialDraft?: ExpenseDraft;
  submitLabel: string;
  /** Returns null on success, or the error to display. */
  onSubmit: (draft: ExpenseDraft) => AppError | null;
  onCancel?: () => void;
}

type FieldKey =
  | 'concept'
  | 'amount'
  | 'tip'
  | 'payer'
  | 'category'
  | 'beneficiaries'
  | 'split'
  | `custom:${string}`;
type FieldErrors = Partial<Record<FieldKey, AppError>>;

function validateFields(draft: ExpenseDraft, participants: readonly Participant[]): FieldErrors {
  const errors: FieldErrors = {};
  const concept = draft.concept.trim();
  if (!concept) {
    errors.concept = 'EMPTY_CONCEPT';
  } else if (concept.length > CONCEPT_MAX_LENGTH) {
    errors.concept = 'CONCEPT_TOO_LONG';
  }

  if (!isCategory(draft.category)) {
    errors.category = 'UNKNOWN_CATEGORY';
  }
  const amount = parseAmountToCents(draft.amount);
  if (!amount.ok) {
    errors.amount = amount.error;
  }
  if (!participants.some((participant) => participant.id === draft.payerId)) {
    errors.payer = 'UNKNOWN_PARTICIPANT';
  }
  if (draft.beneficiaryIds.length === 0) {
    errors.beneficiaries = 'NO_BENEFICIARIES';
  } else if (draft.beneficiaryIds.some((id) => !participants.some((participant) => participant.id === id))) {
    errors.beneficiaries = 'UNKNOWN_PARTICIPANT';
  }

  if (draft.tipMode !== 'none') {
    const tip = draft.tipMode === 'percent'
      ? parseTipPercent(draft.tipValue)
      : parseTipFixed(draft.tipValue);
    if (!tip.ok) {
      errors.tip = tip.error;
    }
  }

  if (draft.splitMode === 'custom' && !errors.beneficiaries) {
    for (const id of draft.beneficiaryIds) {
      const share = parseShareToCents(draft.customAmounts[id] ?? '');
      if (!share.ok) {
        errors[`custom:${id}`] = share.error;
      }
    }
    if (amount.ok && !draft.beneficiaryIds.some((id) => errors[`custom:${id}`])) {
      const shares = buildCustomShares(draft.beneficiaryIds, draft.customAmounts, participants);
      if (!shares.ok) {
        errors.split = shares.error;
      } else if (splitDifference(shares.value, amount.value) !== 0) {
        errors.split = 'SHARES_DO_NOT_SUM';
      }
    }
  }

  return errors;
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
  const [touched, setTouched] = useState<ReadonlySet<FieldKey>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<AppError | null>(null);

  // Create and edit forms can be mounted at once, so ids must stay unique.
  const formId = useId();

  const difference = useCustomDifference(draft, participants);
  const tipPreview = useTipPreview(draft);
  const differenceLabel = difference === null ? null : splitDifferenceLabel(difference);
  const unbalanced = difference !== null && difference !== 0;
  const errors = validateFields(draft, participants);
  function visibleError(field: FieldKey): AppError | undefined {
    return submitted || touched.has(field) ? errors[field] : undefined;
  }
  function errorId(field: FieldKey): string {
    return `${formId}-${field}-error`;
  }
  function touch(field: FieldKey) {
    setTouched((current) => new Set(current).add(field));
  }
  function fieldProps(field: FieldKey) {
    return {
      onBlur: () => touch(field),
      'aria-invalid': visibleError(field) ? true : undefined,
      'aria-describedby': visibleError(field) ? errorId(field) : undefined,
    };
  }
  function errorMessage(field: FieldKey) {
    const error = visibleError(field);
    return error ? (
      <p id={errorId(field)} role="alert" className="text-sm text-danger-fg">
        {ERROR_MESSAGES[error]}
      </p>
    ) : null;
  }

  function update(patch: Partial<ExpenseDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setSubmitError(null);
  }

  function toggleBeneficiary(id: string) {
    setDraft((current) => ({
      ...current,
      beneficiaryIds: current.beneficiaryIds.includes(id)
        ? current.beneficiaryIds.filter((beneficiaryId) => beneficiaryId !== id)
        : [...current.beneficiaryIds, id],
    }));
    setSubmitError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    const failure = onSubmit(draft);

    if (failure) {
      setSubmitError(failure);
      return;
    }

    setSubmitError(null);

    // Only the create form resets; the edit form is unmounted by its parent.
    if (!initialDraft) {
      setDraft(createEmptyDraft(participants[0]?.id ?? ''));
      setTouched(new Set());
      setSubmitted(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1">
        <div className="md-field-wrap">
          <input
            id={`${formId}-concept`}
            type="text"
            value={draft.concept}
            maxLength={CONCEPT_MAX_LENGTH + 1}
            placeholder=" "
            onChange={(event) => update({ concept: event.target.value })}
            {...fieldProps('concept')}
            className="mobile-input md-field"
          />
          <label htmlFor={`${formId}-concept`} className="md-field-label">Concept</label>
        </div>
        {errorMessage('concept')}
      </div>

      <div className="flex flex-col gap-1">
        <div className="md-field-wrap">
          <input
            id={`${formId}-amount`}
            type="text"
            inputMode="decimal"
            value={draft.amount}
            placeholder=" "
            onChange={(event) => update({ amount: event.target.value })}
            {...fieldProps('amount')}
            className="mobile-input md-field"
          />
          <label htmlFor={`${formId}-amount`} className="md-field-label">Amount</label>
        </div>
        {errorMessage('amount')}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-text">{TIP_LABEL}</legend>

        <SegmentedPill
          label={TIP_LABEL}
          options={(['none', 'percent', 'fixed'] as const).map((mode) => ({
            value: mode,
            label: TIP_MODE_LABELS[mode],
          }))}
          value={draft.tipMode}
          onSelect={(tipMode) => update({ tipMode })}
          selectionRole="radio"
        />

        {draft.tipMode !== 'none' && (
          <div className="flex flex-col gap-1">
            <div className="md-field-wrap">
              <input
                id={`${formId}-tip`}
                type="text"
                inputMode="decimal"
                value={draft.tipValue}
                placeholder=" "
                onChange={(event) => update({ tipValue: event.target.value })}
                {...fieldProps('tip')}
                className="mobile-input md-field"
              />
              <label htmlFor={`${formId}-tip`} className="md-field-label">
                {draft.tipMode === 'percent' ? 'Tip percentage' : 'Tip amount'}
              </label>
            </div>
            {errorMessage('tip')}
            {tipPreview && (
              <p className="text-sm text-text-muted" data-testid="tip-preview">
                {tipPreview}
              </p>
            )}
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <div className="md-field-wrap">
          <select
            id={`${formId}-payer`}
            value={draft.payerId}
            onChange={(event) => update({ payerId: event.target.value })}
            {...fieldProps('payer')}
            className="mobile-target md-field"
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.name}
              </option>
            ))}
          </select>
          <label htmlFor={`${formId}-payer`} className="md-field-label">Paid by</label>
        </div>
        {errorMessage('payer')}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={CATEGORY_ICONS[draft.category]}
            data-testid="category-preview"
            className="w-5 shrink-0 text-text-muted"
          />
          <div className="md-field-wrap">
            <select
              id={`${formId}-category`}
              value={draft.category}
              onChange={(event) => update({ category: event.target.value as Category })}
              {...fieldProps('category')}
              className="mobile-target md-field"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <label htmlFor={`${formId}-category`} className="md-field-label">Category</label>
          </div>
        </div>
        {errorMessage('category')}
      </div>

      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={[
          visibleError('beneficiaries') && errorId('beneficiaries'),
          visibleError('split') && errorId('split'),
        ].filter(Boolean).join(' ') || undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) touch('beneficiaries');
        }}
      >
        <legend className="text-sm font-semibold text-text">Split between</legend>

        <SegmentedPill
          label="Split mode"
          options={[
            { value: 'equal', label: 'Equally' },
            { value: 'custom', label: 'Custom' },
          ]}
          value={draft.splitMode}
          onSelect={(splitMode) => update({ splitMode })}
          selectionRole="radio"
        />

        <ul className="flex flex-col gap-2">
          {participants.map((participant) => {
            const selected = draft.beneficiaryIds.includes(participant.id);

            return (
              <li
                key={participant.id}
                className="flex items-center gap-2 rounded-2xl bg-surface-muted px-3 py-1"
              >
                <input
                  id={`${formId}-beneficiary-${participant.id}`}
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleBeneficiary(participant.id)}
                  aria-invalid={visibleError('beneficiaries') ? true : undefined}
                  className="mobile-input md-check"
                />
                <label
                  htmlFor={`${formId}-beneficiary-${participant.id}`}
                  className="min-w-0 flex-1 truncate text-base"
                >
                  {participant.name}
                </label>
                {draft.splitMode === 'custom' && selected && (
                  <div className="flex w-24 shrink-0 flex-col gap-1">
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
                      aria-invalid={visibleError(`custom:${participant.id}`) ? true : undefined}
                      aria-describedby={visibleError(`custom:${participant.id}`)
                        ? errorId(`custom:${participant.id}`)
                        : undefined}
                      onBlur={() => {
                        touch(`custom:${participant.id}`);
                        touch('split');
                      }}
                      className="mobile-input md-field md-field-compact w-full"
                    />
                    {errorMessage(`custom:${participant.id}`)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {errorMessage('beneficiaries')}
        {errorMessage('split')}
        {differenceLabel && (
          <p role="status" className="text-sm font-medium text-warning-fg">
            {differenceLabel}
          </p>
        )}
      </fieldset>

      {submitError && (
        <p role="alert" className="text-sm text-danger-fg">
          {ERROR_MESSAGES[submitError]}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={unbalanced}
          aria-disabled={unbalanced}
          className="mobile-target md-filled-button flex-1"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mobile-target md-outline-button"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
