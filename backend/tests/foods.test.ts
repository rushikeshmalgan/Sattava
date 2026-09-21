import request from 'supertest';
import { makeTestApp } from './helpers';

jest.mock('../src/net/publicIp', () => ({ fetchPublicIp: jest.fn().mockResolvedValue('203.0.113.7') }));

const json = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

const fatSecretEnv = { FATSECRET_CLIENT_ID: 'id', FATSECRET_CLIENT_SECRET: 'secret' };

/** makeTestApp's verifier accepts this token as user-1. */
const AUTH = ['Authorization', 'Bearer good-token'] as const;

function fakeFatSecret(searchBody: unknown) {
  return jest.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('oauth.fatsecret.com')) return json({ access_token: 'tok', expires_in: 3600 });
    return json(searchBody);
  }) as unknown as typeof fetch;
}

describe('GET /health', () => {
  it('is unchanged', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/foods/search (legacy contract)', () => {
  it('normalises a single FatSecret object into an array', async () => {
    const { app } = makeTestApp({
      env: fatSecretEnv,
      fetchImpl: fakeFatSecret({ foods: { food: { food_id: '1', food_name: 'Roti' } } }),
    });
    const res = await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'roti' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ food_id: '1', food_name: 'Roti' }]);
  });

  it('returns [] when FatSecret has no matches', async () => {
    const { app } = makeTestApp({ env: fatSecretEnv, fetchImpl: fakeFatSecret({ foods: {} }) });
    const res = await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'zzz' });
    expect(res.body).toEqual([]);
  });

  it('rejects a missing query with the legacy { error: string, code } shape', async () => {
    const { app } = makeTestApp({ env: fatSecretEnv, fetchImpl: fakeFatSecret({}) });
    const res = await request(app).get('/api/foods/search').set(...AUTH);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Query parameter is required', code: 'INVALID_QUERY' });
  });

  it('maps FatSecret IP restriction (code 21) to 502 IP_RESTRICTED', async () => {
    const { app } = makeTestApp({
      env: fatSecretEnv,
      fetchImpl: fakeFatSecret({ error: { code: 21, message: 'Invalid IP address detected' } }),
    });
    const res = await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'roti' });
    expect(res.status).toBe(502);
    expect(res.body.code).toBe('IP_RESTRICTED');
    expect(typeof res.body.error).toBe('string');
    expect(res.body.publicIp).toBe('203.0.113.7');
  });

  it('rate limits per IP with the legacy body and a Retry-After header', async () => {
    const { app } = makeTestApp({
      env: { ...fatSecretEnv, FOODS_IP_RATE_PER_MINUTE: '2' },
      fetchImpl: fakeFatSecret({ foods: {} }),
    });
    await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'a' });
    await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'a' });
    const res = await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'a' });
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(typeof res.body.error).toBe('string');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('returns 503 instead of crashing the server when FatSecret is not configured', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/api/foods/search').set(...AUTH).query({ query: 'roti' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FATSECRET_NOT_CONFIGURED');
  });

  // The proxy spends the operator's FatSecret quota, so it may not be usable anonymously.
  it('rejects a caller with no token, and never asks FatSecret for anything', async () => {
    const upstream = fakeFatSecret({ foods: {} });
    const { app } = makeTestApp({ env: fatSecretEnv, fetchImpl: upstream });

    const res = await request(app).get('/api/foods/search').query({ query: 'roti' });

    expect(res.status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects a bad token', async () => {
    const { app } = makeTestApp({ env: fatSecretEnv, fetchImpl: fakeFatSecret({ foods: {} }) });
    const res = await request(app).get('/api/foods/search').set('Authorization', 'Bearer nope').query({ query: 'roti' });
    expect(res.status).toBe(401);
  });
});
