import { webShareBaseUrl } from './shareBase';
import type { Platform } from './types';

export async function saveFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<void> {
  const url = URL.createObjectURL(new Blob([bytes]));
  const link = document.createElement('a');

  link.href = url;
  link.download = name;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Revoking immediately can cancel the download in some browsers.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the legacy browser clipboard API.
    }
  }

  if (typeof document === 'undefined' || !document.body) {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

export const getShareBaseUrl = webShareBaseUrl;

export const webPlatform: Platform = { saveFile, copyText, getShareBaseUrl };
