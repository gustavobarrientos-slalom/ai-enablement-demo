import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStore, useAppStore } from '../store/useAppStore';
import { seedActiveEvent } from '../test/factories';
import { downloadSettlementPdf } from './downloadSettlementPdf';

const pdfMock = vi.hoisted(() => vi.fn());

vi.mock('@react-pdf/renderer', () => ({ pdf: pdfMock }));
vi.mock('./SettlementPdf', () => ({
  createSettlementPdfDocument: () => null,
}));

describe('downloadSettlementPdf', () => {
  const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(
    URL,
    'createObjectURL',
  );
  let downloadName = '';

  beforeEach(() => {
    localStorage.clear();
    resetAppStore();
    pdfMock.mockReturnValue({
      toBlob: vi.fn().mockResolvedValue(new Blob(['pdf'])),
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn().mockReturnValue('blob:settlement'),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    downloadName = '';
    if (originalCreateObjectUrl) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
  });

  it('downloads a PDF using the slugified event name', async () => {
    seedActiveEvent("Ana's Mexico Trip!");
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');

    await downloadSettlementPdf(useAppStore.getState().events[0]!);

    expect(pdfMock).toHaveBeenCalledOnce();
    expect(downloadName).toBe('anas-mexico-trip-settlement.pdf');
  });

  it('downloads the fixed light PDF without reading the document theme class', async () => {
    seedActiveEvent('Dark mode export');
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');
    document.documentElement.classList.add('dark');
    const hasDarkClass = vi.spyOn(document.documentElement.classList, 'contains');

    await downloadSettlementPdf(useAppStore.getState().events[0]!);

    expect(pdfMock).toHaveBeenCalledOnce();
    expect(hasDarkClass).not.toHaveBeenCalled();
  });
});
