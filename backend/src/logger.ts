import pino, { type DestinationStream, type Logger } from 'pino';

export type { Logger };

/**
 * Structured JSON logger. Secrets that could reach a log line by accident are
 * redacted at the serializer level as a second line of defence; callers must
 * still avoid passing them in the first place.
 */
export function createLogger(options: { level?: string; destination?: DestinationStream } = {}): Logger {
  return pino(
    {
      level: options.level ?? 'info',
      base: { service: 'sattava-backend' },
      redact: {
        paths: [
          'authorization',
          'headers.authorization',
          'req.headers.authorization',
          '*.authorization',
          'apiKey',
          '*.apiKey',
          'GEMINI_API_KEY',
          'MONGODB_URI',
          'mongoUri',
          'uri',
          '*.uri',
        ],
        censor: '[REDACTED]',
      },
    },
    options.destination,
  );
}
