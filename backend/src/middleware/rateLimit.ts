import type { Request, RequestHandler, Response } from 'express';
import { ApiError } from '../http/errors';
import '../http/requestContext';

export type LimitResult = { allowed: true; remaining: number } | { allowed: false; retryAfter: number };

/**
 * In-memory sliding-window limiter (the algorithm the FatSecret route already
 * used, extracted). Correct for a single instance, which is what Render's free
 * tier runs; state resets on restart. Scaling beyond one instance would need
 * shared state (e.g. Redis) and is deliberately out of scope.
 *
 * Memory stays bounded: each key holds at most `max` timestamps and stale keys
 * are swept opportunistically (no timers).
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): LimitResult {
    const now = this.now();
    this.sweepIfDue(now);

    const windowStart = now - this.windowMs;
    const fresh = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (fresh.length >= this.max) {
      this.hits.set(key, fresh);
      const oldest = fresh[0] ?? now;
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)) };
    }

    fresh.push(now);
    this.hits.set(key, fresh);
    return { allowed: true, remaining: this.max - fresh.length };
  }

  private sweepIfDue(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    const windowStart = now - this.windowMs;
    for (const [key, stamps] of this.hits) {
      if (stamps.every((t) => t <= windowStart)) this.hits.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limiter: SlidingWindowLimiter;
  /** Return undefined to fall back to the client IP. */
  key: (req: Request) => string | undefined;
  /** Included in internal logs so we know which rule fired. */
  scope: string;
  /** Override the default error-envelope response (used by the legacy FatSecret route). */
  onLimited?: (req: Request, res: Response, retryAfter: number) => void;
}

export const rateLimit =
  (opts: RateLimitOptions): RequestHandler =>
  (req, res, next) => {
    const key = opts.key(req) ?? `ip:${req.ip ?? 'unknown'}`;
    const result = opts.limiter.check(key);
    if (result.allowed) return next();

    if (opts.onLimited) return opts.onLimited(req, res, result.retryAfter);
    next(new ApiError(429, 'RATE_LIMITED', { retryAfter: result.retryAfter, internal: { scope: opts.scope } }));
  };

export const byIp = (req: Request): string => `ip:${req.ip ?? 'unknown'}`;
/** Only valid AFTER requireAuth; the uid comes from the verified token. */
export const byVerifiedUid = (req: Request): string | undefined =>
  req.auth ? `uid:${req.auth.uid}` : undefined;

/**
 * Global daily cap on Gemini attempts (cost guard). Counts provider calls, not
 * HTTP requests, so cache hits are free. Resets at UTC midnight.
 */
export class DailyBudget {
  private day = '';
  private used = 0;

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Returns false when the budget for today is exhausted. */
  tryConsume(): boolean {
    const today = new Date(this.now()).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
    }
    if (this.used >= this.limit) return false;
    this.used += 1;
    return true;
  }
}
