// writeQueue.ts
//
// Coalesces rapid-fire Firestore writes to the same document/batch into a
// single network write. Callers keep updating local state immediately (for
// the real-time feel); only the round trip to Firestore is delayed and
// deduped per key.

const DEBOUNCE_MS = 500;

type Waiter = { resolve: () => void; reject: (error: unknown) => void };

const timers = new Map<string, ReturnType<typeof setTimeout>>();
const runners = new Map<string, () => Promise<void>>();
const waiters = new Map<string, Waiter[]>();

async function flush(key: string) {
  const timer = timers.get(key);
  if (timer) clearTimeout(timer);
  timers.delete(key);

  const run = runners.get(key);
  runners.delete(key);

  const keyWaiters = waiters.get(key) ?? [];
  waiters.delete(key);

  if (!run) return;

  try {
    await run();
    keyWaiters.forEach((waiter) => waiter.resolve());
  } catch (error) {
    keyWaiters.forEach((waiter) => waiter.reject(error));
  }
}

/**
 * Schedules `run` under `key`, replacing any not-yet-flushed write already
 * scheduled under the same key. The returned promise settles once the
 * eventual (coalesced) write completes.
 */
export function scheduleWrite(key: string, run: () => Promise<void>) {
  return new Promise<void>((resolve, reject) => {
    runners.set(key, run);
    waiters.set(key, [...(waiters.get(key) ?? []), { resolve, reject }]);

    const existing = timers.get(key);
    if (existing) clearTimeout(existing);

    timers.set(
      key,
      setTimeout(() => {
        void flush(key);
      }, DEBOUNCE_MS),
    );
  });
}

/** Immediately runs every pending write. Use before the app can lose them (tab hide/unload, sign-out). */
export function flushPendingWrites() {
  return Promise.all(Array.from(timers.keys()).map(flush)).then(() => undefined);
}
