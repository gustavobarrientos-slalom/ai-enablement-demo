import { afterEach, describe, expect, it, vi } from 'vitest';

const tauriLoaded = vi.hoisted(() => vi.fn());
const tauriPlatform = vi.hoisted(() => ({
  saveFile: vi.fn().mockResolvedValue(undefined),
  copyText: vi.fn().mockResolvedValue(true),
  getShareBaseUrl: vi.fn(),
}));

vi.mock('./tauri', () => {
  tauriLoaded();
  return { tauriPlatform };
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'isTauri');
  vi.unstubAllEnvs();
  vi.resetModules();
  tauriLoaded.mockClear();
});

describe('platform selection', () => {
  it('selects the web implementation without Tauri globals and never loads the Tauri module', async () => {
    const platform = await import('./index');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    expect(platform.platformKind).toBe('web');
    await expect(platform.copyText('link')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('link');
    expect(platform.getShareBaseUrl()).toBe(`${window.location.origin}${window.location.pathname}`);
    expect(tauriLoaded).not.toHaveBeenCalled();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('selects the Tauri implementation when the Tauri global is present', async () => {
    Object.defineProperty(globalThis, 'isTauri', { configurable: true, value: true });
    vi.stubEnv('VITE_SHARE_BASE_URL', 'https://owner.github.io/ai-enablement-demo/');
    const platform = await import('./index');
    const bytes = new Uint8Array([1, 2]);

    expect(platform.platformKind).toBe('desktop');
    await platform.saveFile('a.pdf', bytes);
    await expect(platform.copyText('link')).resolves.toBe(true);

    expect(tauriLoaded).toHaveBeenCalledOnce();
    expect(tauriPlatform.saveFile).toHaveBeenCalledWith('a.pdf', bytes);
    expect(tauriPlatform.copyText).toHaveBeenCalledWith('link');
    expect(platform.getShareBaseUrl()).toBe('https://owner.github.io/ai-enablement-demo/');
  });

  it('falls back to the dev server URL in desktop dev when the share URL is unset', async () => {
    vi.stubGlobal('isTauri', true);
    vi.stubEnv('VITE_SHARE_BASE_URL', '');
    vi.stubEnv('DEV', true);
    const { desktopShareBaseUrl } = await import('./shareBase');

    expect(desktopShareBaseUrl()).toBe(`${window.location.origin}${window.location.pathname}`);

    vi.stubEnv('DEV', false);
    expect(desktopShareBaseUrl()).toBe('');
  });
});
