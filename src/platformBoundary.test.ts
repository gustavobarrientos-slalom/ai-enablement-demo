import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');
const FORBIDDEN = ['navigator.clipboard', 'execCommand', 'createObjectURL', '@tauri-apps/'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe('platform boundary', () => {
  it('keeps browser and Tauri platform APIs inside src/platform', () => {
    const offenders = sourceFiles(SRC)
      .map((file) => relative(SRC, file).split(sep).join('/'))
      .filter((file) => !file.startsWith('platform/'))
      .flatMap((file) => {
        const text = readFileSync(join(SRC, file), 'utf8');

        return FORBIDDEN.filter((token) => text.includes(token)).map((token) => `${file}: ${token}`);
      });

    expect(offenders).toEqual([]);
  });

  it('keeps the domain free of platform imports', () => {
    const offenders = sourceFiles(join(SRC, 'domain')).filter((file) =>
      /from ['"][./]*platform/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });
});
