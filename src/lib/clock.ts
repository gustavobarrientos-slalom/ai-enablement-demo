/**
 * Injectable so tests can assert ordering and timestamp advancement without
 * depending on wall-clock timing, which is flaky at millisecond resolution.
 */
export type Clock = () => string;

export const systemClock: Clock = () => new Date().toISOString();

/** Returns a clock that emits a fixed sequence, then repeats its last value. */
export function fixedClock(...values: string[]): Clock {
  if (values.length === 0) {
    throw new Error('fixedClock requires at least one timestamp');
  }

  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)] as string;
    index += 1;
    return value;
  };
}
