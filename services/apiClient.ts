import { auth } from '../firebaseConfig';
import { getApiBaseUrl } from '../config/api';
import type { AiErrorCode, ServerErrorCode } from '../types/ai';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

/** Every failure of a call to the Sattava API: the server's error code, or a device-side one. */
export class ApiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly status?: number,
    public readonly requestId?: string,
    /** Seconds, from Retry-After. */
    public readonly retryAfter?: number,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

const SERVER_CODES: readonly ServerErrorCode[] = [
  'INVALID_REQUEST', 'INVALID_IMAGE', 'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED', 'AI_INVALID_OUTPUT', 'AI_UNAVAILABLE', 'NOT_FOUND', 'DAY_LIMIT_EXCEEDED', 'DATABASE_UNAVAILABLE',
  'INTERNAL_ERROR',
];

async function getIdToken(forceRefresh: boolean): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new ApiError('NOT_SIGNED_IN');
  // getIdToken() returns the cached token and refreshes it automatically when near expiry.
  return user.getIdToken(forceRefresh);
}

async function toApiError(res: Response): Promise<ApiError> {
  const retryAfter = Number(res.headers.get('retry-after')) || undefined;
  try {
    const body = (await res.json()) as { error?: { code?: string; requestId?: string } };
    const code = body?.error?.code;
    if (code && (SERVER_CODES as readonly string[]).includes(code)) {
      return new ApiError(code as ServerErrorCode, res.status, body.error?.requestId, retryAfter);
    }
  } catch {
    /* not our JSON envelope (e.g. a platform gateway page during a cold start) */
  }
  // Gateway-level failures mean the service could not be reached.
  const code: ServerErrorCode = res.status === 502 || res.status === 503 || res.status === 504 ? 'AI_UNAVAILABLE' : 'INTERNAL_ERROR';
  return new ApiError(code, res.status, undefined, retryAfter);
}

export interface RequestOptions<T> {
  body?: unknown;
  timeoutMs: number;
  /** A type guard for the response body; anything else is an INVALID_RESPONSE. */
  accept: (json: unknown) => json is T;
}

/**
 * One authenticated call to the Sattava API. The identity is the signed-in user's Firebase ID token and nothing
 * else: no user id is ever sent. At most one retry, and only to recover from an expired ID token.
 */
export async function apiRequest<T>(method: HttpMethod, path: string, options: RequestOptions<T>): Promise<T> {
  let baseUrl: string;
  try {
    baseUrl = getApiBaseUrl();
  } catch {
    throw new ApiError('CONFIG');
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getIdToken(attempt > 0);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          Authorization: `Bearer ${token}`,
        },
        ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
        signal: controller.signal,
      });
    } catch (err) {
      throw new ApiError((err as { name?: string })?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new ApiError('INVALID_RESPONSE', res.status);
      }
      if (!options.accept(json)) throw new ApiError('INVALID_RESPONSE', res.status);
      return json;
    }

    const error = await toApiError(res);
    if (error.code === 'TOKEN_EXPIRED' && attempt === 0) continue;
    throw error;
  }
  throw new ApiError('TOKEN_EXPIRED');
}
