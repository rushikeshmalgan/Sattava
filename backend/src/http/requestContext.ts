import type { Logger } from '../logger';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Server-generated correlation ID (never taken from the client). */
      id: string;
      /** Child logger bound to `requestId`. */
      log: Logger;
      /** Set only by requireAuth from a *verified* Firebase ID token. */
      auth?: { uid: string };
    }
  }
}

export {};
