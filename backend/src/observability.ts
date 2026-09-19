import { createHmac } from 'node:crypto';
import type { Logger } from './logger';

/**
 * Anonymised, stable identifier for a user in logs: HMAC(uid, LOG_SALT).
 * Lets us count distinct users and spot abuse without storing raw Firebase UIDs.
 */
export const createUidHasher =
  (salt: string) =>
  (uid: string): string =>
    createHmac('sha256', salt).update(uid).digest('hex').slice(0, 16);

const GOOGLE_KEY_RE = /AIza[0-9A-Za-z_-]{20,}/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;

/**
 * Removes anything that looks like a credential from free text before it is
 * logged. `secrets` are exact strings (e.g. the configured API key) to strip.
 */
export function scrub(text: string, secrets: readonly string[] = [], maxLength = 200): string {
  let out = text;
  for (const s of secrets) {
    if (s) out = out.split(s).join('[REDACTED]');
  }
  out = out.replace(GOOGLE_KEY_RE, '[REDACTED]').replace(BEARER_RE, 'Bearer [REDACTED]');
  return out.length > maxLength ? `${out.slice(0, maxLength)}…` : out;
}

export type AttemptOutcome =
  | 'OK'
  | 'API_KEY_INVALID'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'MODEL_FAILED'
  | 'INVALID_JSON'
  | 'SCHEMA_INVALID'
  | 'OUT_OF_BOUNDS'
  | 'BUDGET_EXHAUSTED'
  | 'DEADLINE_EXCEEDED';

export interface AttemptRecord {
  model: string;
  outcome: AttemptOutcome;
  latencyMs: number;
  providerStatus?: number;
  /** Short machine-readable reason (e.g. MODEL_NOT_FOUND). */
  reason?: string;
  /** Scrubbed, truncated provider message. Never contains keys. */
  detail?: string;
  /** Zod issue paths/codes only; never the offending values. */
  issues?: { path: string; code: string }[];
}

/**
 * One line per AI request. Answers: how often does Gemini fail, which fallback
 * model serves failures, how long does inference take, how often does
 * validation reject output, how effective is the cache.
 * Never contains: images, prompts, model output text, tokens, API keys.
 */
export interface AiRequestEvent {
  event: 'ai.request';
  requestId: string;
  route: string;
  uidHash: string;
  promptVersion: string;
  cache: 'hit' | 'miss' | 'n/a';
  attempts: AttemptRecord[];
  finalModel: string | null;
  outcome: 'success' | 'error';
  errorCode: string | null;
  status: number;
  latencyMs: number;
  imageBytes?: number;
  validation?: { warnings: string[] };
}

export function logAiRequest(log: Logger, event: AiRequestEvent): void {
  log[event.outcome === 'success' ? 'info' : 'warn'](event);
}
