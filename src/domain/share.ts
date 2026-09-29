import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { isCategory } from './category';
import { validateEventName, PARTICIPANT_NAME_MAX_LENGTH } from './group';
import { isValidTransfer } from './paidTransfers';
import { err, ok, type Expense, type Participant, type Result, type Share, type SplitEvent, type Tip, type Transfer } from './types';

export type SharePayload = Pick<
  SplitEvent,
  'name' | 'participants' | 'expenses' | 'paidTransfers'
> & { v: 1 };

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeCents(value: unknown, positive = false): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    (positive ? value > 0 : value >= 0)
  );
}

function isParticipant(value: unknown): value is Participant {
  if (!isRecord(value) || !hasExactKeys(value, ['id', 'name'])) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    value.name.trim().length <= PARTICIPANT_NAME_MAX_LENGTH
  );
}

function isShare(value: unknown, participantIds: ReadonlySet<string>): value is Share {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['participantId', 'amountCents']) &&
    typeof value.participantId === 'string' &&
    participantIds.has(value.participantId) &&
    isSafeCents(value.amountCents)
  );
}

function isTip(value: unknown): value is Tip | null {
  if (value === null) {
    return true;
  }

  if (!isRecord(value) || !isSafeCents(value.amountCents)) {
    return false;
  }

  if (value.kind === 'fixed') {
    return hasExactKeys(value, ['kind', 'amountCents']);
  }

  return (
    value.kind === 'percent' &&
    hasExactKeys(value, ['kind', 'percent', 'amountCents']) &&
    typeof value.percent === 'number' &&
    Number.isSafeInteger(value.percent) &&
    value.percent >= 0 &&
    value.percent <= 100
  );
}

function isExpense(value: unknown, participantIds: ReadonlySet<string>): value is Expense {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !hasExactKeys(value, [
      'id',
      'concept',
      'amountCents',
      'payerId',
      'splitMode',
      'shares',
      'tip',
      'category',
    ]) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.concept !== 'string' ||
    value.concept.trim().length === 0 ||
    value.concept.trim().length > 60 ||
    !isSafeCents(value.amountCents, true) ||
    typeof value.payerId !== 'string' ||
    !participantIds.has(value.payerId) ||
    (value.splitMode !== 'equal' && value.splitMode !== 'custom') ||
    !isCategory(value.category) ||
    !Array.isArray(value.shares) ||
    value.shares.length === 0 ||
    !isTip(value.tip)
  ) {
    return false;
  }

  if (!value.shares.every((share) => isShare(share, participantIds))) {
    return false;
  }

  const shares = value.shares as Share[];
  const shareIds = new Set(shares.map((share) => share.participantId));
  let total = 0;

  for (const share of shares) {
    total += share.amountCents;

    if (!Number.isSafeInteger(total)) {
      return false;
    }
  }

  return shareIds.size === shares.length && total === value.amountCents;
}

function parsePayload(value: unknown): SharePayload | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['v', 'name', 'participants', 'expenses', 'paidTransfers']) ||
    value.v !== 1 ||
    typeof value.name !== 'string' ||
    !validateEventName(value.name).ok ||
    !Array.isArray(value.participants) ||
    !Array.isArray(value.expenses) ||
    !Array.isArray(value.paidTransfers) ||
    !value.participants.every(isParticipant)
  ) {
    return null;
  }

  const participants = value.participants as Participant[];
  const participantIds = new Set(participants.map((participant) => participant.id));

  if (
    participantIds.size !== participants.length ||
    !value.expenses.every((expense) => isExpense(expense, participantIds))
  ) {
    return null;
  }

  const expenses = value.expenses as Expense[];
  const expenseIds = new Set(expenses.map((expense) => expense.id));

  if (
    expenseIds.size !== expenses.length ||
    !value.paidTransfers.every(
      (transfer) =>
        isValidTransfer(transfer) &&
        participantIds.has(transfer.fromId) &&
        participantIds.has(transfer.toId),
    )
  ) {
    return null;
  }

  const paidTransfers = value.paidTransfers as Transfer[];
  const paidTransferKeys = new Set(
    paidTransfers.map((transfer) =>
      JSON.stringify([transfer.fromId, transfer.toId, transfer.amountCents]),
    ),
  );

  if (paidTransferKeys.size !== paidTransfers.length) {
    return null;
  }

  return {
    v: 1,
    name: value.name,
    participants,
    expenses,
    paidTransfers,
  };
}

export function encodeShare(event: SplitEvent): string {
  const payload: SharePayload = {
    v: 1,
    name: event.name,
    participants: event.participants,
    expenses: event.expenses,
    paidTransfers: event.paidTransfers,
  };

  return compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeShare(text: string): Result<SharePayload> {
  try {
    const decompressed = decompressFromEncodedURIComponent(text);

    if (decompressed === null) {
      return err('SHARE_INVALID');
    }

    const payload = parsePayload(JSON.parse(decompressed));
    return payload ? ok(payload) : err('SHARE_INVALID');
  } catch {
    return err('SHARE_INVALID');
  }
}
