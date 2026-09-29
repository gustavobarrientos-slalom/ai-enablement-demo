import { afterEach, describe, expect, it, vi } from 'vitest';

const plugins = vi.hoisted(() => ({
  save: vi.fn(),
  writeFile: vi.fn(),
  writeText: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ save: plugins.save }));
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: plugins.writeFile }));
vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({ writeText: plugins.writeText }));

import { copyText, getShareBaseUrl, saveFile } from './tauri';

afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe('Tauri saveFile', () => {
  it('opens a Save as dialog and writes the exact bytes to the chosen path', async () => {
    plugins.save.mockResolvedValue('/Users/ana/Documents/trip-settlement.pdf');
    plugins.writeFile.mockResolvedValue(undefined);
    const bytes = new Uint8Array([37, 80, 68, 70]);

    await saveFile('trip-settlement.pdf', bytes);

    expect(plugins.save).toHaveBeenCalledWith({
      defaultPath: 'trip-settlement.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    expect(plugins.writeFile).toHaveBeenCalledWith(
      '/Users/ana/Documents/trip-settlement.pdf',
      bytes,
    );
  });

  it('writes nothing and resolves when the dialog is cancelled', async () => {
    plugins.save.mockResolvedValue(null);

    await expect(saveFile('trip-settlement.pdf', new Uint8Array([1]))).resolves.toBeUndefined();
    expect(plugins.writeFile).not.toHaveBeenCalled();
  });
});

describe('Tauri copyText', () => {
  it('writes the exact text with the clipboard plugin', async () => {
    plugins.writeText.mockResolvedValue(undefined);

    await expect(copyText('https://example/#share=abc')).resolves.toBe(true);
    expect(plugins.writeText).toHaveBeenCalledWith('https://example/#share=abc');
  });

  it('returns false when the clipboard plugin rejects', async () => {
    plugins.writeText.mockRejectedValue(new Error('denied'));

    await expect(copyText('link')).resolves.toBe(false);
  });
});

describe('Tauri getShareBaseUrl', () => {
  it('returns the configured public web app URL', () => {
    vi.stubEnv('VITE_SHARE_BASE_URL', 'https://owner.github.io/ai-enablement-demo/');

    expect(getShareBaseUrl()).toBe('https://owner.github.io/ai-enablement-demo/');
  });
});
