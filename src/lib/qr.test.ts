import { describe, expect, it, vi } from 'vitest';
import jsQR from 'jsqr';
import { createQr } from './qr';

function rasterize(size: number, modules: readonly boolean[], scale = 4): {
  data: Uint8ClampedArray;
  width: number;
  height: number;
} {
  const quiet = 4;
  const width = (size + quiet * 2) * scale;
  const data = new Uint8ClampedArray(width * width * 4);
  data.fill(255);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!modules[y * size + x]) continue;
      for (let py = 0; py < scale; py += 1) {
        for (let px = 0; px < scale; px += 1) {
          const offset = (((y + quiet) * scale + py) * width) + (x + quiet) * scale + px;
          const pixel = offset * 4;
          data[pixel] = 0;
          data[pixel + 1] = 0;
          data[pixel + 2] = 0;
        }
      }
    }
  }
  return { data, width, height: width };
}

describe('createQr', () => {
  it('creates a decodable level-L matrix', async () => {
    const input = 'https://example.test/#share=encoded-event';
    const result = await createQr(input);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const raster = rasterize(result.size, result.modules);
    const decoded = jsQR(raster.data, raster.width, raster.height);
    expect(decoded?.data).toBe(input);
  });

  it('passes level L to qrcode and reports a level-L result', async () => {
    const create = vi.fn(() => ({
      modules: { size: 1, data: new Uint8Array([1]) },
      errorCorrectionLevel: 'L',
    }));
    vi.doMock('qrcode', () => ({ create }));
    vi.resetModules();
    const { createQr: mockedCreateQr } = await import('./qr');
    const result = await mockedCreateQr('text');
    expect(create).toHaveBeenCalledWith('text', { errorCorrectionLevel: 'L' });
    expect(result.kind).toBe('ok');
    vi.doUnmock('qrcode');
    vi.resetModules();
  });

  it('returns too-large for an oversized string', async () => {
    const result = await createQr('x'.repeat(4000));
    expect(result).toEqual({ kind: 'too-large' });
  });

  it('rethrows non-capacity errors', async () => {
    vi.doMock('qrcode', () => ({
      create: () => {
        throw new Error('unexpected failure');
      },
    }));
    vi.resetModules();
    const { createQr: mockedCreateQr } = await import('./qr');
    await expect(mockedCreateQr('text')).rejects.toThrow('unexpected failure');
    vi.doUnmock('qrcode');
    vi.resetModules();
  });
});
