import { auth } from '../firebaseConfig';
import { getApiBaseUrl } from '../config/api';
import type { AiErrorCode, CoachInputs, CoachTextTask, ProfilePlanDto, ServerErrorCode, VisionApiResponse } from '../types/ai';
import { isCoachPlanResponse, isCoachTextResponse, isVisionApiResponse } from './aiContract';

/** Server timeouts are 30s total; leave headroom for a Render cold start. */
const VISION_TIMEOUT_MS = 45_000;
const COACH_TIMEOUT_MS = 30_000;

/** Server rejects images over 5 MB decoded; fail fast instead of uploading ~7 MB to be refused. */
export const MAX_UPLOAD_BASE64_CHARS = Math.floor((5 * 1024 * 1024 * 4) / 3);

export class AiApiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly status?: number,
    public readonly requestId?: string,
    /** Seconds, from Retry-After. */
    public readonly retryAfter?: number,
  ) {
    super(code);
    this.name = 'AiApiError';
  }
}

const SERVER_CODES: readonly ServerErrorCode[] = [
  'INVALID_REQUEST', 'INVALID_IMAGE', 'UNAUTHENTICATED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED', 'AI_INVALID_OUTPUT', 'AI_UNAVAILABLE', 'NOT_FOUND', 'INTERNAL_ERROR',
];

async function getIdToken(forceRefresh: boolean): Promise<string> {
  const user = auth?.currentUser;
  if (!user) throw new AiApiError('NOT_SIGNED_IN');
  // getIdToken() returns the cached token and refreshes it automatically when near expiry.
  return user.getIdToken(forceRefresh);
}

async function toApiError(res: Response): Promise<AiApiError> {
  const retryAfter = Number(res.headers.get('retry-after')) || undefined;
  try {
    const body = (await res.json()) as { error?: { code?: string; requestId?: string } };
    const code = body?.error?.code;
    if (code && (SERVER_CODES as readonly string[]).includes(code)) {
      return new AiApiError(code as ServerErrorCode, res.status, body.error?.requestId, retryAfter);
    }
  } catch {
    /* not our JSON envelope (e.g. a platform gateway page during a cold start) */
  }
  // Gateway-level failures mean the AI service could not be reached.
  const code: ServerErrorCode = res.status === 502 || res.status === 503 || res.status === 504 ? 'AI_UNAVAILABLE' : 'INTERNAL_ERROR';
  return new AiApiError(code, res.status, undefined, retryAfter);
}

async function post<T>(path: string, body: unknown, timeoutMs: number, accept: (json: unknown) => json is T): Promise<T> {
  let baseUrl: string;
  try {
    baseUrl = getApiBaseUrl();
  } catch {
    throw new AiApiError('CONFIG');
  }

  // At most one retry, and only to recover from an expired ID token.
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getIdToken(attempt > 0);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new AiApiError((err as { name?: string })?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    } finally {
      clearTimeout(timer);
    }

    if (res.ok) {
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new AiApiError('INVALID_RESPONSE', res.status);
      }
      if (!accept(json)) throw new AiApiError('INVALID_RESPONSE', res.status);
      return json;
    }

    const error = await toApiError(res);
    if (error.code === 'TOKEN_EXPIRED' && attempt === 0) continue;
    throw error;
  }
  throw new AiApiError('TOKEN_EXPIRED');
}

export const requestFoodAnalysis = (imageBase64: string, mimeType: string): Promise<VisionApiResponse> => {
  if (imageBase64.length > MAX_UPLOAD_BASE64_CHARS) return Promise.reject(new AiApiError('IMAGE_TOO_LARGE'));
  return post('/api/v1/vision/analyze-food', { image: imageBase64, mimeType }, VISION_TIMEOUT_MS, isVisionApiResponse);
};

export const requestCoachText = async <T extends CoachTextTask>(task: T, input: CoachInputs[T]): Promise<string> => {
  const res = await post('/api/v1/coach/generate', { task, input }, COACH_TIMEOUT_MS, isCoachTextResponse);
  return res.text;
};

export const requestProfilePlan = async (input: CoachInputs['profile_plan']): Promise<ProfilePlanDto> => {
  const res = await post('/api/v1/coach/generate', { task: 'profile_plan', input }, COACH_TIMEOUT_MS, isCoachPlanResponse);
  return res.plan;
};
