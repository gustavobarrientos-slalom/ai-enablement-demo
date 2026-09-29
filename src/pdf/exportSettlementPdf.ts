import type { SplitEvent } from '../domain/types';
import { saveFile } from '../platform';
import { createSettlementExportModel, settlementFilename } from './exportModel';

export async function exportSettlementPdf(event: SplitEvent): Promise<void> {
  const model = createSettlementExportModel(event);
  const filename = settlementFilename(event.name);
  const [{ pdf }, { createSettlementPdfDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./SettlementPdf'),
  ]);
  const blob = await pdf(createSettlementPdfDocument(model)).toBlob();

  await saveFile(filename, new Uint8Array(await blob.arrayBuffer()));
}
