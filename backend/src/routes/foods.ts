import { Router, type RequestHandler } from 'express';
import type { Logger } from '../logger';
import { fetchPublicIp } from '../net/publicIp';
import { SlidingWindowLimiter, byIp, rateLimit } from '../middleware/rateLimit';
import '../http/requestContext';

/*
 * FatSecret search proxy.
 *
 * Calls here spend the operator's FatSecret quota, so a verified Firebase ID token is required, exactly as
 * for the AI and data routes. The cheap per-IP limit runs first, so an anonymous flood never reaches token
 * verification.
 *
 * LEGACY CONTRACT (unchanged on purpose): the mobile fatSecretService parses error bodies as
 * `{ error: string, code: string }`, so this router does NOT use the /api/v1 error envelope. The one
 * exception is a rejected token, which the shared error handler answers with the /api/v1 envelope.
 */

const MAX_QUERY_LENGTH = 100;
const DANGEROUS_CHARS_RE = /[<>'"`;\\{}[\]]/g;

type QueryValidation = { valid: true; sanitized: string } | { valid: false; error: string };

export function validateSearchQuery(raw: unknown): QueryValidation {
  if (!raw || typeof raw !== 'string') return { valid: false, error: 'Query parameter is required' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Query cannot be empty' };
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` };
  }
  const sanitized = trimmed.replace(DANGEROUS_CHARS_RE, '');
  if (sanitized.length === 0) return { valid: false, error: 'Query contains only invalid characters' };
  return { valid: true, sanitized };
}

export interface FoodsRouterDeps {
  fatSecret: { clientId: string; clientSecret: string } | null;
  /** Establishes req.auth from the Bearer token, or fails the request. */
  requireAuth: RequestHandler;
  ipRatePerMinute: number;
  logger: Logger;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export function createFoodsRouter(deps: FoodsRouterDeps): Router {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const router = Router();
  let tokenCache: { token: string | null; expiresAt: number } = { token: null, expiresAt: 0 };

  async function getToken(creds: { clientId: string; clientSecret: string }): Promise<string> {
    if (tokenCache.token && now() < tokenCache.expiresAt - 30_000) return tokenCache.token;

    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');
    const response = await fetchImpl('https://oauth.fatsecret.com/connect/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials&scope=basic',
    });
    if (!response.ok) throw new Error(`FatSecret token fetch failed: ${response.status}`);
    const data = (await response.json()) as { access_token: string; expires_in?: number };
    tokenCache = { token: data.access_token, expiresAt: now() + (data.expires_in ?? 86400) * 1000 };
    return data.access_token;
  }

  const limiter = new SlidingWindowLimiter(60_000, deps.ipRatePerMinute, now);

  router.get(
    '/search',
    rateLimit({
      limiter,
      key: byIp,
      scope: 'foods-ip',
      onLimited: (_req, res, retryAfter) => {
        res.set('Retry-After', String(retryAfter));
        res.status(429).json({
          error: `Too many requests. Please wait ${retryAfter}s before trying again.`,
          code: 'RATE_LIMITED',
          retryAfter,
        });
      },
    }),
    deps.requireAuth,
    async (req, res) => {
      if (!deps.fatSecret) {
        return res
          .status(503)
          .json({ error: 'Food search is not configured on this server.', code: 'FATSECRET_NOT_CONFIGURED' });
      }

      try {
        const validation = validateSearchQuery(req.query.query);
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error, code: 'INVALID_QUERY' });
        }

        const token = await getToken(deps.fatSecret);
        const url =
          'https://platform.fatsecret.com/rest/server.api?method=foods.search' +
          `&search_expression=${encodeURIComponent(validation.sanitized)}&format=json&max_results=15`;

        const response = await fetchImpl(url, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        const data = (await response.json()) as {
          error?: { code?: number; message?: string };
          foods?: { food?: unknown };
        };

        if (data.error) {
          const errMsg = data.error.message || 'Unknown FatSecret error';
          req.log.error({ event: 'foods.upstream_error', upstreamCode: data.error.code, upstreamMessage: errMsg });

          if (data.error.code === 21 || errMsg.toLowerCase().includes('invalid ip')) {
            const publicIp = await fetchPublicIp();
            req.log.error({
              event: 'foods.ip_restricted',
              publicIp,
              hint: 'Whitelist this IP at platform.fatsecret.com -> API Settings -> IP Restrictions',
            });
            return res.status(502).json({
              error: `IP address blocked by FatSecret. Whitelist ${publicIp || 'your public IP'} at platform.fatsecret.com → API Settings → IP Restrictions.`,
              code: 'IP_RESTRICTED',
              publicIp,
            });
          }
          return res.status(502).json({ error: errMsg, code: 'FATSECRET_ERROR' });
        }

        // FatSecret returns a single match as an object, not an array.
        let foods = data.foods?.food;
        if (!foods) foods = [];
        if (!Array.isArray(foods)) foods = [foods];
        res.json(foods);
      } catch (error) {
        req.log.error({ event: 'foods.proxy_error', message: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ error: 'Internal server error. Please try again shortly.', code: 'SERVER_ERROR' });
      }
    },
  );

  return router;
}
