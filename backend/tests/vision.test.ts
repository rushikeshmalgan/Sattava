import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { goodItem, goodModelJson, makeImage, makeTestApp, providerFailure, scriptedProvider, SENTINEL_KEY } from './helpers';

const URL = '/api/v1/vision/analyze-food';
const authed = (app: any, body: unknown, token = 'good-token') =>
  request(app).post(URL).set('Authorization', `Bearer ${token}`).send(body as object);
const validBody = (seed?: number) => {
  const img = makeImage('jpeg', seed);
  return { image: img.base64, mimeType: img.mimeType };
};

describe('vision: authentication', () => {
  it('rejects a missing token (401) before touching the provider', async () => {
    const { app, provider } = makeTestApp();
    const res = await request(app).post(URL).send(validBody());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(provider.calls).toHaveLength(0);
  });

  it('rejects an invalid token', async () => {
    const { app } = makeTestApp();
    expect((await authed(app, validBody(), 'forged')).body.error.code).toBe('INVALID_TOKEN');
  });

  it('rejects an expired token with a distinct code the client can act on', async () => {
    const { app } = makeTestApp({ verifyToken: async () => { throw new (require('../src/auth/tokenVerifier').TokenError)('expired'); } });
    expect((await authed(app, validBody())).body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('accepts a valid token', async () => {
    const { app } = makeTestApp();
    expect((await authed(app, validBody())).status).toBe(200);
  });

  it('rejects unauthenticated oversized bodies before parsing them (401, not 413)', async () => {
    // Raw client: superagent errors on the early-close write before reading the response.
    const { app } = makeTestApp();
    const server = app.listen(0);
    const agent = new http.Agent({ keepAlive: true });
    try {
      const { port } = server.address() as AddressInfo;
      const body = JSON.stringify({ image: 'A'.repeat(9 * 1024 * 1024), mimeType: 'image/jpeg' });
      const result = await new Promise<{ status?: number; body: string }>((resolve, reject) => {
        const req = http.request(
          { port, method: 'POST', path: URL, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, agent },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
          },
        );
        req.on('error', reject);
        req.end(body);
      });
      expect(result.status).toBe(401);
      expect(JSON.parse(result.body).error.code).toBe('UNAUTHENTICATED');
    } finally {
      agent.destroy();
      server.close();
    }
  });
});

describe('vision: identity comes only from the verified token', () => {
  it('rejects a body that tries to supply userId/uid (strict schema)', async () => {
    const { app, provider } = makeTestApp();
    for (const extra of [{ userId: 'victim' }, { uid: 'victim' }, { user: { id: 'victim' } }]) {
      const res = await authed(app, { ...validBody(), ...extra });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_REQUEST');
    }
    expect(provider.calls).toHaveLength(0);
  });

  it('logs the hashed VERIFIED uid, never a raw uid', async () => {
    const { app, sink } = makeTestApp();
    await authed(app, validBody(101));
    const line = sink.lines().find((l) => l.event === 'ai.request')!;
    expect(line.uidHash).toMatch(/^[0-9a-f]{16}$/);
    expect(sink.raw()).not.toContain('user-1');
  });

  it('different verified users get different hashes (stable per user)', async () => {
    const { app, sink } = makeTestApp();
    await authed(app, validBody(102), 'good-token');
    await authed(app, validBody(103), 'other-token');
    const hashes = sink.lines().filter((l) => l.event === 'ai.request').map((l) => l.uidHash);
    expect(new Set(hashes).size).toBe(2);
  });
});

describe('vision: request validation', () => {
  it.each([
    ['missing image', { mimeType: 'image/jpeg' }],
    ['missing mimeType', { image: makeImage().base64 }],
    ['empty image', { image: '', mimeType: 'image/jpeg' }],
    ['non-string image', { image: 12345, mimeType: 'image/jpeg' }],
    ['unsupported mimeType', { image: makeImage().base64, mimeType: 'image/gif' }],
    ['empty body', {}],
  ])('400 INVALID_REQUEST: %s', async (_name, body) => {
    const { app, provider } = makeTestApp();
    const res = await authed(app, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(provider.calls).toHaveLength(0);
  });

  it('400 on malformed JSON, inside the error envelope (not Express HTML)', async () => {
    const { app } = makeTestApp();
    const res = await request(app).post(URL).set('Authorization', 'Bearer good-token').set('Content-Type', 'application/json').send('{"image": "abc"');
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('400 on a non-JSON content type', async () => {
    const { app } = makeTestApp();
    const res = await request(app).post(URL).set('Authorization', 'Bearer good-token').set('Content-Type', 'text/plain').send('hello');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  it('413 for an image over the decoded size cap', async () => {
    const { app, provider } = makeTestApp();
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5 * 1024 * 1024 + 10, 1)]).toString('base64');
    const res = await authed(app, { image: big, mimeType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(provider.calls).toHaveLength(0);
  });

  it('413 when the body exceeds the route limit entirely', async () => {
    const { app } = makeTestApp();
    const res = await authed(app, { image: 'A'.repeat(8 * 1024 * 1024), mimeType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it.each([
    ['not base64', { image: 'this is !!! not base64', mimeType: 'image/jpeg' }],
    ['data-URL prefix', { image: `data:image/jpeg;base64,${makeImage().base64}`, mimeType: 'image/jpeg' }],
    ['not an image (plain text bytes)', { image: Buffer.from('hello world, definitely not an image').toString('base64'), mimeType: 'image/jpeg' }],
    ['PNG bytes claimed as JPEG', { image: makeImage('png').base64, mimeType: 'image/jpeg' }],
    ['JPEG bytes claimed as PNG', { image: makeImage('jpeg').base64, mimeType: 'image/png' }],
  ])('400 INVALID_IMAGE: %s', async (_name, body) => {
    const { app, provider } = makeTestApp();
    const res = await authed(app, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
    expect(provider.calls).toHaveLength(0);
  });

  it.each(['jpeg', 'png', 'webp'] as const)('accepts a real %s header', async (kind) => {
    const { app } = makeTestApp();
    const img = makeImage(kind);
    expect((await authed(app, { image: img.base64, mimeType: img.mimeType })).status).toBe(200);
  });
});

describe('vision: Gemini fallback chain', () => {
  it('uses the first model when it succeeds', async () => {
    const provider = scriptedProvider([goodModelJson()]);
    const { app } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(200);
    expect(res.body.meta.model).toBe('model-a');
    expect(provider.calls.map((c) => c.model)).toEqual(['model-a']);
  });

  it('falls back to the next model when the first is rate limited', async () => {
    const provider = scriptedProvider([providerFailure('RATE_LIMITED', 'QUOTA_OR_RATE_LIMIT', 429), goodModelJson()]);
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(200);
    expect(res.body.meta.model).toBe('model-b');
    const event = sink.lines().find((l) => l.event === 'ai.request')!;
    expect(event.attempts.map((a: any) => [a.model, a.outcome])).toEqual([['model-a', 'RATE_LIMITED'], ['model-b', 'OK']]);
    expect(event.finalModel).toBe('model-b');
  });

  it('walks the whole chain in order across mixed failure kinds', async () => {
    const provider = scriptedProvider([
      providerFailure('MODEL_FAILED', 'MODEL_NOT_FOUND', 404),
      providerFailure('NETWORK_ERROR', 'TIMEOUT'),
      providerFailure('MODEL_FAILED', 'MODEL_OVERLOADED', 503),
      goodModelJson(),
    ]);
    const { app } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(200);
    expect(res.body.meta.model).toBe('model-d');
    expect(provider.calls.map((c) => c.model)).toEqual(['model-a', 'model-b', 'model-c', 'model-d']);
  });

  it('503 AI_UNAVAILABLE when every model fails (and the client sees no provider detail)', async () => {
    const provider = scriptedProvider([providerFailure('MODEL_FAILED', 'MODEL_OVERLOADED', 503, 'SECRET_PROVIDER_DETAIL')], { repeatLast: true });
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toMatch(/SECRET_PROVIDER_DETAIL|model-a|OVERLOADED/);
    expect(provider.calls).toHaveLength(4);
    const event = sink.lines().find((l) => l.event === 'ai.request')!;
    expect(event.outcome).toBe('error');
    expect(event.attempts).toHaveLength(4);
  });

  it('an invalid API key aborts the chain immediately and is reported as generic unavailability', async () => {
    const provider = scriptedProvider([providerFailure('API_KEY_INVALID', 'API_KEY_INVALID', 400), goodModelJson()]);
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_UNAVAILABLE');
    expect(provider.calls).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toMatch(/key/i);
    expect(sink.lines().some((l) => l.errorCode === 'AI_UNAVAILABLE' && l.chainFailure === 'KEY_INVALID')).toBe(true);
  });

  it('REGRESSION: a "bad request / invalid argument" from one model does NOT abort the chain', async () => {
    const provider = scriptedProvider([providerFailure('MODEL_FAILED', 'BAD_REQUEST', 400, 'invalid argument'), goodModelJson()]);
    const { app } = makeTestApp({ provider });
    expect((await authed(app, validBody())).status).toBe(200);
    expect(provider.calls).toHaveLength(2);
  });

  it('malformed JSON from model A falls through to model B', async () => {
    const provider = scriptedProvider(['I could not analyse this image, sorry', goodModelJson()]);
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(200);
    expect(res.body.meta.model).toBe('model-b');
    const attempts = sink.lines().find((l) => l.event === 'ai.request')!.attempts;
    expect(attempts[0].outcome).toBe('INVALID_JSON');
  });

  it('schema-invalid output (missing nutrition) falls through to the next model', async () => {
    const provider = scriptedProvider([goodModelJson({ items: [{ itemName: 'X', portionCategory: 'medium', confidence: 0.5 }] }), goodModelJson()]);
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.body.meta.model).toBe('model-b');
    expect(sink.lines().find((l) => l.event === 'ai.request')!.attempts[0].outcome).toBe('SCHEMA_INVALID');
  });

  it('out-of-bounds output falls through to the next model', async () => {
    const wild = goodModelJson({ items: [goodItem({ estimatedNutrition: { calories: 99999, carbs: 1, protein: 1, fat: 1, servingSize: '1' } })] });
    const provider = scriptedProvider([wild, goodModelJson()]);
    const { app, sink } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.body.meta.model).toBe('model-b');
    expect(sink.lines().find((l) => l.event === 'ai.request')!.attempts[0].outcome).toBe('OUT_OF_BOUNDS');
  });

  it('502 AI_INVALID_OUTPUT when every model returns unusable output; nothing fabricated is returned', async () => {
    const provider = scriptedProvider(['nope'], { repeatLast: true });
    const { app } = makeTestApp({ provider });
    const res = await authed(app, validBody());
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(res.body.analysis).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/Unknown food|250/);
  });

  it('sends the server-owned prompt and image to the provider with low temperature', async () => {
    const provider = scriptedProvider([goodModelJson()]);
    const { app } = makeTestApp({ provider });
    const img = makeImage('jpeg', 555);
    await authed(app, { image: img.base64, mimeType: img.mimeType });
    const req = provider.calls[0]!;
    expect(req.generationConfig).toEqual({ temperature: 0.1 });
    expect(req.parts[0]).toHaveProperty('text');
    expect(req.parts[1]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: img.base64 } });
  });

  it('stops when the total deadline is exceeded', async () => {
    const slow = () => new Promise<{ text: string }>((_r, reject) => setTimeout(() => reject(providerFailure('NETWORK_ERROR', 'TIMEOUT')), 60));
    const provider = scriptedProvider([slow], { repeatLast: true });
    const { app, sink } = makeTestApp({ provider, env: { AI_DEADLINE_MS: '100', GEMINI_ATTEMPT_TIMEOUT_MS: '150' } });
    const res = await authed(app, validBody());
    expect(res.status).toBe(503);
    expect(provider.calls.length).toBeLessThan(4);
    const attempts = sink.lines().find((l) => l.event === 'ai.request')!.attempts;
    expect(attempts.some((a: any) => a.outcome === 'DEADLINE_EXCEEDED')).toBe(true);
  });

  it('stops calling Gemini once the global daily attempt budget is exhausted', async () => {
    const provider = scriptedProvider([providerFailure('MODEL_FAILED', 'MODEL_OVERLOADED', 503)], { repeatLast: true });
    const { app, sink } = makeTestApp({ provider, env: { AI_DAILY_ATTEMPT_BUDGET: '2' } });
    const res = await authed(app, validBody());
    expect(res.status).toBe(503);
    expect(provider.calls).toHaveLength(2);
    expect(sink.lines().find((l) => l.event === 'ai.request')!.attempts.map((a: any) => a.outcome)).toContain('BUDGET_EXHAUSTED');
  });
});

describe('vision: rate limiting', () => {
  it('limits per verified user per minute with the error envelope and Retry-After', async () => {
    const { app } = makeTestApp({ env: { VISION_RATE_PER_MINUTE: '2' } });
    expect((await authed(app, validBody(201))).status).toBe(200);
    expect((await authed(app, validBody(202))).status).toBe(200);
    const res = await authed(app, validBody(203));
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('one user hitting the limit does not block another user', async () => {
    const { app } = makeTestApp({ env: { VISION_RATE_PER_MINUTE: '1' } });
    await authed(app, validBody(211), 'good-token');
    expect((await authed(app, validBody(212), 'good-token')).status).toBe(429);
    expect((await authed(app, validBody(213), 'other-token')).status).toBe(200);
  });

  it('enforces a per-user daily cap', async () => {
    const { app } = makeTestApp({ env: { VISION_RATE_PER_MINUTE: '50', VISION_RATE_PER_DAY: '2' } });
    await authed(app, validBody(221));
    await authed(app, validBody(222));
    expect((await authed(app, validBody(223))).status).toBe(429);
  });

  it('a spoofed X-Forwarded-For does not bypass or dodge the IP limit', async () => {
    const { app } = makeTestApp({ env: { AI_IP_RATE_PER_MINUTE: '2', TRUST_PROXY_HOPS: '0' } });
    const send = (xff: string) =>
      request(app).post(URL).set('X-Forwarded-For', xff).send(validBody());
    await send('1.1.1.1');
    await send('2.2.2.2');
    expect((await send('3.3.3.3')).status).toBe(429);
  });

  it('cached hits still count against the user (no free scraping)', async () => {
    const { app } = makeTestApp({ env: { VISION_RATE_PER_MINUTE: '2' } });
    const body = validBody(231);
    await authed(app, body);
    await authed(app, body);
    expect((await authed(app, body)).status).toBe(429);
  });
});

describe('vision: security & observability', () => {
  it('never exposes the Gemini key in any response, header, or log line', async () => {
    const provider = scriptedProvider([
      providerFailure('MODEL_FAILED', 'BAD_REQUEST', 400, `error calling ...key=${SENTINEL_KEY}`),
      goodModelJson(),
    ]);
    const { app, sink } = makeTestApp({ provider });
    const ok = await authed(app, validBody(301));
    const fail = await authed(app, { nope: 1 });
    const unauth = await request(app).post(URL).send({});
    for (const res of [ok, fail, unauth]) {
      expect(JSON.stringify(res.body) + JSON.stringify(res.headers)).not.toContain(SENTINEL_KEY);
    }
    expect(sink.raw()).not.toContain(SENTINEL_KEY);
  });

  it('never returns raw provider error text', async () => {
    const provider = scriptedProvider([providerFailure('MODEL_FAILED', 'PROVIDER_ERROR', 500, 'Internal at googleapis stack trace')], { repeatLast: true });
    const { app } = makeTestApp({ provider });
    const res = await authed(app, validBody(311));
    expect(JSON.stringify(res.body)).not.toMatch(/googleapis|stack trace|Internal at/);
  });

  it('turns an unexpected provider exception into the generic envelope', async () => {
    const provider = scriptedProvider([new Error('TypeError: cannot read properties of undefined (reading secret)')], { repeatLast: true });
    const { app } = makeTestApp({ provider });
    const res = await authed(app, validBody(312));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: { code: 'AI_UNAVAILABLE', message: expect.any(String), requestId: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('every error response uses the envelope and echoes X-Request-Id', async () => {
    const { app } = makeTestApp();
    const cases = [
      request(app).post(URL).send({}), // 401
      authed(app, {}), // 400
      request(app).get('/api/v1/does-not-exist'), // 401 (auth first)
      request(app).get('/nope'), // 404
    ];
    for (const res of await Promise.all(cases)) {
      expect(res.body.error).toEqual({ code: expect.any(String), message: expect.any(String), requestId: res.headers['x-request-id'] });
    }
  });

  it('emits one complete ai.request line with only safe operational fields', async () => {
    const { app, sink } = makeTestApp();
    const img = makeImage('jpeg', 401);
    const res = await authed(app, { image: img.base64, mimeType: img.mimeType });
    const line = sink.lines().find((l) => l.event === 'ai.request')!;
    expect(line).toMatchObject({
      route: 'vision.analyze-food',
      requestId: res.body.meta.requestId,
      promptVersion: 'vision-v1',
      cache: 'miss',
      finalModel: 'model-a',
      outcome: 'success',
      errorCode: null,
      status: 200,
    });
    expect(typeof line.latencyMs).toBe('number');
    expect(line.imageBytes).toBeGreaterThan(0);
    expect(line.attempts[0]).toMatchObject({ model: 'model-a', outcome: 'OK' });
    // Never: image data, prompt text, model output.
    expect(sink.raw()).not.toContain(img.base64);
    expect(sink.raw()).not.toContain('expert Indian nutrition assistant');
    expect(sink.raw()).not.toContain('Dal Makhani');
  });

  it('logs cache hits distinctly', async () => {
    const { app, sink } = makeTestApp();
    const body = validBody(402);
    await authed(app, body);
    await authed(app, body);
    expect(sink.lines().filter((l) => l.event === 'ai.request').map((l) => l.cache)).toEqual(['miss', 'hit']);
  });

  it('does not log the Authorization header', async () => {
    const { app, sink } = makeTestApp();
    await authed(app, validBody(403));
    expect(sink.raw()).not.toContain('good-token');
  });

  it('sets Cache-Control: no-store on results', async () => {
    const { app } = makeTestApp();
    expect((await authed(app, validBody(404))).headers['cache-control']).toBe('no-store');
  });

  it('CORS: no allow-origin header by default (native apps do not need it)', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('CORS: an explicitly allowlisted origin is honoured, others are not', async () => {
    const { app } = makeTestApp({ env: { CORS_ORIGINS: 'http://localhost:8081' } });
    expect((await request(app).get('/health').set('Origin', 'http://localhost:8081')).headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect((await request(app).get('/health').set('Origin', 'https://evil.example')).headers['access-control-allow-origin']).toBeUndefined();
  });
});
