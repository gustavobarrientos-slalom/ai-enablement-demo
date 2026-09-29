/**
 * `crypto.randomUUID` is unavailable in non-secure contexts and older mobile
 * browsers, so fall back to a random string. Collisions are irrelevant at
 * event-sized scale.
 */
export function createId(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;

  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
