import { describe, expect, it } from 'vitest';
import { createId } from './ids';

describe('createId', () => {
  it('generates non-empty identifiers', () => {
    expect(createId().length).toBeGreaterThan(0);
  });

  it('generates unique identifiers', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId()));

    expect(ids.size).toBe(500);
  });
});
