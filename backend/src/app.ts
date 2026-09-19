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
import { createVisionRouter, type CachedVision } from './routes/vision';
import './http/requestContext';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  verifyToken: TokenVerifier;
  provider: GenerativeProvider;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// 5 MB decoded -> ~6.7 MB base64 (+ JSON envelope). Scoped to the vision route only.
const VISION_BODY_LIMIT = '7mb';

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

  // Native apps do not use CORS. An allowlist exists only for Expo web dev.
  app.use(cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : false }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(
    '/api/foods',
    createFoodsRouter({
      fatSecret: config.fatSecret,
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
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler({ hashUid, secrets: [config.geminiApiKey] }));

  return app;
}
