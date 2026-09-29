import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const tauriDir = resolve(__dirname, '../src-tauri');
const read = (file: string) => readFileSync(join(tauriDir, file), 'utf8');

interface Capability {
  windows: string[];
  permissions: (string | { identifier: string })[];
}

const capabilities = readdirSync(join(tauriDir, 'capabilities'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(read(join('capabilities', file))) as Capability);

const config = JSON.parse(read('tauri.conf.json'));
const cargo = read('Cargo.toml');

describe('desktop configuration', () => {
  it('grants exactly the three least-privilege permissions across all capabilities', () => {
    const permissions = capabilities.flatMap((cap) =>
      cap.permissions.map((p) => (typeof p === 'string' ? p : p.identifier)),
    );
    expect([...permissions].sort()).toEqual(
      ['clipboard-manager:allow-write-text', 'dialog:allow-save', 'fs:allow-write-file'].sort(),
    );
  });

  it('scopes the capability to the main window', () => {
    expect(capabilities.flatMap((cap) => cap.windows)).toEqual(['main']);
    expect(config.app.windows.map((w: { label: string }) => w.label)).toEqual(['main']);
  });

  it('uses the agreed identifier and product name', () => {
    expect(config.identifier).toBe('com.gustavobarrientos.split');
    expect(config.productName).toBe('Split');
  });

  it('builds from the Vite output and supports narrow windows', () => {
    expect(config.build.frontendDist).toBe('../dist');
    expect(config.app.windows[0].minWidth).toBe(360);
  });

  it('does not register deep links or file associations', () => {
    expect(cargo).not.toMatch(/deep-link/);
    expect(JSON.stringify(config)).not.toMatch(/deep-link|deepLink/);
    expect(config.bundle.fileAssociations).toBeUndefined();
  });
});
