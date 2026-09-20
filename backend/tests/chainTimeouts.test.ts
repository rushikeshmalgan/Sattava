/**
 * The chain's time bounds, exercised through the REAL REST provider with a fake
 * fetch that honours AbortSignal like the real one. Proves a hung Gemini call is
 * actually cut off and the request stays inside its deadline.
 */
import { runModelChain } from '../src/ai/chain';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { parseVisionText } from '../src/ai/normalize/vision';
import { DailyBudget } from '../src/middleware/rateLimit';
import { SENTINEL_KEY, goodModelJson } from './helpers';

const okResponse = (text: string) =>
  ({ ok: true, status: 200, text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) }) as unknown as Response;

/** Never answers; rejects with the signal's reason when aborted, exactly like fetch. */
const hangUntilAborted = (_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

const run = (fetchImpl: typeof fetch, over: { chain?: string[]; attemptTimeoutMs: number; deadlineMs: number }) =>
  runModelChain({
    chain: over.chain ?? ['slow', 'fast'],
    provider: createGeminiRestProvider({ apiKey: SENTINEL_KEY, fetchImpl }),
    parts: [{ text: 'analyse' }],
    parse: parseVisionText,
    attemptTimeoutMs: over.attemptTimeoutMs,
    deadlineMs: over.deadlineMs,
    budget: new DailyBudget(1000),
  });

describe('provider timeouts', () => {
  it('aborts a hung request when the signal fires and reports a TIMEOUT network failure', async () => {
    const provider = createGeminiRestProvider({ apiKey: SENTINEL_KEY, fetchImpl: hangUntilAborted as unknown as typeof fetch });
    const error = await provider
      .generate({ model: 'm', parts: [{ text: 'x' }], signal: AbortSignal.timeout(30) })
      .catch((e) => e);
    expect(error).toMatchObject({ category: 'NETWORK_ERROR', reason: 'TIMEOUT' });
  });
});

describe('runModelChain time bounds', () => {
  it('cuts off a hung model after the per-attempt timeout and falls through to the next', async () => {
    const fetchImpl = jest
      .fn()
      .mockImplementationOnce(hangUntilAborted)
      .mockImplementationOnce(async () => okResponse(goodModelJson())) as unknown as typeof fetch;

    const startedAt = Date.now();
    const result = await run(fetchImpl, { attemptTimeoutMs: 60, deadlineMs: 5_000 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.model).toBe('fast');
    expect(result.attempts[0]).toMatchObject({ model: 'slow', outcome: 'NETWORK_ERROR', reason: 'TIMEOUT' });
    expect(result.attempts[0]!.latencyMs).toBeLessThan(1_000);
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it('stays inside the total deadline even when every model hangs', async () => {
    const fetchImpl = jest.fn(hangUntilAborted) as unknown as typeof fetch;

    const startedAt = Date.now();
    const result = await run(fetchImpl, { chain: ['a', 'b', 'c', 'd'], attemptTimeoutMs: 10_000, deadlineMs: 150 });
    const elapsed = Date.now() - startedAt;

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe('UNAVAILABLE');
    expect(elapsed).toBeLessThan(1_500); // deadline 150 ms, not 4 x 10 s
    expect(result.attempts.map((a) => a.outcome)).toContain('DEADLINE_EXCEEDED');
    expect((fetchImpl as unknown as jest.Mock).mock.calls.length).toBeLessThan(4);
  });

  it('a slow first model does not consume the whole deadline when the attempt timeout is shorter', async () => {
    const fetchImpl = jest
      .fn()
      .mockImplementationOnce(hangUntilAborted)
      .mockImplementationOnce(hangUntilAborted)
      .mockImplementationOnce(async () => okResponse(goodModelJson())) as unknown as typeof fetch;

    const result = await run(fetchImpl, { chain: ['a', 'b', 'c'], attemptTimeoutMs: 40, deadlineMs: 5_000 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.model).toBe('c');
  });
});
