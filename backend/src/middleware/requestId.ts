import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from '../logger';
import '../http/requestContext';

/** IDs are always server-generated; a client-supplied ID would be spoofable in logs. */
export const requestId =
  (logger: Logger): RequestHandler =>
  (req, res, next) => {
    req.id = randomUUID();
    req.log = logger.child({ requestId: req.id });
    res.setHeader('X-Request-Id', req.id);
    next();
  };
