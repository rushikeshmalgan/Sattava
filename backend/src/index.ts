import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config';
import { createGeminiRestProvider } from './ai/geminiRest';
import { createFirebaseTokenVerifier } from './firebaseAdmin';
import { configureServerTimeouts, createShutdown } from './lifecycle';
import { createLogger } from './logger';
import { fetchPublicIp } from './net/publicIp';

// backend/.env wins; the repo-root .env is a fallback for FatSecret dev creds only.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

function main(): void {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      // Names only, never values.
      logger.fatal({ event: 'config.invalid' }, err.message);
      process.exit(1);
    }
    throw err;
  }

  const app = createApp({
    config,
    logger,
    verifyToken: createFirebaseTokenVerifier(config.firebaseProjectId),
    provider: createGeminiRestProvider({ apiKey: config.geminiApiKey }),
  });

  const server = app.listen(config.port, '0.0.0.0', async () => {
    logger.info({
      event: 'server.started',
      port: config.port,
      nodeEnv: config.nodeEnv,
      // Public values, logged so a wrong project (every token would be rejected) or a stale chain is visible.
      firebaseProjectId: config.firebaseProjectId,
      modelChain: config.modelChain,
      thinkingLevel: config.thinkingLevel,
      trustProxyHops: config.trustProxyHops,
      foodsProxyConfigured: config.fatSecret !== null,
    });

    if (config.nodeEnv !== 'production') {
      for (const addrs of Object.values(os.networkInterfaces())) {
        for (const addr of addrs ?? []) {
          if (addr.family === 'IPv4' && !addr.internal) {
            logger.info(`Phone-reachable at http://${addr.address}:${config.port}`);
          }
        }
      }
    }

    if (config.fatSecret) {
      const ip = await fetchPublicIp();
      logger.info({ event: 'server.public_ip', ip, hint: 'Whitelist this IP in FatSecret if the food proxy is used' });
    }
  });

  configureServerTimeouts(server);

  // e.g. EADDRINUSE: fail with a structured log line instead of an unhandled 'error' event.
  server.on('error', (err: NodeJS.ErrnoException) => {
    logger.fatal({ event: 'server.error', code: err.code, message: err.message });
    process.exit(1);
  });

  // Render sends SIGTERM on every deploy: finish in-flight requests, then exit.
  const shutdown = createShutdown(server, { logger });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal));
  }
}

// Log unexpected failures as structured JSON and exit, so the platform restarts a clean process.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ event: 'process.unhandled_rejection', message: errorMessage(reason) });
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ event: 'process.uncaught_exception', message: err.message });
  process.exit(1);
});

main();
