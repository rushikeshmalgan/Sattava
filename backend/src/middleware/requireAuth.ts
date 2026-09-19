import type { RequestHandler } from 'express';
import { ApiError } from '../http/errors';
import { TokenError, type TokenVerifier } from '../auth/tokenVerifier';
import '../http/requestContext';

const BEARER_RE = /^Bearer\s+(\S+)$/i;
const MAX_TOKEN_LENGTH = 4096;

/**
 * Establishes identity from a verified Firebase ID token.
 * `req.auth.uid` is the ONLY trusted identity; nothing in the request body,
 * query or non-Authorization headers is ever used to identify the user.
 */
export const requireAuth =
  (verify: TokenVerifier): RequestHandler =>
  async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header) throw new ApiError(401, 'UNAUTHENTICATED');

      const match = BEARER_RE.exec(header);
      if (!match || !match[1] || match[1].length > MAX_TOKEN_LENGTH) {
        throw new ApiError(401, 'UNAUTHENTICATED');
      }

      try {
        const { uid } = await verify(match[1]);
        req.auth = { uid };
      } catch (err) {
        if (err instanceof TokenError) {
          throw new ApiError(401, err.kind === 'expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
        }
        throw err;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
