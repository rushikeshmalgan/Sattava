import cors from 'cors';
import express, { type Express } from 'express';
import type { AppConfig } from './config';
import type { Logger } from './logger';
import type { TokenVerifier } from './auth/tokenVerifier';
import { createUidHasher } from './observability';
import { requestId } from './middleware/requestId';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createFoodsRouter } from './routes/foods';
import './http/requestContext';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  verifyToken: TokenVerifier;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/**
 * Builds the Express app from injected dependencies. Nothing here reads
 * process.env or talks to a real provider, so tests can supply fakes and each
 * call gets fresh limiter/cache state.
 */
export function createApp(deps: AppDeps): Express {
  const { config, logger } = deps;
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

  app.use(notFoundHandler);
  app.use(
    errorHandler({
      hashUid: createUidHasher(config.logSalt),
      secrets: [config.geminiApiKey],
    }),
  );

  return app;
}
