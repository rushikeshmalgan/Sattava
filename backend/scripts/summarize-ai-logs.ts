/**
 * Answers, from the server's structured logs:
 *   - How often does Gemini fail?
 *   - Which fallback model handles failures?
 *   - How long does inference take?
 *   - How often does validation reject output?
 *   - How effective is caching?
 *
 *   npm run --silent summarize:logs < render-logs.txt
 */
import readline from 'node:readline';

interface Attempt {
  model: string;
  outcome: string;
  latencyMs: number;
  reason?: string;
}

export interface AiEvent {
  event: string;
  route: string;
  cache: 'hit' | 'miss' | 'n/a';
  attempts: Attempt[];
  finalModel: string | null;
  outcome: 'success' | 'error';
  errorCode: string | null;
  latencyMs: number;
}

const VALIDATION_OUTCOMES = new Set(['INVALID_JSON', 'SCHEMA_INVALID', 'OUT_OF_BOUNDS']);
const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((n / d) * 100).toFixed(1)}% (${n}/${d})`);
const inc = (m: Record<string, number>, k: string) => void (m[k] = (m[k] ?? 0) + 1);

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

export function summarize(events: AiEvent[]) {
  const total = events.length;
  const failed = events.filter((e) => e.outcome === 'error');
  const errorCodes: Record<string, number> = {};
  failed.forEach((e) => inc(errorCodes, e.errorCode ?? 'unknown'));

  const freshSuccesses = events.filter((e) => e.outcome === 'success' && e.cache !== 'hit');
  const servedBy: Record<string, number> = {};
  freshSuccesses.forEach((e) => e.finalModel && inc(servedBy, e.finalModel));
  const fellBack = freshSuccesses.filter((e) => e.attempts.length > 1).length;

  const providerRuns = events.filter((e) => e.cache !== 'hit');
  const attempts = events.flatMap((e) => e.attempts);
  const attemptOutcomes: Record<string, number> = {};
  attempts.forEach((a) => inc(attemptOutcomes, a.reason && a.outcome !== 'OK' ? `${a.outcome}/${a.reason}` : a.outcome));

  const responded = attempts.filter((a) => a.outcome === 'OK' || VALIDATION_OUTCOMES.has(a.outcome));
  const rejected = responded.filter((a) => VALIDATION_OUTCOMES.has(a.outcome));

  const cacheable = events.filter((e) => e.cache !== 'n/a');
  const hits = cacheable.filter((e) => e.cache === 'hit').length;

  const okByModel: Record<string, number[]> = {};
  attempts.filter((a) => a.outcome === 'OK').forEach((a) => (okByModel[a.model] ??= []).push(a.latencyMs));
  const successfulAttemptByModel: Record<string, { n: number; p50: number | null; p95: number | null }> = {};
  for (const [model, xs] of Object.entries(okByModel)) {
    successfulAttemptByModel[model] = { n: xs.length, p50: percentile(xs, 50), p95: percentile(xs, 95) };
  }

  const runLatencies = providerRuns.map((e) => e.latencyMs);
  return {
    total,
    failureRate: pct(failed.length, total),
    errorCodes,
    servedBy,
    fallbackRate: pct(fellBack, freshSuccesses.length),
    attemptOutcomes,
    inferenceLatencyMs: {
      overall: { p50: percentile(runLatencies, 50), p95: percentile(runLatencies, 95) },
      successfulAttemptByModel,
    },
    validationRejectionRate: pct(rejected.length, responded.length),
    cacheHitRate: pct(hits, cacheable.length),
  };
}

async function main() {
  const events: AiEvent[] = [];
  for await (const line of readline.createInterface({ input: process.stdin })) {
    try {
      const parsed = JSON.parse(line);
      if (parsed?.event === 'ai.request') events.push(parsed);
    } catch {
      /* not a JSON log line */
    }
  }
  const s = summarize(events);
  console.log(`AI requests: ${s.total}`);
  console.log(`Gemini failure rate (requests ending in error): ${s.failureRate}`);
  console.log(`  by error code: ${JSON.stringify(s.errorCodes)}`);
  console.log(`Served by (fresh, non-cached successes): ${JSON.stringify(s.servedBy)}`);
  console.log(`Requests that needed a fallback model: ${s.fallbackRate}`);
  console.log(`Per-attempt outcomes: ${JSON.stringify(s.attemptOutcomes)}`);
  console.log(`Inference latency (ms, non-cached requests): ${JSON.stringify(s.inferenceLatencyMs.overall)}`);
  console.log(`  successful attempt latency by model: ${JSON.stringify(s.inferenceLatencyMs.successfulAttemptByModel)}`);
  console.log(`Validation rejection rate (responses rejected by schema/bounds): ${s.validationRejectionRate}`);
  console.log(`Cache hit rate (vision): ${s.cacheHitRate}`);
}

if (require.main === module) void main();
