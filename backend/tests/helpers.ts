import type { Express } from 'express';
import type { DestinationStream } from 'pino';
import { createApp, type AppDeps } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config';
import { TokenError, type TokenVerifier } from '../src/auth/tokenVerifier';
import { createLogger } from '../src/logger';
import { ProviderError, type FailureCategory, type GenerateRequest, type GenerativeProvider } from '../src/ai/provider';

/** Looks like a real Google key so scrubbing rules are exercised. Must never appear in any output. */
export const SENTINEL_KEY = 'AIzaSyTESTSENTINEL_must_never_leak_0123456789';

export const baseEnv = (over: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  GEMINI_API_KEY: SENTINEL_KEY,
  FIREBASE_PROJECT_ID: 'test-project',
  LOG_SALT: 'test-salt-test-salt-test-salt',
  GEMINI_MODEL_CHAIN: 'model-a,model-b,model-c,model-d',
  ...over,
});

export const testConfig = (over: Record<string, string> = {}): AppConfig => loadConfig(baseEnv(over));

export interface LogSink {
  stream: DestinationStream;
  lines: () => Record<string, any>[];
  raw: () => string;
}

export function makeLogSink(): LogSink {
  const chunks: string[] = [];
  return {
    stream: { write: (msg: string) => void chunks.push(msg) },
    lines: () => chunks.join('').split('\n').filter(Boolean).map((l) => JSON.parse(l)),
    raw: () => chunks.join(''),
  };
}

/** Maps a token string to a verified uid or a failure. */
export function makeVerifier(
  tokens: Record<string, { uid: string } | 'expired' | 'invalid' | Error> = {},
): TokenVerifier {
  return async (token) => {
    const entry = tokens[token];
    if (!entry) throw new TokenError('invalid');
    if (entry === 'expired') throw new TokenError('expired');
    if (entry === 'invalid') throw new TokenError('invalid');
    if (entry instanceof Error) throw entry;
    return entry;
  };
}

// ── Scripted fake Gemini provider ────────────────────────────────────────────

export type Step = string | ProviderError | Error | ((req: GenerateRequest) => Promise<{ text: string }>);

export interface FakeProvider extends GenerativeProvider {
  calls: GenerateRequest[];
}

/** Each call consumes the next step. `repeatLast` reuses the final step forever. */
export function scriptedProvider(steps: Step[], opts: { repeatLast?: boolean } = {}): FakeProvider {
  let i = 0;
  const calls: GenerateRequest[] = [];
  return {
    calls,
    async generate(req) {
      calls.push(req);
      const idx = opts.repeatLast ? Math.min(i, steps.length - 1) : i;
      i += 1;
      const step = steps[idx];
      if (step === undefined) throw new ProviderError('MODEL_FAILED', 'SCRIPT_EXHAUSTED');
      if (typeof step === 'function') return step(req);
      if (typeof step === 'string') return { text: step };
      throw step;
    },
  };
}

export const providerFailure = (category: FailureCategory, reason = 'TEST', status?: number, detail = '') =>
  new ProviderError(category, reason, status, detail);

// ── Model output fixtures ────────────────────────────────────────────────────

export const goodItem = (over: Record<string, unknown> = {}) => ({
  itemName: 'Dal Makhani',
  portionCategory: '1 bowl',
  confidence: 0.9,
  estimatedNutrition: { calories: 320, carbs: 30, protein: 12, fat: 16, servingSize: '1 bowl' },
  ...over,
});

export const goodModelJson = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    itemName: 'Dal Makhani',
    searchHint: 'dal makhani',
    portionCategory: '1 bowl',
    confidence: 0.9,
    isPackaged: false,
    brandName: null,
    imageNotes: 'A bowl of dal',
    estimatedNutrition: { calories: 320, carbs: 30, protein: 12, fat: 16, servingSize: '1 bowl' },
    items: [goodItem()],
    ...over,
  });

// ── Image builders (magic bytes only; content need not be a decodable image) ─

const HEADERS = {
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  webp: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
} as const;

let imageCounter = 0;
/** A unique image per call so each has a distinct content hash (unless `seed` repeats). */
export function makeImage(kind: keyof typeof HEADERS = 'jpeg', seed: number = ++imageCounter): { base64: string; mimeType: string } {
  const body = Buffer.alloc(64);
  body.writeUInt32BE(seed, 0);
  const bytes = Buffer.concat([Buffer.from(HEADERS[kind]), body]);
  const mimeType = kind === 'jpeg' ? 'image/jpeg' : kind === 'png' ? 'image/png' : 'image/webp';
  return { base64: bytes.toString('base64'), mimeType };
}

// ── App factory ──────────────────────────────────────────────────────────────

export interface TestApp {
  app: Express;
  sink: LogSink;
  config: AppConfig;
  provider: FakeProvider;
}

export function makeTestApp(
  over: Partial<Omit<AppDeps, 'provider'>> & { env?: Record<string, string>; provider?: FakeProvider } = {},
): TestApp {
  const sink = makeLogSink();
  const config = over.config ?? testConfig(over.env);
  const provider = over.provider ?? scriptedProvider([goodModelJson()], { repeatLast: true });
  const app = createApp({
    config,
    logger: createLogger({ destination: sink.stream }),
    verifyToken: makeVerifier({ 'good-token': { uid: 'user-1' }, 'other-token': { uid: 'user-2' } }),
    fetchImpl: over.fetchImpl,
    now: over.now,
    ...(over.repo ? { repo: over.repo } : {}),
    ...(over.checkDatabase ? { checkDatabase: over.checkDatabase } : {}),
    ...(over.verifyToken ? { verifyToken: over.verifyToken } : {}),
    provider,
  });
  return { app, sink, config, provider };
}
