import { DailyBudget, SlidingWindowLimiter } from '../src/middleware/rateLimit';

describe('SlidingWindowLimiter', () => {
  it('allows up to max then blocks with a retryAfter', () => {
    let now = 1_000_000;
    const limiter = new SlidingWindowLimiter(60_000, 3, () => now);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').allowed).toBe(true);
    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.retryAfter).toBe(60);

    now += 30_000;
    const stillBlocked = limiter.check('a');
    expect(stillBlocked.allowed).toBe(false);
    if (!stillBlocked.allowed) expect(stillBlocked.retryAfter).toBe(30);
  });

  it('recovers once the oldest hit leaves the window', () => {
    let now = 0;
    const limiter = new SlidingWindowLimiter(1_000, 1, () => now);
    expect(limiter.check('k').allowed).toBe(true);
    expect(limiter.check('k').allowed).toBe(false);
    now = 1_001;
    expect(limiter.check('k').allowed).toBe(true);
  });

  it('isolates keys (one user cannot exhaust another)', () => {
    const limiter = new SlidingWindowLimiter(60_000, 1);
    expect(limiter.check('uid:1').allowed).toBe(true);
    expect(limiter.check('uid:1').allowed).toBe(false);
    expect(limiter.check('uid:2').allowed).toBe(true);
  });

  it('does not count blocked attempts against the window', () => {
    let now = 0;
    const limiter = new SlidingWindowLimiter(1_000, 1, () => now);
    limiter.check('k');
    for (let i = 0; i < 50; i++) limiter.check('k');
    now = 1_001;
    expect(limiter.check('k').allowed).toBe(true);
  });
});

describe('DailyBudget', () => {
  it('stops at the limit and resets at UTC midnight', () => {
    let now = Date.UTC(2026, 0, 1, 23, 59, 0);
    const budget = new DailyBudget(2, () => now);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    now = Date.UTC(2026, 0, 2, 0, 1, 0);
    expect(budget.tryConsume()).toBe(true);
  });
});
