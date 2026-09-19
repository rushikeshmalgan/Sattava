/**
 * Small in-memory LRU with TTL. Stores only validated successes (callers write
 * after validation), so a failure can never be served from cache.
 *
 * Per-instance and non-persistent by design: no Redis. A cold start simply
 * means a cache miss. The `cache` field in the AI request log tells us whether
 * it earns its place.
 */
export class LruTtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Re-insert to mark as most recently used (Map preserves insertion order).
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

export const visionCacheKey = (sha256: string, mimeType: string, promptVersion: string): string =>
  `${promptVersion}:${mimeType}:${sha256}`;
