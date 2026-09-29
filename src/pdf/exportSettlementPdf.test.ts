import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStore, useAppStore } from '../store/useAppStore';
import { seedActiveEvent } from '../test/factories';
import { exportSettlementPdf } from './exportSettlementPdf';

const pdfMock = vi.hoisted(() => vi.fn());
const saveFileMock = vi.hoisted(() => vi.fn());

vi.mock('@react-pdf/renderer', () => ({ pdf: pdfMock }));
vi.mock('./SettlementPdf', () => ({
  createSettlementPdfDocument: () => null,
}));
vi.mock('../platform', () => ({ saveFile: saveFileMock }));

const PDF_BYTES = new Uint8Array([37, 80, 68, 70]);

describe('exportSettlementPdf', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAppStore();
    vi.clearAllMocks();
    saveFileMock.mockResolvedValue(undefined);
    pdfMock.mockReturnValue({
      toBlob: vi.fn().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(PDF_BYTES.buffer.slice(0)),
      }),
    });
  });

  it('saves the PDF bytes through the platform using the slugified event name', async () => {
    seedActiveEvent("Ana's Mexico Trip!");
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');

    await exportSettlementPdf(useAppStore.getState().events[0]!);

    expect(pdfMock).toHaveBeenCalledOnce();
    expect(saveFileMock).toHaveBeenCalledOnce();
    expect(saveFileMock).toHaveBeenCalledWith('anas-mexico-trip-settlement.pdf', PDF_BYTES);
  });

  it('exports the fixed light PDF without reading the document theme class', async () => {
    seedActiveEvent('Dark mode export');
    useAppStore.getState().addParticipant('Ana');
    useAppStore.getState().addParticipant('Luis');
    document.documentElement.classList.add('dark');
    const hasDarkClass = vi.spyOn(document.documentElement.classList, 'contains');

    await exportSettlementPdf(useAppStore.getState().events[0]!);

    expect(pdfMock).toHaveBeenCalledOnce();
    expect(hasDarkClass).not.toHaveBeenCalled();
    hasDarkClass.mockRestore();
    document.documentElement.classList.remove('dark');
  });
});
