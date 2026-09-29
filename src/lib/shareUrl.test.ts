import { describe, expect, it } from 'vitest';
import { buildShareUrl, readSharePayload } from './shareUrl';

describe('share URLs', () => {
  it('puts the payload only in the hash and leaves the query string empty', () => {
    const url = new URL(
      buildShareUrl('https://split.example', '/ai-enablement-demo/', 'compressed-data'),
    );

    expect(url.pathname).toBe('/ai-enablement-demo/');
    expect(url.search).toBe('');
    expect(url.hash).toBe('#share=compressed-data');
    expect(url.href).not.toContain('compressed-data?');
  });

  it('reads share payloads from the hash', () => {
    expect(readSharePayload('#share=compressed-data')).toBe('compressed-data');
    expect(readSharePayload('#other=value')).toBeNull();
    expect(readSharePayload('')).toBeNull();
  });
});
