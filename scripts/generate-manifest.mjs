import { mkdir, writeFile } from 'node:fs/promises';
import { resolveBasePath } from '../pwa-base.mjs';
import { buildManifest } from '../pwa-manifest.mjs';

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../public/manifest.webmanifest', import.meta.url),
  `${JSON.stringify(buildManifest(resolveBasePath()), null, 2)}\n`,
);
