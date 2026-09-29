import { afterEach, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

const original = window.matchMedia;
afterEach(() => { window.matchMedia = original; });

it.each([true, false])('reads initial reduced motion: %s and observes changes', (initial) => {
  let notify: ((event: MediaQueryListEvent) => void) | undefined;
  const remove = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: initial,
    addEventListener: (_: string, callback: (event: MediaQueryListEvent) => void) => { notify = callback; },
    removeEventListener: remove,
  });
  const { result, unmount } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(initial);
  act(() => notify?.({ matches: !initial } as MediaQueryListEvent));
  expect(result.current).toBe(!initial);
  unmount();
  expect(remove).toHaveBeenCalledOnce();
});
