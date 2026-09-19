import os from 'node:os';
import path from 'node:path';
import dotenv from 'dotenv';
import { createApp } from './app';
import { ConfigError, loadConfig } from './config';
import { createGeminiRestProvider } from './ai/geminiRest';
import { createFirebaseTokenVerifier } from './firebaseAdmin';
import { createLogger } from './logger';
import { fetchPublicIp } from './net/publicIp';

// backend/.env wins; the repo-root .env is a fallback for FatSecret dev creds only.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const logger = createLogger({ level: process.env.LOG_LEVEL ?? 'info' });

async function main(): Promise<void> {
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

  app.listen(config.port, '0.0.0.0', async () => {
    logger.info({
      event: 'server.started',
      port: config.port,
      modelChain: config.modelChain,
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
}

void main();
