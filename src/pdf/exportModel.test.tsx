import { beforeEach, describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { computeBalances } from '../domain/balance';
import { computeTransfers } from '../domain/settle';
import { resetAppStore, selectActiveEvent, useAppStore } from '../store/useAppStore';
import { seedActiveEvent } from '../test/factories';
import {
  createSettlementPdfDocument,
  PDF_FONT_FAMILY,
  PDF_FONT_SOURCE,
} from './SettlementPdf';
import {
  categorySvg,
  createSettlementExportModel,
  settlementFilename,
} from './exportModel';

function addExpense(
  concept: string,
  amount: string,
  payerId: string,
  participantIds: string[],
  category: 'food' | 'transport',
) {
  expect(
    useAppStore.getState().addExpense({
      concept,
      amount,
      payerId,
      splitMode: 'equal',
      beneficiaryIds: participantIds,
      customAmounts: {},
      tipMode: 'none',
      tipValue: '',
      category,
    }),
  ).toBe(true);
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (!isValidElement(value)) {
    return [];
  }

  const props = value.props as Record<string, unknown>;
  return [
    ...collectStrings(props.title),
    ...collectStrings(props.children),
  ];
}

beforeEach(() => {
  localStorage.clear();
  resetAppStore();
});

describe('settlement PDF export model', () => {
  it('slugifies event names and appends the settlement suffix', () => {
    expect(settlementFilename("Ana's Mexico Trip!")).toBe(
      'anas-mexico-trip-settlement.pdf',
    );
    expect(settlementFilename('Fiesta en México')).toBe(
      'fiesta-en-mexico-settlement.pdf',
    );
  });

  it('includes formatted expenses, balances, category totals and current paid status', () => {
    seedActiveEvent("Ana's Mexico Trip!");
    useAppStore.getState().addParticipant('José');
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Beto');
    const [jose, ana, beto] = useAppStore
      .getState()
      .events[0]!.participants.map(({ id }) => id);
    addExpense('Dinner', '1234.56', jose!, [jose!, ana!, beto!], 'food');
    addExpense('Taxi', '40.00', ana!, [beto!], 'transport');

    const event = selectActiveEvent(useAppStore.getState())!;
    const transfers = computeTransfers(computeBalances(event.participants, event.expenses));
    if (!transfers.ok) {
      throw new Error('Test settlement should be balanced.');
    }
    useAppStore.getState().toggleTransferPaid(transfers.value[0]!);

    const model = createSettlementExportModel(
      selectActiveEvent(useAppStore.getState())!,
      new Date('2026-09-29T12:00:00Z'),
    );

    expect(model.eventName).toBe("Ana's Mexico Trip!");
    expect(model.exportedAt).toBe('Sep 29, 2026');
    expect(model.participants.map(({ name }) => name)).toContain('José');
    expect(model.expenses).toEqual([
      { concept: 'Dinner', category: 'Food', payer: 'José', amount: '$1,234.56' },
      { concept: 'Taxi', category: 'Transport', payer: 'Ana', amount: '$40.00' },
    ]);
    expect(model.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ participant: 'José', paid: '$1,234.56' }),
      ]),
    );
    expect(model.categories.map(({ label, amount }) => [label, amount])).toEqual([
      ['Food', '$1,234.56'],
      ['Transport', '$40.00'],
    ]);
    expect(model.transfers.map(({ status }) => status)).toEqual(['Paid', 'Unpaid']);
  });

  it('converts the category icon definition into SVG view-box path data', () => {
    const icon = categorySvg('food');

    expect(icon.width).toBeGreaterThan(0);
    expect(icon.height).toBeGreaterThan(0);
    expect(icon.paths.length).toBeGreaterThan(0);
    expect(icon.paths.every((path) => path.length > 0)).toBe(true);
  });

  it('uses the bundled Unicode font and renders accented names and transfer arrows', () => {
    seedActiveEvent('México');
    useAppStore.getState().addParticipant('José');
    useAppStore.getState().addParticipant('Ana');
    const [jose, ana] = useAppStore
      .getState()
      .events[0]!.participants.map(({ id }) => id);
    addExpense('Dinner', '10.00', jose!, [ana!], 'food');
    const model = createSettlementExportModel(
      selectActiveEvent(useAppStore.getState())!,
      new Date('2026-09-29T12:00:00Z'),
    );
    const text = collectStrings(createSettlementPdfDocument(model)).join(' ');

    expect(PDF_FONT_FAMILY).toBe('Noto Sans');
    expect(PDF_FONT_FAMILY).not.toBe('Helvetica');
    expect(PDF_FONT_SOURCE).toContain('NotoSans.ttf');
    expect(PDF_FONT_SOURCE).not.toContain('fonts.googleapis.com');
    expect(text).toContain('México');
    expect(text).toContain('José');
    expect(text).toContain('→');
  });
});
