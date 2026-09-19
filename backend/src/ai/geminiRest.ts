import { scrub } from '../observability';
import { classifyHttpFailure, classifyNetworkFailure } from './classify';
import { ProviderError, type GenerateRequest, type GenerativeProvider } from './provider';

interface GeminiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: { reason?: string }[];
  };
}

interface GeminiSuccessBody {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string; thought?: boolean }[] };
  }[];
  promptFeedback?: { blockReason?: string };
}

export interface GeminiRestOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

/**
 * Plain REST client for the Gemini generateContent API. The key travels in a
 * header (never the URL) and is scrubbed from any error detail we keep.
 */
export function createGeminiRestProvider(opts: GeminiRestOptions): GenerativeProvider {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  const clean = (text: string) => scrub(text, [opts.apiKey]);

  return {
    async generate(req: GenerateRequest) {
      let res: Response;
      let raw: string;
      try {
        res = await fetchImpl(`${baseUrl}/models/${encodeURIComponent(req.model)}:generateContent`, {
          method: 'POST',
          headers: { 'x-goog-api-key': opts.apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: req.parts }],
            ...(req.generationConfig ? { generationConfig: req.generationConfig } : {}),
          }),
          signal: req.signal,
        });
        raw = await res.text();
      } catch (err) {
        const { category, reason } = classifyNetworkFailure(err);
        throw new ProviderError(category, reason, undefined, clean(err instanceof Error ? err.message : String(err)));
      }

      if (!res.ok) {
        let body: GeminiErrorBody = {};
        try {
          body = JSON.parse(raw) as GeminiErrorBody;
        } catch {
          /* non-JSON error body; fall through with status only */
        }
        const message = body.error?.message ?? '';
        const { category, reason } = classifyHttpFailure({
          status: res.status,
          providerStatus: body.error?.status,
          reasons: (body.error?.details ?? []).map((d) => d.reason ?? '').filter(Boolean),
          message,
        });
        throw new ProviderError(category, reason, res.status, clean(message));
      }

      let body: GeminiSuccessBody;
      try {
        body = JSON.parse(raw) as GeminiSuccessBody;
      } catch {
        throw new ProviderError('MODEL_FAILED', 'UNPARSEABLE_PROVIDER_BODY', res.status);
      }

      const candidate = body.candidates?.[0];
      const text = (candidate?.content?.parts ?? [])
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text as string)
        .join('');

      if (!text.trim()) {
        const blocked = body.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY';
        throw new ProviderError('MODEL_FAILED', blocked ? 'CONTENT_BLOCKED' : 'EMPTY_RESPONSE', res.status);
      }
      return { text };
    },
  };
}
