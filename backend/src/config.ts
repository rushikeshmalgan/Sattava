import { z } from 'zod';

const csv = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const intWithDefault = (def: number) => z.coerce.number().int().positive().default(def);

// Exported so a test can check that .env.example documents exactly these variables.
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: intWithDefault(3000),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL_CHAIN: z
    .string()
    .default('gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash'),
  GEMINI_THINKING_LEVEL: z.enum(['minimal', 'low', 'off']).default('minimal'),
  GEMINI_ATTEMPT_TIMEOUT_MS: intWithDefault(12_000),
  AI_DEADLINE_MS: intWithDefault(30_000),
  AI_DAILY_ATTEMPT_BUDGET: intWithDefault(3_000),

  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  LOG_SALT: z.string().min(16, 'LOG_SALT must be at least 16 characters'),

  CORS_ORIGINS: z.string().default(''),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),

  VISION_RATE_PER_MINUTE: intWithDefault(6),
  VISION_RATE_PER_DAY: intWithDefault(60),
  COACH_RATE_PER_MINUTE: intWithDefault(20),
  COACH_RATE_PER_DAY: intWithDefault(200),
  // Per client IP, for ALL /api/v1 traffic including the data API, checked before the token. Many people can share
  // one address (a campus or office network), so this is a coarse backstop; the per-user limits do the fine work.
  AI_IP_RATE_PER_MINUTE: intWithDefault(300),
  FOODS_IP_RATE_PER_MINUTE: intWithDefault(30),
  DATA_RATE_PER_MINUTE: intWithDefault(120),

  // Optional in the schema so the AI scripts (check:models, smoke:*) run without a database; the server itself
  // refuses to start without it (see index.ts). The value is a secret: it is never logged or echoed.
  MONGODB_URI: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .refine((uri) => /^mongodb(\+srv)?:\/\//.test(uri), 'MONGODB_URI must start with mongodb:// or mongodb+srv://')
      .optional(),
  ),
  MONGODB_DB: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,63}$/, 'MONGODB_DB may contain only letters, digits, _ and -')
    .default('sattava'),

  FATSECRET_CLIENT_ID: z.string().optional(),
  FATSECRET_CLIENT_SECRET: z.string().optional(),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  geminiApiKey: string;
  modelChain: string[];
  thinkingLevel: 'minimal' | 'low' | 'off';
  attemptTimeoutMs: number;
  aiDeadlineMs: number;
  aiDailyAttemptBudget: number;
  firebaseProjectId: string;
  logSalt: string;
  corsOrigins: string[];
  trustProxyHops: number;
  limits: {
    visionPerMinute: number;
    visionPerDay: number;
    coachPerMinute: number;
    coachPerDay: number;
    aiIpPerMinute: number;
    foodsIpPerMinute: number;
    dataPerMinute: number;
  };
  /** Null when MONGODB_URI is not set. */
  mongo: { uri: string; dbName: string } | null;
  fatSecret: { clientId: string; clientSecret: string } | null;
}

/** Thrown for misconfiguration. Lists variable NAMES only, never values. */
export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new ConfigError(`Invalid server configuration:\n${problems.join('\n')}`);
  }
  const e = parsed.data;
  const modelChain = csv(e.GEMINI_MODEL_CHAIN);
  if (modelChain.length === 0) {
    throw new ConfigError('Invalid server configuration:\n  - GEMINI_MODEL_CHAIN: must list at least one model');
  }

  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    geminiApiKey: e.GEMINI_API_KEY,
    modelChain,
    thinkingLevel: e.GEMINI_THINKING_LEVEL,
    attemptTimeoutMs: e.GEMINI_ATTEMPT_TIMEOUT_MS,
    aiDeadlineMs: e.AI_DEADLINE_MS,
    aiDailyAttemptBudget: e.AI_DAILY_ATTEMPT_BUDGET,
    firebaseProjectId: e.FIREBASE_PROJECT_ID,
    logSalt: e.LOG_SALT,
    corsOrigins: csv(e.CORS_ORIGINS),
    trustProxyHops: e.TRUST_PROXY_HOPS,
    limits: {
      visionPerMinute: e.VISION_RATE_PER_MINUTE,
      visionPerDay: e.VISION_RATE_PER_DAY,
      coachPerMinute: e.COACH_RATE_PER_MINUTE,
      coachPerDay: e.COACH_RATE_PER_DAY,
      aiIpPerMinute: e.AI_IP_RATE_PER_MINUTE,
      foodsIpPerMinute: e.FOODS_IP_RATE_PER_MINUTE,
      dataPerMinute: e.DATA_RATE_PER_MINUTE,
    },
    mongo: e.MONGODB_URI ? { uri: e.MONGODB_URI, dbName: e.MONGODB_DB } : null,
    fatSecret:
      e.FATSECRET_CLIENT_ID && e.FATSECRET_CLIENT_SECRET
        ? { clientId: e.FATSECRET_CLIENT_ID, clientSecret: e.FATSECRET_CLIENT_SECRET }
        : null,
  };
}
