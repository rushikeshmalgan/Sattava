import type { CoachInputs, CoachTextTask, ProfilePlanDto, VisionApiResponse } from '../types/ai';
import { isCoachPlanResponse, isCoachTextResponse, isVisionApiResponse } from './aiContract';
import { ApiError, apiRequest } from './apiClient';

/** The AI calls report failures with the same error type as every other API call. */
export { ApiError as AiApiError };

/** Server timeouts are 30s total; leave headroom for a Render cold start. */
const VISION_TIMEOUT_MS = 45_000;
const COACH_TIMEOUT_MS = 30_000;

/** Server rejects images over 5 MB decoded; fail fast instead of uploading ~7 MB to be refused. */
export const MAX_UPLOAD_BASE64_CHARS = Math.floor((5 * 1024 * 1024 * 4) / 3);

export const requestFoodAnalysis = (imageBase64: string, mimeType: string): Promise<VisionApiResponse> => {
  if (imageBase64.length > MAX_UPLOAD_BASE64_CHARS) return Promise.reject(new ApiError('IMAGE_TOO_LARGE'));
  return apiRequest('POST', '/api/v1/vision/analyze-food', {
    body: { image: imageBase64, mimeType },
    timeoutMs: VISION_TIMEOUT_MS,
    accept: isVisionApiResponse,
  });
};

export const requestCoachText = async <T extends CoachTextTask>(task: T, input: CoachInputs[T]): Promise<string> => {
  const res = await apiRequest('POST', '/api/v1/coach/generate', {
    body: { task, input },
    timeoutMs: COACH_TIMEOUT_MS,
    accept: isCoachTextResponse,
  });
  return res.text;
};

export const requestProfilePlan = async (input: CoachInputs['profile_plan']): Promise<ProfilePlanDto> => {
  const res = await apiRequest('POST', '/api/v1/coach/generate', {
    body: { task: 'profile_plan', input },
    timeoutMs: COACH_TIMEOUT_MS,
    accept: isCoachPlanResponse,
  });
  return res.plan;
};
