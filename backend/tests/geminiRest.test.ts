import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { ProviderError } from '../src/ai/provider';
import { SENTINEL_KEY } from './helpers';

const respond = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as unknown as Response;

const call = (fetchImpl: typeof fetch) =>
  createGeminiRestProvider({ apiKey: SENTINEL_KEY, fetchImpl }).generate({
    model: 'model-a',
    parts: [{ text: 'hi' }],
    signal: new AbortController().signal,
  });

const catchErr = async (fetchImpl: typeof fetch): Promise<ProviderError> => {
  try {
    await call(fetchImpl);
  } catch (e) {
    return e as ProviderError;
  }
  throw new Error('expected rejection');
};

describe('createGeminiRestProvider', () => {
  it('sends the key in a header, never in the URL', async () => {
    const fetchImpl = jest.fn(async () => respond(200, { candidates: [{ content: { parts: [{ text: 'ok' }] } }] }));
    await call(fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain(SENTINEL_KEY);
    expect(url).toContain('/models/model-a:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(SENTINEL_KEY);
  });

  it('joins text parts and ignores thought parts', async () => {
    const out = await call((async () =>
      respond(200, { candidates: [{ content: { parts: [{ text: 'thinking', thought: true }, { text: '{"a":' }, { text: '1}' }] } }] })) as unknown as typeof fetch);
    expect(out.text).toBe('{"a":1}');
  });

  it('classifies a bad key returned as HTTP 400 API_KEY_INVALID', async () => {
    const err = await catchErr((async () =>
      respond(400, { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] } })) as unknown as typeof fetch);
    expect(err.category).toBe('API_KEY_INVALID');
  });

  it('classifies a retired model (404) as a per-model failure so the chain continues', async () => {
    const err = await catchErr((async () =>
      respond(404, { error: { code: 404, status: 'NOT_FOUND', message: 'This model is no longer available.' } })) as unknown as typeof fetch);
    expect(err).toMatchObject({ category: 'MODEL_FAILED', reason: 'MODEL_NOT_FOUND', httpStatus: 404 });
  });

  it('classifies 429 as RATE_LIMITED and 503 as an overloaded model', async () => {
    expect((await catchErr((async () => respond(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'quota' } })) as unknown as typeof fetch)).category).toBe('RATE_LIMITED');
    expect((await catchErr((async () => respond(503, { error: { status: 'UNAVAILABLE', message: 'high demand' } })) as unknown as typeof fetch)).reason).toBe('MODEL_OVERLOADED');
  });

  it('maps fetch failures to NETWORK_ERROR', async () => {
    const err = await catchErr((async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch);
    expect(err.category).toBe('NETWORK_ERROR');
  });

  it('scrubs the API key out of kept error detail', async () => {
    const err = await catchErr((async () =>
      respond(500, { error: { message: `boom while calling with ${SENTINEL_KEY} attached` } })) as unknown as typeof fetch);
    expect(err.detail).not.toContain(SENTINEL_KEY);
    expect(err.detail).toContain('[REDACTED]');
  });

  it('treats a safety-blocked or empty response as a model failure', async () => {
    const blocked = await catchErr((async () => respond(200, { promptFeedback: { blockReason: 'SAFETY' }, candidates: [] })) as unknown as typeof fetch);
    expect(blocked).toMatchObject({ category: 'MODEL_FAILED', reason: 'CONTENT_BLOCKED' });
    const empty = await catchErr((async () => respond(200, { candidates: [{ content: { parts: [{ text: '   ' }] } }] })) as unknown as typeof fetch);
    expect(empty.reason).toBe('EMPTY_RESPONSE');
  });
});
