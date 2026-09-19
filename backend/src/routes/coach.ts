import { Router } from 'express';
import type { AppConfig } from '../config';
import { ApiError } from '../http/errors';
import { runModelChain, type ChainFailureKind, type ParseResult } from '../ai/chain';
import { textGenerationConfig } from '../ai/generationConfig';
import { summarizeIssues } from '../ai/json';
import {
  COACH_PROMPT_VERSION,
  TEXT_TASK_LIMITS,
  buildDailyTip,
  buildDietInsight,
  buildDietScoreExplanation,
  buildProfilePlan,
  buildVoiceCoach,
  buildWeeklyReport,
} from '../ai/coachPrompts';
import { parseProfilePlan, parseTextOutput } from '../ai/normalize/coach';
import type { GenerativeProvider } from '../ai/provider';
import { CoachRequestSchema, CoachResponseSchema, type CoachRequest, type CoachResponse } from '../ai/schemas/coach';
import type { DailyBudget } from '../middleware/rateLimit';
import { logAiRequest } from '../observability';
import '../http/requestContext';

export interface CoachRouterDeps {
  config: AppConfig;
  provider: GenerativeProvider;
  budget: DailyBudget;
  hashUid: (uid: string) => string;
  now: () => number;
}

const FAILURE_TO_ERROR: Record<ChainFailureKind, { status: number; code: 'AI_UNAVAILABLE' | 'AI_INVALID_OUTPUT' }> = {
  KEY_INVALID: { status: 503, code: 'AI_UNAVAILABLE' },
  UNAVAILABLE: { status: 503, code: 'AI_UNAVAILABLE' },
  INVALID_OUTPUT: { status: 502, code: 'AI_INVALID_OUTPUT' },
};

interface Prepared {
  prompt: string;
  temperature: number;
  parse: (text: string) => ParseResult<{ text: string } | { plan: NonNullable<Extract<CoachResponse, { plan: unknown }>['plan']> }>;
}

function prepare(req: CoachRequest): Prepared {
  switch (req.task) {
    case 'profile_plan':
      return { prompt: buildProfilePlan(req.input), temperature: 0.7, parse: parseProfilePlan };
    case 'diet_insight':
      return textTask(req.task, buildDietInsight(req.input));
    case 'daily_tip':
      return textTask(req.task, buildDailyTip(req.input));
    case 'diet_score_explanation':
      return textTask(req.task, buildDietScoreExplanation(req.input));
    case 'weekly_report':
      return textTask(req.task, buildWeeklyReport(req.input));
    case 'voice_coach':
      return textTask(req.task, buildVoiceCoach(req.input));
  }
}

function textTask(task: keyof typeof TEXT_TASK_LIMITS, prompt: string): Prepared {
  const limits = TEXT_TASK_LIMITS[task];
  return { prompt, temperature: limits.temperature, parse: (text) => parseTextOutput(text, limits) };
}

/** Mounted behind auth + rate limits + a small route-scoped body parser (see app.ts). */
export function createCoachRouter(deps: CoachRouterDeps): Router {
  const router = Router();

  router.post('/generate', async (req, res, next) => {
    const started = deps.now();
    const uidHash = deps.hashUid(req.auth!.uid);

    try {
      const body = CoachRequestSchema.safeParse(req.body);
      if (!body.success) {
        throw new ApiError(400, 'INVALID_REQUEST', { internal: { issues: summarizeIssues(body.error.issues) } });
      }
      const task = body.data.task;
      const prepared = prepare(body.data);

      const result = await runModelChain({
        chain: deps.config.modelChain,
        provider: deps.provider,
        parts: [{ text: prepared.prompt }],
        generationConfig: textGenerationConfig(deps.config, prepared.temperature),
        parse: prepared.parse,
        attemptTimeoutMs: deps.config.attemptTimeoutMs,
        deadlineMs: deps.config.aiDeadlineMs,
        budget: deps.budget,
        now: deps.now,
        secrets: [deps.config.geminiApiKey],
      });

      const event = {
        event: 'ai.request' as const,
        requestId: req.id,
        route: `coach.${task}`,
        uidHash,
        promptVersion: COACH_PROMPT_VERSION,
        cache: 'n/a' as const,
        attempts: result.attempts,
        latencyMs: deps.now() - started,
      };

      if (!result.ok) {
        const mapped = FAILURE_TO_ERROR[result.kind];
        logAiRequest(req.log, { ...event, finalModel: null, outcome: 'error', errorCode: mapped.code, status: mapped.status });
        throw new ApiError(mapped.status, mapped.code, { internal: { chainFailure: result.kind, task } });
      }

      logAiRequest(req.log, {
        ...event,
        finalModel: result.model,
        outcome: 'success',
        errorCode: null,
        status: 200,
        validation: { warnings: result.warnings },
      });

      const meta = { model: result.model, promptVersion: COACH_PROMPT_VERSION, requestId: req.id };
      const payload =
        'plan' in result.value ? { task, plan: result.value.plan, meta } : { task, text: result.value.text, meta };
      // Re-validating the outgoing body guards the public contract against drift.
      res.set('Cache-Control', 'no-store').json(CoachResponseSchema.parse(payload));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
