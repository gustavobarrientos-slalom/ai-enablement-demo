import { describe, expect, it } from 'vitest';
import { buildShareUrl, readSharePayload } from './shareUrl';

describe('share URLs', () => {
  it('puts the payload only in the hash and leaves the query string empty', () => {
    const url = new URL(
      buildShareUrl('https://split.example/ai-enablement-demo/?x=1#old', 'compressed-data'),
    );

    expect(url.pathname).toBe('/ai-enablement-demo/');
    expect(url.search).toBe('');
    expect(url.hash).toBe('#share=compressed-data');
    expect(url.href).not.toContain('compressed-data?');
  });

  it('builds on an absolute desktop base URL', () => {
    expect(buildShareUrl('https://owner.github.io/ai-enablement-demo/', 'abc')).toBe(
      'https://owner.github.io/ai-enablement-demo/#share=abc',
    );
  });

  it('reads share payloads from the hash', () => {
    expect(readSharePayload('#share=compressed-data')).toBe('compressed-data');
    expect(readSharePayload('#other=value')).toBeNull();
    expect(readSharePayload('')).toBeNull();
  });
});
