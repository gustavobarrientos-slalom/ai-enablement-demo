import type { SplitEvent } from '../domain/types';
import { createSettlementExportModel, settlementFilename } from './exportModel';

export async function downloadSettlementPdf(event: SplitEvent): Promise<void> {
  const model = createSettlementExportModel(event);
  const filename = settlementFilename(event.name);
  const [{ pdf }, { createSettlementPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./SettlementPdf'),
  ]);
  const blob = await pdf(createSettlementPdfDocument(model)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
