import type { DailyBudget } from '../middleware/rateLimit';
import type { AttemptRecord } from '../observability';
import { scrub } from '../observability';
import { ProviderError, type GenerationConfig, type GenerativeProvider, type Part } from './provider';

export type ParseFailureOutcome = 'INVALID_JSON' | 'SCHEMA_INVALID' | 'OUT_OF_BOUNDS';

export type ParseResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; outcome: ParseFailureOutcome; issues?: { path: string; code: string }[] };

export interface ChainOptions<T> {
  /** Ordered best-first. Each model is tried only if the previous one failed. */
  chain: readonly string[];
  provider: GenerativeProvider;
  parts: Part[];
  generationConfig?: GenerationConfig;
  /** Turns model text into a validated value. A failure here counts as a failed attempt. */
  parse: (text: string) => ParseResult<T>;
  attemptTimeoutMs: number;
  deadlineMs: number;
  budget: DailyBudget;
  now?: () => number;
  /** Exact strings to strip from anything we keep. */
  secrets?: readonly string[];
}

export type ChainFailureKind = 'KEY_INVALID' | 'INVALID_OUTPUT' | 'UNAVAILABLE';

export type ChainResult<T> =
  | { ok: true; value: T; model: string; attempts: AttemptRecord[]; warnings: string[] }
  | { ok: false; kind: ChainFailureKind; attempts: AttemptRecord[] };

/**
 * Ordered model fallback (same design as the client's old tryModels):
 *   model A -> fail -> model B -> fail -> ...
 * Two deliberate differences:
 *  - Validation happens INSIDE each attempt, so malformed or out-of-bounds
 *    output from one model falls through to the next instead of ending the request.
 *  - Bounded by per-attempt timeouts, a total deadline, and a global budget.
 * Only an invalid API key aborts early, since every model would fail the same way.
 */
export async function runModelChain<T>(opts: ChainOptions<T>): Promise<ChainResult<T>> {
  const now = opts.now ?? Date.now;
  const attempts: AttemptRecord[] = [];
  const deadline = AbortSignal.timeout(opts.deadlineMs);
  let sawInvalidOutput = false;

  for (const model of opts.chain) {
    if (deadline.aborted) {
      attempts.push({ model, outcome: 'DEADLINE_EXCEEDED', latencyMs: 0 });
      break;
    }
    if (!opts.budget.tryConsume()) {
      attempts.push({ model, outcome: 'BUDGET_EXHAUSTED', latencyMs: 0 });
      break;
    }

    const started = now();
    const signal = AbortSignal.any([AbortSignal.timeout(opts.attemptTimeoutMs), deadline]);

    try {
      const { text } = await opts.provider.generate({
        model,
        parts: opts.parts,
        generationConfig: opts.generationConfig,
        signal,
      });
      const parsed = opts.parse(text);

      if (parsed.ok) {
        attempts.push({ model, outcome: 'OK', latencyMs: now() - started });
        return { ok: true, value: parsed.value, model, attempts, warnings: parsed.warnings ?? [] };
      }

      sawInvalidOutput = true;
      attempts.push({ model, outcome: parsed.outcome, latencyMs: now() - started, issues: parsed.issues });
    } catch (err) {
      const latencyMs = now() - started;
      if (err instanceof ProviderError) {
        attempts.push({
          model,
          outcome: err.category,
          latencyMs,
          providerStatus: err.httpStatus,
          reason: err.reason,
          detail: err.detail ? scrub(err.detail, opts.secrets ?? [], 160) : undefined,
        });
        if (err.category === 'API_KEY_INVALID') return { ok: false, kind: 'KEY_INVALID', attempts };
        continue;
      }
      // A provider bug or unexpected throw: treat as a model failure and keep going.
      attempts.push({
        model,
        outcome: 'MODEL_FAILED',
        latencyMs,
        reason: 'UNEXPECTED_EXCEPTION',
        detail: scrub(err instanceof Error ? err.message : String(err), opts.secrets ?? [], 160),
      });
    }
  }

  return { ok: false, kind: sawInvalidOutput ? 'INVALID_OUTPUT' : 'UNAVAILABLE', attempts };
}
