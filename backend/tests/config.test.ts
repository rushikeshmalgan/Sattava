import { ConfigError, loadConfig } from '../src/config';
import { SENTINEL_KEY, baseEnv } from './helpers';

const load = (over: Record<string, string> = {}) => loadConfig(baseEnv(over));
const message = (over: Record<string, string | undefined>): string => {
  try {
    loadConfig({ ...baseEnv(), ...over } as NodeJS.ProcessEnv);
  } catch (err) {
    expect(err).toBeInstanceOf(ConfigError);
    return (err as Error).message;
  }
  throw new Error('expected loadConfig to throw');
};

describe('loadConfig: required variables', () => {
  it.each(['GEMINI_API_KEY', 'FIREBASE_PROJECT_ID', 'LOG_SALT'])('fails fast, naming %s, when it is missing', (name) => {
    expect(message({ [name]: undefined })).toContain(name);
  });

  it('rejects a LOG_SALT shorter than 16 characters', () => {
    expect(message({ LOG_SALT: 'short' })).toContain('LOG_SALT');
  });

  it('reports variable NAMES only: a secret value never appears in the error', () => {
    const shortSalt = 'tooshort-secret';
    const msg = message({ LOG_SALT: shortSalt, PORT: 'not-a-port' });
    expect(msg).toContain('PORT');
    expect(msg).not.toContain(shortSalt);
    expect(msg).not.toContain('not-a-port');
    expect(msg).not.toContain(SENTINEL_KEY);
  });
});

describe('loadConfig: defaults', () => {
  const { GEMINI_MODEL_CHAIN: _omit, ...withoutChain } = baseEnv();
  const defaults = loadConfig(withoutChain);

  it('has safe production defaults', () => {
    expect(defaults).toMatchObject({
      port: 3000,
      thinkingLevel: 'minimal',
      attemptTimeoutMs: 12_000,
      aiDeadlineMs: 30_000,
      aiDailyAttemptBudget: 3_000,
      trustProxyHops: 1,
      corsOrigins: [],
      fatSecret: null,
      limits: { visionPerMinute: 6, visionPerDay: 60, coachPerMinute: 20, coachPerDay: 200, aiIpPerMinute: 300, foodsIpPerMinute: 30 },
    });
  });

  it('ships a non-empty default model chain (the only place model names live in code)', () => {
    expect(defaults.modelChain.length).toBeGreaterThan(0);
    expect(new Set(defaults.modelChain).size).toBe(defaults.modelChain.length);
  });

  it('keeps the total AI deadline above a single attempt, so a fallback can actually run', () => {
    expect(defaults.aiDeadlineMs).toBeGreaterThan(defaults.attemptTimeoutMs);
  });
});

describe('loadConfig: model chain', () => {
  it('keeps order, trims whitespace and drops empty entries', () => {
    expect(load({ GEMINI_MODEL_CHAIN: ' model-x , model-y,, model-z ,' }).modelChain).toEqual(['model-x', 'model-y', 'model-z']);
  });

  it('supports a single-model chain', () => {
    expect(load({ GEMINI_MODEL_CHAIN: 'only-model' }).modelChain).toEqual(['only-model']);
  });

  it.each(['', ' , , '])('rejects a chain with no models (%p)', (value) => {
    expect(message({ GEMINI_MODEL_CHAIN: value })).toContain('GEMINI_MODEL_CHAIN');
  });
});

describe('loadConfig: thinking level', () => {
  it.each(['minimal', 'low', 'off'] as const)('accepts %s', (level) => {
    expect(load({ GEMINI_THINKING_LEVEL: level }).thinkingLevel).toBe(level);
  });

  it.each(['high', 'MINIMAL', '', 'true'])('rejects %p', (level) => {
    expect(message({ GEMINI_THINKING_LEVEL: level })).toContain('GEMINI_THINKING_LEVEL');
  });
});

describe('loadConfig: numbers, proxy and CORS', () => {
  it.each([
    ['PORT', '0'],
    ['PORT', '-1'],
    ['PORT', '3.5'],
    ['GEMINI_ATTEMPT_TIMEOUT_MS', '0'],
    ['AI_DEADLINE_MS', 'abc'],
    ['AI_DAILY_ATTEMPT_BUDGET', '-5'],
    ['VISION_RATE_PER_MINUTE', '0'],
  ])('rejects %s=%p', (name, value) => {
    expect(message({ [name]: value })).toContain(name);
  });

  it('coerces numeric strings (env vars are always strings)', () => {
    expect(load({ PORT: '10000', VISION_RATE_PER_MINUTE: '3' })).toMatchObject({ port: 10000, limits: { visionPerMinute: 3 } });
  });

  it('accepts TRUST_PROXY_HOPS of 0 (no proxy) and rejects negatives', () => {
    expect(load({ TRUST_PROXY_HOPS: '0' }).trustProxyHops).toBe(0);
    expect(message({ TRUST_PROXY_HOPS: '-1' })).toContain('TRUST_PROXY_HOPS');
  });

  it('parses CORS origins as a trimmed list; empty means none', () => {
    expect(load({ CORS_ORIGINS: 'http://localhost:8081, https://app.example.com' }).corsOrigins).toEqual(['http://localhost:8081', 'https://app.example.com']);
    expect(load({ CORS_ORIGINS: '' }).corsOrigins).toEqual([]);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(message({ NODE_ENV: 'staging' })).toContain('NODE_ENV');
  });
});

describe('loadConfig: FatSecret proxy (optional)', () => {
  it('is enabled only when BOTH credentials are set', () => {
    expect(load().fatSecret).toBeNull();
    expect(load({ FATSECRET_CLIENT_ID: 'id' }).fatSecret).toBeNull();
    expect(load({ FATSECRET_CLIENT_SECRET: 'secret' }).fatSecret).toBeNull();
    expect(load({ FATSECRET_CLIENT_ID: 'id', FATSECRET_CLIENT_SECRET: 'secret' }).fatSecret).toEqual({ clientId: 'id', clientSecret: 'secret' });
  });
});
