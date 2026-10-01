export type QrResult =
  | { kind: 'ok'; size: number; modules: boolean[] }
  | { kind: 'too-large' };

const CAPACITY_ERROR = 'The amount of data is too big to be stored in a QR Code';

export async function createQr(text: string): Promise<QrResult> {
  try {
    const QRCode = await import('qrcode');
    const code = QRCode.create(text, { errorCorrectionLevel: 'L' });
    return {
      kind: 'ok',
      size: code.modules.size,
      modules: Array.from(code.modules.data, Boolean),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes(CAPACITY_ERROR)) {
      return { kind: 'too-large' };
    }
    throw error;
  }
}
