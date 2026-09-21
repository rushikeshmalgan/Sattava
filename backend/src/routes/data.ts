import { Router, type Request, type RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { summarizeIssues } from '../ai/json';
import { isReasonableDate } from '../data/dates';
import { DayLimitError, type DataRepository } from '../data/repository';
import { DateId, EntryBody, EntryId, ListQuery, SyncUserBody, UserPatchBody } from '../data/schemas';
import { ApiError } from '../http/errors';
import '../http/requestContext';

export interface DataRouterDeps {
  repo: DataRepository;
  now?: () => number;
}

/** Express 4 does not catch a rejected promise, so every handler goes through this. */
const handler =
  (fn: (req: Request) => Promise<unknown>): RequestHandler =>
  async (req, res, next) => {
    try {
      const body = await fn(req);
      res.set('Cache-Control', 'no-store').json(body);
    } catch (err) {
      next(err instanceof DayLimitError ? new ApiError(422, 'DAY_LIMIT_EXCEEDED') : err);
    }
  };

/** Validates against a strict schema; the details are logged, never sent back. */
const parse = <T>(schema: ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(400, 'INVALID_REQUEST', { internal: { issues: summarizeIssues(result.error.issues) } });
  }
  return result.data;
};

/** The owner of everything in a request. It comes only from the verified token. */
const uidOf = (req: Request): string => {
  if (!req.auth) throw new ApiError(401, 'UNAUTHENTICATED');
  return req.auth.uid;
};

/**
 * Users and daily logs. Mounted behind requireAuth and the per-user limiter (see app.ts); no path or body
 * carries an identity, and the repository puts the verified uid in every query.
 */
export function createDataRouter(deps: DataRouterDeps): Router {
  const { repo } = deps;
  const now = deps.now ?? Date.now;
  const router = Router();

  const dateParam = (req: Request): string => {
    const date = parse(DateId, req.params.date);
    if (!isReasonableDate(date, now())) throw new ApiError(400, 'INVALID_REQUEST', { internal: { reason: 'DATE_OUT_OF_RANGE' } });
    return date;
  };

  router.get(
    '/me',
    handler(async (req) => ({ user: await repo.getUser(uidOf(req)) })),
  );

  router.post(
    '/me/sync',
    handler(async (req) => ({ user: await repo.syncUser(uidOf(req), parse(SyncUserBody, req.body)) })),
  );

  router.patch(
    '/me',
    handler(async (req) => ({ user: await repo.patchUser(uidOf(req), parse(UserPatchBody, req.body)) })),
  );

  router.get(
    '/logs',
    handler(async (req) => ({ logs: await repo.listDays(uidOf(req), parse(ListQuery, req.query)) })),
  );

  router.get(
    '/logs/:date',
    handler(async (req) => ({ log: await repo.getDay(uidOf(req), dateParam(req)) })),
  );

  router.post(
    '/logs/:date/entries',
    handler(async (req) => ({ log: await repo.addEntry(uidOf(req), dateParam(req), parse(EntryBody, req.body)) })),
  );

  router.delete(
    '/logs/:date/entries/:entryId',
    handler(async (req) => {
      const log = await repo.removeEntry(uidOf(req), dateParam(req), parse(EntryId, req.params.entryId));
      if (!log) throw new ApiError(404, 'NOT_FOUND');
      return { log };
    }),
  );

  router.post(
    '/demo-data',
    handler(async (req) => ({ days: await repo.loadDemoDays(uidOf(req)) })),
  );

  return router;
}
