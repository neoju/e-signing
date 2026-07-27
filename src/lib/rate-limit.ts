// Shared exponential-backoff parameters for share password verification.
// Both the per-token counter (columns on `signature_requests`) and the
// per-IP counter (rows in `share_password_attempts`) use the same schedule
// so the two limits behave identically.
export const MAX_FREE_ATTEMPTS = 5;
export const BASE_LOCK_SECONDS = 15;
export const MAX_LOCK_SECONDS = 15 * 60;

// Given the *new* failed-attempt count (post-increment), returns the
// ISO timestamp at which the lock expires — or null while still under the
// free-attempts threshold.
export function computeLockedUntil(nextAttempts: number): string | null {
  if (nextAttempts <= MAX_FREE_ATTEMPTS) return null;
  const extra = nextAttempts - MAX_FREE_ATTEMPTS;
  const lockSeconds = Math.min(
    BASE_LOCK_SECONDS * 2 ** (extra - 1),
    MAX_LOCK_SECONDS,
  );
  return new Date(Date.now() + lockSeconds * 1000).toISOString();
}

// Milliseconds remaining on a lock, or 0 when it's already expired / unset.
export function lockRemainingMs(lockedUntil: string | null | undefined): number {
  if (!lockedUntil) return 0;
  return Math.max(0, new Date(lockedUntil).getTime() - Date.now());
}
