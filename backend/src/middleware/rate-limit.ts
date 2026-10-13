// Counts attempts per key in a fixed window.
// ponytail: in-memory, per process. Move to Redis (REDIS_URL) when the API runs
// as more than one instance.
export function createFailureLimiter(max: number, windowMs: number) {
  const counts = new Map<string, { count: number; resetAt: number }>();
  // Expired keys are dropped once a minute so the map cannot grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counts) {
      if (entry.resetAt <= now) counts.delete(key);
    }
  }, 60_000).unref();

  function current(key: string, now: number) {
    const entry = counts.get(key);
    if (entry && entry.resetAt <= now) counts.delete(key);
    return counts.get(key);
  }

  return {
    isBlocked(key: string, now = Date.now()) {
      return (current(key, now)?.count ?? 0) >= max;
    },
    /** Count an attempt. Call before the slow check so parallel requests count. */
    hit(key: string, now = Date.now()) {
      const entry = current(key, now);
      counts.set(key, {
        count: (entry?.count ?? 0) + 1,
        resetAt: entry?.resetAt ?? now + windowMs,
      });
    },
    /** Undo one counted attempt (it succeeded). */
    forgive(key: string, now = Date.now()) {
      const entry = current(key, now);
      if (entry) entry.count = Math.max(0, entry.count - 1);
    },
    reset(key: string) {
      counts.delete(key);
    },
  };
}
