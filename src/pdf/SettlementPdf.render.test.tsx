// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, it, vi } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { categorySvg, type SettlementExportModel } from './exportModel';
import {
  createSettlementPdfDocument,
  PDF_THEME,
  PDF_THEME_COLORS,
} from './SettlementPdf';

afterEach(() => vi.unstubAllGlobals());

it('renders the Unicode settlement document using the bundled TTF font', async () => {
  const fontBytes = readFileSync(new URL('./assets/NotoSans.ttf', import.meta.url));
  const hasDarkClass = vi.fn(() => true);
  vi.stubGlobal('document', {
    documentElement: { classList: { contains: hasDarkClass } },
  });
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof Request
          ? input.url
          : input.href;

    if (url.endsWith('NotoSans.ttf')) {
      return new Response(fontBytes);
    }

    throw new Error(`Unexpected PDF asset request: ${url}`);
  });

  const model: SettlementExportModel = {
    eventName: 'México',
    exportedAt: 'Sep 29, 2026',
    participants: [{ name: 'José' }, { name: 'Ana' }],
    expenses: [
      { concept: 'Dinner', category: 'Food', payer: 'José', amount: '$10.00' },
    ],
    balances: [
      { participant: 'José', paid: '$10.00', consumed: '$0.00', net: '$10.00' },
      { participant: 'Ana', paid: '$0.00', consumed: '$10.00', net: '-$10.00' },
    ],
    categories: [
      {
        category: 'food',
        label: 'Food',
        amount: '$10.00',
        icon: categorySvg('food'),
      },
    ],
    transfers: [
      { from: 'Ana', to: 'José', amount: '$10.00', status: 'Unpaid' },
    ],
  };

  const buffer = await renderToBuffer(createSettlementPdfDocument(model));

  expect(buffer.subarray(0, 8).toString()).toBe('%PDF-1.3');
  expect(buffer.byteLength).toBeGreaterThan(1000);
  expect(PDF_THEME).toBe('light');
  expect(PDF_THEME_COLORS.background).toBe('#ffffff');
  expect(PDF_THEME_COLORS.text).toBe('#0f172a');
  expect(PDF_THEME_COLORS.headingBorder).toBe('#cbd5e1');
  expect(hasDarkClass).not.toHaveBeenCalled();
});
