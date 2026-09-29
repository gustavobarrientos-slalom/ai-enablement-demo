export type PlatformKind = 'web' | 'desktop';

export interface Platform {
  /** Resolves once the file is saved, or when the user cancels. */
  saveFile(name: string, bytes: Uint8Array<ArrayBuffer>): Promise<void>;
  /** Resolves to `false` only when the text could not be copied. */
  copyText(text: string): Promise<boolean>;
  /** Absolute URL that share links are built on. */
  getShareBaseUrl(): string;
}
