import { Router } from 'express';
import type { AppConfig } from '../config';
import { ApiError } from '../http/errors';
import { runModelChain, type ChainFailureKind } from '../ai/chain';
import { LruTtlCache, visionCacheKey } from '../ai/cache';
import { validateImage } from '../ai/imageValidation';
import { summarizeIssues } from '../ai/json';
import { parseVisionText } from '../ai/normalize/vision';
import type { GenerativeProvider } from '../ai/provider';
import { VisionRequestSchema, VisionResponseSchema, type VisionAnalysis } from '../ai/schemas/vision';
import { VISION_PROMPT, VISION_PROMPT_VERSION } from '../ai/visionPrompt';
import type { DailyBudget } from '../middleware/rateLimit';
import { logAiRequest, type AiRequestEvent, type AttemptRecord } from '../observability';
import '../http/requestContext';

export interface CachedVision {
  analysis: VisionAnalysis;
  model: string;
}

export interface VisionRouterDeps {
  config: AppConfig;
  provider: GenerativeProvider;
  cache: LruTtlCache<CachedVision>;
  budget: DailyBudget;
  hashUid: (uid: string) => string;
  now: () => number;
}

const ROUTE = 'vision.analyze-food';

const FAILURE_TO_ERROR: Record<ChainFailureKind, { status: number; code: 'AI_UNAVAILABLE' | 'AI_INVALID_OUTPUT' }> = {
  KEY_INVALID: { status: 503, code: 'AI_UNAVAILABLE' }, // our misconfiguration; never revealed to the client
  UNAVAILABLE: { status: 503, code: 'AI_UNAVAILABLE' },
  INVALID_OUTPUT: { status: 502, code: 'AI_INVALID_OUTPUT' },
};

/** Mounted behind auth + rate limits + a route-scoped body parser (see app.ts). */
export function createVisionRouter(deps: VisionRouterDeps): Router {
  const router = Router();

  router.post('/analyze-food', async (req, res, next) => {
    const started = deps.now();
    // requireAuth ran first, so this is the verified uid. Nothing from the body is used as identity.
    const uidHash = deps.hashUid(req.auth!.uid);

    const emit = (fields: Pick<AiRequestEvent, 'cache' | 'attempts' | 'finalModel' | 'outcome' | 'errorCode' | 'status'> &
      Partial<Pick<AiRequestEvent, 'imageBytes' | 'validation'>>) =>
      logAiRequest(req.log, {
        event: 'ai.request',
        requestId: req.id,
        route: ROUTE,
        uidHash,
        promptVersion: VISION_PROMPT_VERSION,
        latencyMs: deps.now() - started,
        ...fields,
      });

    try {
      const body = VisionRequestSchema.safeParse(req.body);
      if (!body.success) {
        throw new ApiError(400, 'INVALID_REQUEST', { internal: { issues: summarizeIssues(body.error.issues) } });
      }
      const image = validateImage(body.data.image, body.data.mimeType);

      const key = visionCacheKey(image.sha256, image.mimeType, VISION_PROMPT_VERSION);
      const hit = deps.cache.get(key);
      if (hit) {
        emit({
          cache: 'hit',
          attempts: [],
          finalModel: hit.model,
          outcome: 'success',
          errorCode: null,
          status: 200,
          imageBytes: image.bytes.length,
        });
        return void res
          .set('Cache-Control', 'no-store')
          .json(respond(hit, true, req.id));
      }

      const result = await runModelChain({
        chain: deps.config.modelChain,
        provider: deps.provider,
        parts: [{ text: VISION_PROMPT }, { inlineData: { mimeType: image.mimeType, data: body.data.image } }],
        // responseMimeType is intentionally not set for vision: some model versions
        // reject it and return an empty response. JSON is enforced by validation instead.
        generationConfig: { temperature: 0.1 },
        parse: parseVisionText,
        attemptTimeoutMs: deps.config.attemptTimeoutMs,
        deadlineMs: deps.config.aiDeadlineMs,
        budget: deps.budget,
        now: deps.now,
        secrets: [deps.config.geminiApiKey],
      });

      if (!result.ok) {
        const mapped = FAILURE_TO_ERROR[result.kind];
        emit({
          cache: 'miss',
          attempts: result.attempts,
          finalModel: null,
          outcome: 'error',
          errorCode: mapped.code,
          status: mapped.status,
          imageBytes: image.bytes.length,
        });
        throw new ApiError(mapped.status, mapped.code, { internal: { chainFailure: result.kind } });
      }

      const value: CachedVision = { analysis: result.value.analysis, model: result.model };
      deps.cache.set(key, value); // only validated successes are ever cached
      emit({
        cache: 'miss',
        attempts: result.attempts as AttemptRecord[],
        finalModel: result.model,
        outcome: 'success',
        errorCode: null,
        status: 200,
        imageBytes: image.bytes.length,
        validation: { warnings: result.warnings },
      });
      res.set('Cache-Control', 'no-store').json(respond(value, false, req.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function respond(value: CachedVision, cached: boolean, requestId: string) {
  // Re-validating the outgoing body guards the public contract against drift.
  return VisionResponseSchema.parse({
    analysis: value.analysis,
    meta: { model: value.model, cached, promptVersion: VISION_PROMPT_VERSION, requestId },
  });
}
