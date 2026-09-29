import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { desktopShareBaseUrl } from './shareBase';
import type { Platform } from './types';

function filtersFor(name: string): { name: string; extensions: string[] }[] {
  const extension = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

  return extension ? [{ name: extension.toUpperCase(), extensions: [extension] }] : [];
}

export async function saveFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  const path = await save({ defaultPath: name, filters: filtersFor(name) });

  if (path === null) {
    return;
  }

  // The dialog plugin adds the chosen path to the fs scope for this write.
  await writeFile(path, bytes);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const getShareBaseUrl = desktopShareBaseUrl;

export const tauriPlatform: Platform = { saveFile, copyText, getShareBaseUrl };
