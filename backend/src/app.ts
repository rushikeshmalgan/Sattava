import cors from 'cors';
import express, { Router, type Express } from 'express';
import type { AppConfig } from './config';
import type { Logger } from './logger';
import type { TokenVerifier } from './auth/tokenVerifier';
import type { GenerativeProvider } from './ai/provider';
import { LruTtlCache } from './ai/cache';
import { createUidHasher } from './observability';
import { requestId } from './middleware/requestId';
import { requireAuth } from './middleware/requireAuth';
import { DailyBudget, SlidingWindowLimiter, byIp, byVerifiedUid, rateLimit } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createFoodsRouter } from './routes/foods';
import { createCoachRouter } from './routes/coach';
import { createVisionRouter, type CachedVision } from './routes/vision';
import { createDataRouter } from './routes/data';
import type { DataRepository } from './data/repository';
import { secretsFromUri } from './db/mongo';
import './http/requestContext';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  verifyToken: TokenVerifier;
  provider: GenerativeProvider;
  /** Users and daily logs. When absent the data routes are not mounted (the AI routes never need it). */
  repo?: DataRepository;
  /** Throws when the database cannot be reached; backs GET /health/ready. */
  checkDatabase?: () => Promise<void>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// 5 MB decoded -> ~6.7 MB base64 (+ JSON envelope). Scoped to the vision route only.
const VISION_BODY_LIMIT = '7mb';

// Coach requests are small structured inputs (numbers/enums, one 300-char transcript).
const COACH_BODY_LIMIT = '16kb';

// Data writes are a single small entry or profile patch.
const DATA_BODY_LIMIT = '32kb';

// Where the Expo web dev server runs. Allowed by default in development only, so trying the app in a browser works
// without configuration; production and tests allow no browser origin unless CORS_ORIGINS names it.
const DEV_WEB_ORIGINS = ['http://localhost:8081', 'http://localhost:19006'];

const VISION_CACHE_ENTRIES = 200;
const VISION_CACHE_TTL_MS = 24 * 60 * MINUTE;

/**
 * Builds the Express app from injected dependencies. Nothing here reads
 * process.env or talks to a real provider, so tests can supply fakes and each
 * call gets fresh limiter/cache state.
 */
export function createApp(deps: AppDeps): Express {
  const { config, logger } = deps;
  const now = deps.now ?? Date.now;
  const hashUid = createUidHasher(config.logSalt);
  const app = express();

  app.disable('x-powered-by');
  // Behind Render's proxy, req.ip must come from the trusted hop, not from a
  // client-supplied X-Forwarded-For (which is spoofable).
  app.set('trust proxy', config.trustProxyHops);

  app.use(requestId(logger));

  // Native apps do not use CORS. An allowlist exists for Expo web: CORS_ORIGINS, or in development the dev server.
  const corsOrigin = config.corsOrigins.length > 0 ? config.corsOrigins : config.nodeEnv === 'development' ? DEV_WEB_ORIGINS : false;
  app.use(cors({ origin: corsOrigin }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Liveness (/health) must not depend on the database, or a database blip restarts a healthy server.
  // This one says whether the data routes can work right now.
  app.get('/health/ready', async (_req, res) => {
    if (!deps.checkDatabase) return res.json({ status: 'ok', database: 'not configured' });
    try {
      await deps.checkDatabase();
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unreachable' });
    }
  });

  app.use(
    '/api/foods',
    createFoodsRouter({
      fatSecret: config.fatSecret,
      requireAuth: requireAuth(deps.verifyToken),
      ipRatePerMinute: config.limits.foodsIpPerMinute,
      logger,
      fetchImpl: deps.fetchImpl,
      now: deps.now,
    }),
  );

  // ── /api/v1: authenticated AI gateway ──────────────────────────────────────
  // Order matters: cheap IP limit -> identity -> per-user limits -> body parsing.
  // Unauthenticated callers are rejected before the server buffers any large body.
  const budget = new DailyBudget(config.aiDailyAttemptBudget, now);
  const v1 = Router();
  v1.use(
    rateLimit({
      limiter: new SlidingWindowLimiter(MINUTE, config.limits.aiIpPerMinute, now),
      key: byIp,
      scope: 'ai-ip',
    }),
    requireAuth(deps.verifyToken),
  );

  v1.use(
    '/vision',
    rateLimit({ limiter: new SlidingWindowLimiter(MINUTE, config.limits.visionPerMinute, now), key: byVerifiedUid, scope: 'vision-uid-minute' }),
    rateLimit({ limiter: new SlidingWindowLimiter(DAY, config.limits.visionPerDay, now), key: byVerifiedUid, scope: 'vision-uid-day' }),
    express.json({ limit: VISION_BODY_LIMIT }),
    createVisionRouter({
      config,
      provider: deps.provider,
      cache: new LruTtlCache<CachedVision>(VISION_CACHE_ENTRIES, VISION_CACHE_TTL_MS, now),
      budget,
      hashUid,
      now,
    }),
  );
  v1.use(
    '/coach',
    rateLimit({ limiter: new SlidingWindowLimiter(MINUTE, config.limits.coachPerMinute, now), key: byVerifiedUid, scope: 'coach-uid-minute' }),
    rateLimit({ limiter: new SlidingWindowLimiter(DAY, config.limits.coachPerDay, now), key: byVerifiedUid, scope: 'coach-uid-day' }),
    express.json({ limit: COACH_BODY_LIMIT }),
    createCoachRouter({ config, provider: deps.provider, budget, hashUid, now }),
  );
  if (deps.repo) {
    // The limiter and body parser are scoped to the data paths; the router itself is mounted without a prefix
    // because Express strips a mount path, and its routes carry their full paths (/me, /logs/:date, ...).
    v1.use(
      ['/me', '/logs', '/demo-data'],
      rateLimit({ limiter: new SlidingWindowLimiter(MINUTE, config.limits.dataPerMinute, now), key: byVerifiedUid, scope: 'data-uid-minute' }),
      express.json({ limit: DATA_BODY_LIMIT }),
    );
    v1.use(createDataRouter({ repo: deps.repo, now }));
  }
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler({ hashUid, secrets: [config.geminiApiKey, ...(config.mongo ? secretsFromUri(config.mongo.uri) : [])] }));

  return app;
}
