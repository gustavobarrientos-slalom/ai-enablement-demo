import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText, getShareBaseUrl, saveFile } from './web';

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

afterEach(() => {
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
  Reflect.deleteProperty(document, 'execCommand');
  vi.restoreAllMocks();
});

describe('copyText', () => {
  it('uses the Clipboard API when it succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText('share link')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('share link');
  });

  it('falls back to a temporary textarea when the Clipboard API rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    await expect(copyText('share link')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('returns false when the fallback copy fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await expect(copyText('share link')).resolves.toBe(false);
    expect(document.querySelector('textarea')).toBeNull();
  });
});

describe('saveFile', () => {
  const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

  afterEach(() => {
    vi.useRealTimers();
    for (const [name, descriptor] of [
      ['createObjectURL', createDescriptor],
      ['revokeObjectURL', revokeDescriptor],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(URL, name, descriptor);
      } else {
        Reflect.deleteProperty(URL, name);
      }
    }
  });

  it('downloads the bytes under the given name and later revokes the object URL', async () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn().mockReturnValue('blob:settlement');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    let clicked: { download: string; href: string } | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked = { download: this.download, href: this.getAttribute('href') ?? '' };
    });
    const bytes = new Uint8Array([37, 80, 68, 70]);

    await saveFile('trip-settlement.pdf', bytes);

    expect(clicked).toEqual({ download: 'trip-settlement.pdf', href: 'blob:settlement' });
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:settlement');
    vi.useRealTimers();
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    const content = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
    expect(new Uint8Array(content)).toEqual(bytes);
  });
});

describe('getShareBaseUrl', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('returns the origin and pathname without query or hash', () => {
    window.history.replaceState(null, '', '/ai-enablement-demo/?x=1#share=abc');

    expect(getShareBaseUrl()).toBe(`${window.location.origin}/ai-enablement-demo/`);
  });
});
