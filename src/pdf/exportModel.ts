import { computeBalances } from '../domain/balance';
import { categoryTotals } from '../domain/category';
import { expenseTotalCents } from '../domain/expense';
import { isTransferPaid } from '../domain/paidTransfers';
import { computeTransfers } from '../domain/settle';
import type { Category, SplitEvent } from '../domain/types';
import { CATEGORY_ICONS } from '../ui/icons';
import { formatCents } from '../ui/currency';
import { CATEGORY_LABELS } from '../ui/messages';

export interface CategorySvg {
  width: number;
  height: number;
  paths: string[];
}

export interface SettlementExportModel {
  eventName: string;
  exportedAt: string;
  participants: { name: string }[];
  expenses: {
    concept: string;
    category: string;
    payer: string;
    amount: string;
  }[];
  balances: {
    participant: string;
    paid: string;
    consumed: string;
    net: string;
  }[];
  categories: {
    category: Category;
    label: string;
    amount: string;
    icon: CategorySvg;
  }[];
  transfers: {
    from: string;
    to: string;
    amount: string;
    status: 'Paid' | 'Unpaid';
  }[];
}

export function slugifyEventName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['’]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'event'
  );
}

export function settlementFilename(eventName: string): string {
  return `${slugifyEventName(eventName)}-settlement.pdf`;
}

export function categorySvg(category: Category): CategorySvg {
  const [width, height, , , pathData] = CATEGORY_ICONS[category].icon;

  return {
    width,
    height,
    paths: typeof pathData === 'string' ? [pathData] : [...pathData],
  };
}

export function createSettlementExportModel(
  event: SplitEvent,
  exportedOn: Date = new Date(),
): SettlementExportModel {
  const balances = computeBalances(event.participants, event.expenses);
  const plan = computeTransfers(balances);

  if (!plan.ok) {
    throw new Error('Cannot export settlement because participant balances do not sum to zero.');
  }

  const nameOf = (id: string) =>
    event.participants.find((participant) => participant.id === id)?.name ??
    'Unknown participant';

  return {
    eventName: event.name,
    exportedAt: new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(exportedOn),
    participants: event.participants.map(({ name }) => ({ name })),
    expenses: event.expenses.map((expense) => ({
      concept: expense.concept,
      category: CATEGORY_LABELS[expense.category],
      payer: nameOf(expense.payerId),
      amount: formatCents(expenseTotalCents(expense)),
    })),
    balances: balances.map((balance) => ({
      participant: nameOf(balance.participantId),
      paid: formatCents(balance.paidCents),
      consumed: formatCents(balance.consumedCents),
      net: formatCents(balance.netCents),
    })),
    categories: categoryTotals(event.expenses).map(({ category, totalCents }) => ({
      category,
      label: CATEGORY_LABELS[category],
      amount: formatCents(totalCents),
      icon: categorySvg(category),
    })),
    transfers: plan.value.map((transfer) => ({
      from: nameOf(transfer.fromId),
      to: nameOf(transfer.toId),
      amount: formatCents(transfer.amountCents),
      status: isTransferPaid(transfer, event.paidTransfers) ? 'Paid' : 'Unpaid',
    })),
  };
}
