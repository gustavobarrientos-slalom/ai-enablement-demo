import { isTauri } from '@tauri-apps/api/core';
import { desktopShareBaseUrl, webShareBaseUrl } from './shareBase';
import type { Platform, PlatformKind } from './types';

export type { Platform, PlatformKind } from './types';

export const platformKind: PlatformKind = isTauri() ? 'desktop' : 'web';

let loaded: Promise<Platform> | null = null;

// Dynamic imports keep the Tauri plugins out of the web-evaluated path.
function load(): Promise<Platform> {
  loaded ??=
    platformKind === 'desktop'
      ? import('./tauri').then((module) => module.tauriPlatform)
      : import('./web').then((module) => module.webPlatform);

  return loaded;
}

export async function saveFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  return (await load()).saveFile(name, bytes);
}

export async function copyText(text: string): Promise<boolean> {
  return (await load()).copyText(text);
}

/** Synchronous, so it cannot wait for the lazily loaded implementation. */
export function getShareBaseUrl(): string {
  return platformKind === 'desktop' ? desktopShareBaseUrl() : webShareBaseUrl();
}
