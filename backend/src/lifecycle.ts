import type { Server } from 'node:http';
import type { Logger } from './logger';

/**
 * Longer than any proxy's idle timeout. Node's default keep-alive (5 s) is
 * shorter than a typical load balancer's, so the proxy can reuse a connection
 * Node has just closed and the client sees an intermittent 502.
 */
export const KEEP_ALIVE_TIMEOUT_MS = 120_000;
/** Must exceed keepAliveTimeout, or Node can drop a reused connection early. */
export const HEADERS_TIMEOUT_MS = KEEP_ALIVE_TIMEOUT_MS + 1_000;

/**
 * How long in-flight requests get to finish after SIGTERM. Render allows about
 * 30 s before SIGKILL, and a vision request is bounded by AI_DEADLINE_MS (30 s
 * by default), so the slowest request may be cut off rather than left hanging.
 */
export const SHUTDOWN_GRACE_MS = 25_000;

export function configureServerTimeouts(server: Server): void {
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
}

export interface ShutdownOptions {
  logger: Logger;
  timeoutMs?: number;
  /** Injected so tests can observe the exit code instead of ending the process. */
  exit?: (code: number) => void;
}

/**
 * Returns a shutdown function: stop accepting connections, let in-flight
 * requests finish, then exit 0. If they do not finish within timeoutMs, sockets
 * are closed and the exit code is 1. Safe to call more than once.
 */
export function createShutdown(server: Server, options: ShutdownOptions): (signal: string) => Promise<void> {
  const { logger, timeoutMs = SHUTDOWN_GRACE_MS, exit = (code: number) => process.exit(code) } = options;
  let inProgress: Promise<void> | null = null;

  return (signal: string) => {
    if (inProgress) return inProgress;

    logger.info({ event: 'server.shutdown_started', signal });
    inProgress = new Promise<void>((resolve) => {
      // Exactly one outcome: a clean drain, or a forced exit. Closing sockets on the forced
      // path lets server.close() complete afterwards; that must not exit a second time.
      let settled = false;
      const settle = (code: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(forceTimer);
        exit(code);
        resolve();
      };

      const forceTimer = setTimeout(() => {
        if (settled) return;
        logger.warn({ event: 'server.shutdown_forced', timeoutMs });
        server.closeAllConnections();
        settle(1);
      }, timeoutMs);
      forceTimer.unref();

      server.close((err) => {
        if (settled) return;
        if (err) logger.error({ event: 'server.shutdown_error', message: err.message });
        logger.info({ event: 'server.shutdown_complete' });
        settle(err ? 1 : 0);
      });
      // Idle keep-alive sockets would otherwise hold server.close() open until they time out.
      server.closeIdleConnections();
    });
    return inProgress;
  };
}
