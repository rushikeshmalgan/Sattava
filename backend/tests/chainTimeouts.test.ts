/**
 * The chain's time bounds, exercised through the REAL REST provider with a fake
 * fetch that honours AbortSignal like the real one. Proves a hung Gemini call is
 * actually cut off and the request stays inside its deadline.
 */
import v8 from 'node:v8';
import vm from 'node:vm';
import { runModelChain } from '../src/ai/chain';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { parseVisionText } from '../src/ai/normalize/vision';
import { DailyBudget } from '../src/middleware/rateLimit';
import { SENTINEL_KEY, goodModelJson } from './helpers';

// Jest does not run with --expose-gc, so switch it on for this process to be able to force collections.
v8.setFlagsFromString('--expose-gc');
const collectGarbage = vm.runInNewContext('gc') as () => void;

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

  // The next two force garbage collection while a request hangs. Their bounds are generous (seconds) on purpose:
  // all that matters is telling "the cap fired" from "the request ran to the deadline", and a loaded machine or a slow
  // CI runner must not turn that into a flaky assertion.
  it('still cuts off a hung model when garbage collection runs during the attempt', async () => {
    // On Node 22 an AbortSignal.timeout() that nothing references can be collected inside AbortSignal.any()
    // and then never fires. The per-attempt cap was silently lost, and a hung model ran until the total
    // deadline (seen as a 29 s vision attempt with a 12 s cap). Short tests never noticed because no
    // collection happened in their window, so this forces collections while the request hangs.
    const collector = setInterval(collectGarbage, 25);
    try {
      const fetchImpl = jest
        .fn()
        .mockImplementationOnce(hangUntilAborted)
        .mockImplementationOnce(async () => okResponse(goodModelJson())) as unknown as typeof fetch;

      const startedAt = Date.now();
      const result = await run(fetchImpl, { attemptTimeoutMs: 300, deadlineMs: 12_000 });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.model).toBe('fast');
      expect(result.attempts[0]).toMatchObject({ model: 'slow', outcome: 'NETWORK_ERROR', reason: 'TIMEOUT' });
      expect(Date.now() - startedAt).toBeLessThan(10_000); // the 300 ms cap, not the 12 s deadline
    } finally {
      clearInterval(collector);
    }
  }, 40_000);

  it('still enforces the total deadline when garbage collection runs and every model hangs', async () => {
    const collector = setInterval(collectGarbage, 25);
    try {
      const fetchImpl = jest.fn(hangUntilAborted) as unknown as typeof fetch;

      const startedAt = Date.now();
      const result = await run(fetchImpl, { chain: ['a', 'b', 'c', 'd'], attemptTimeoutMs: 30_000, deadlineMs: 300 });

      expect(result.ok).toBe(false);
      expect(Date.now() - startedAt).toBeLessThan(15_000); // the 300 ms deadline, not a single 30 s attempt
    } finally {
      clearInterval(collector);
    }
  }, 40_000);
});
