import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, toEnvelope } from '../http/errors';
import { scrub } from '../observability';
import '../http/requestContext';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

const isBodyParserError = (err: unknown): err is BodyParserError =>
  err instanceof Error && typeof (err as BodyParserError).type === 'string' && typeof (err as BodyParserError).status === 'number';

/** MongoDB driver errors that mean "cannot reach the database right now" rather than "this request is wrong". */
const DATABASE_UNREACHABLE = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoTopologyClosedError',
  'MongoNotConnectedError',
  'MongoPoolClearedError',
]);

const toApiError = (err: unknown, secrets: readonly string[]): ApiError => {
  if (err instanceof ApiError) return err;

  if (isBodyParserError(err)) {
    if (err.type === 'entity.too.large') return new ApiError(413, 'PAYLOAD_TOO_LARGE');
    return new ApiError(400, 'INVALID_REQUEST', { internal: { parser: err.type } });
  }

  if (err instanceof Error && DATABASE_UNREACHABLE.has(err.name)) {
    return new ApiError(503, 'DATABASE_UNAVAILABLE', {
      internal: { name: err.name, message: scrub(err.message, secrets) },
    });
  }

  // Unknown failure: log details internally, expose nothing.
  return new ApiError(500, 'INTERNAL_ERROR', {
    internal: {
      name: err instanceof Error ? err.name : typeof err,
      message: scrub(err instanceof Error ? err.message : String(err), secrets),
    },
  });
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND'));

export interface ErrorHandlerDeps {
  hashUid: (uid: string) => string;
  /** Exact strings that must never appear in logs (e.g. the API key). */
  secrets: readonly string[];
}

/** Every error becomes { error: { code, message, requestId } }. */
export const errorHandler =
  (deps: ErrorHandlerDeps): ErrorRequestHandler =>
  (err, req, res, next) => {
    if (res.headersSent) return next(err);

    const apiError = toApiError(err, deps.secrets);
    const level = apiError.status >= 500 ? 'error' : 'warn';
    req.log[level]({
      event: 'request.rejected',
      method: req.method,
      path: req.path,
      status: apiError.status,
      errorCode: apiError.code,
      uidHash: req.auth ? deps.hashUid(req.auth.uid) : undefined,
      ...apiError.options.internal,
    });

    if (apiError.options.retryAfter) res.set('Retry-After', String(apiError.options.retryAfter));
    res.set('Cache-Control', 'no-store');
    res.status(apiError.status).json(toEnvelope(apiError.code, req.id));
  };
