import { percentile, summarize, type AiEvent } from '../scripts/summarize-ai-logs';

const ev = (over: Partial<AiEvent>): AiEvent => ({
  event: 'ai.request',
  route: 'vision.analyze-food',
  cache: 'miss',
  attempts: [],
  finalModel: null,
  outcome: 'success',
  errorCode: null,
  latencyMs: 1000,
  ...over,
});
const ok = (model: string, ms = 1000) => ({ model, outcome: 'OK', latencyMs: ms });

describe('summarize (answers the five operational questions)', () => {
  const events: AiEvent[] = [
    ev({ attempts: [ok('a', 2000)], finalModel: 'a', latencyMs: 2000 }),
    ev({ attempts: [{ model: 'a', outcome: 'RATE_LIMITED', latencyMs: 300, reason: 'QUOTA_OR_RATE_LIMIT' }, ok('b', 1500)], finalModel: 'b', latencyMs: 1800 }),
    ev({ attempts: [{ model: 'a', outcome: 'SCHEMA_INVALID', latencyMs: 900 }, ok('b', 1200)], finalModel: 'b', latencyMs: 2100 }),
    ev({ cache: 'hit', finalModel: 'a', latencyMs: 2 }),
    ev({
      outcome: 'error',
      errorCode: 'AI_UNAVAILABLE',
      latencyMs: 9000,
      attempts: [
        { model: 'a', outcome: 'MODEL_FAILED', latencyMs: 100, reason: 'MODEL_NOT_FOUND' },
        { model: 'b', outcome: 'NETWORK_ERROR', latencyMs: 5000, reason: 'TIMEOUT' },
      ],
    }),
    ev({ route: 'coach.daily_tip', cache: 'n/a', attempts: [ok('a', 800)], finalModel: 'a', latencyMs: 800 }),
  ];
  const s = summarize(events);

  it('how often does Gemini fail?', () => {
    expect(s.total).toBe(6);
    expect(s.failureRate).toContain('1/6');
    expect(s.errorCodes).toEqual({ AI_UNAVAILABLE: 1 });
  });

  it('which fallback model handles failures?', () => {
    expect(s.servedBy).toEqual({ a: 2, b: 2 });
    expect(s.fallbackRate).toContain('2/4'); // 4 fresh successes, 2 needed a second model
  });

  it('how often does validation reject output?', () => {
    // responded attempts: 4 OK + 1 SCHEMA_INVALID = 5; 1 rejected
    expect(s.validationRejectionRate).toContain('1/5');
  });

  it('how effective is caching? (routes without a cache are excluded)', () => {
    expect(s.cacheHitRate).toContain('1/5');
  });

  it('how long does inference take? (cache hits excluded)', () => {
    expect(s.inferenceLatencyMs.overall.p50).not.toBeNull();
    expect(s.inferenceLatencyMs.successfulAttemptByModel.b?.n).toBe(2);
  });

  it('breaks attempt failures down by reason', () => {
    expect(s.attemptOutcomes['MODEL_FAILED/MODEL_NOT_FOUND']).toBe(1);
    expect(s.attemptOutcomes['NETWORK_ERROR/TIMEOUT']).toBe(1);
  });

  it('percentile handles empty and single values', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([7], 95)).toBe(7);
  });

  it('handles an empty log without dividing by zero', () => {
    expect(summarize([]).failureRate).toBe('n/a');
  });
});
