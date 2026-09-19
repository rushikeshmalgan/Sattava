import type { Express } from 'express';
import type { DestinationStream } from 'pino';
import { createApp, type AppDeps } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config';
import { TokenError, type TokenVerifier } from '../src/auth/tokenVerifier';
import { createLogger } from '../src/logger';

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

export interface TestApp {
  app: Express;
  sink: LogSink;
  config: AppConfig;
}

export function makeTestApp(over: Partial<AppDeps> & { env?: Record<string, string> } = {}): TestApp {
  const sink = makeLogSink();
  const config = over.config ?? testConfig(over.env);
  const app = createApp({
    config,
    logger: createLogger({ destination: sink.stream }),
    verifyToken: makeVerifier({ 'good-token': { uid: 'user-1' } }),
    ...over,
  });
  return { app, sink, config };
}
