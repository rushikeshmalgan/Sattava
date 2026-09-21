import request from 'supertest';
import { DB_START_TIMEOUT_MS, startTestDatabase, type TestDatabase } from './dbHelpers';
import { makeTestApp } from './helpers';

/**
 * The daily-log API against a real MongoDB (an in-memory mongod): atomic totals, per-day caps, deleting an
 * entry takes exactly its effect back out, and one user can never touch another user's day.
 */

let db: TestDatabase;

beforeAll(async () => {
  db = await startTestDatabase();
}, DB_START_TIMEOUT_MS);
afterAll(async () => {
  await db.stop();
});
beforeEach(async () => {
  await db.reset();
});

const makeApi = (env: Record<string, string> = {}) => {
  const { app, sink } = makeTestApp({ repo: db.repo, checkDatabase: db.ping, env: { DATA_RATE_PER_MINUTE: '100000', ...env } });
  const as = (token: string) => ({
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  });
  return { app, sink, user1: as('good-token'), user2: as('other-token') };
};

const DAY = new Date().toISOString().slice(0, 10);
const entries = (date = DAY) => `/api/v1/logs/${date}/entries`;

const dal = { type: 'food', itemId: 'csv-12', name: 'Dal', calories: 300, carbs: 40, protein: 15, fat: 8, fiber: 6, servingSize: '1 bowl' };
const run = { type: 'cardio', itemId: 'run', name: 'Running', calories: 250, duration: 30, intensity: 'Medium' };
const water = { type: 'water', name: 'Paani', amountMl: 250, amount: '250ml' };

describe('adding an entry', () => {
  it('moves the totals and gives the entry its own id and timestamp', async () => {
    const { user1 } = makeApi();

    const res = await user1.post(entries()).send(dal);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.log).toMatchObject({
      date: DAY,
      consumedCalories: 300,
      totalCarbs: 40,
      totalProtein: 15,
      totalFat: 8,
      totalFiber: 6,
      caloriesBurned: 0,
      totalWater: 0,
    });
    expect(res.body.log.logs).toHaveLength(1);
    expect(res.body.log.logs[0]).toMatchObject({ type: 'food', itemId: 'csv-12', name: 'Dal', calories: 300 });
    expect(res.body.log.logs[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(res.body.log.logs[0].createdAt).toString()).not.toBe('Invalid Date');
  });

  it('logs the same food twice as two entries with different ids', async () => {
    const { user1 } = makeApi();
    await user1.post(entries()).send(dal);
    const res = await user1.post(entries()).send(dal);

    expect(res.body.log.consumedCalories).toBe(600);
    const ids = res.body.log.logs.map((l: { id: string }) => l.id);
    expect(new Set(ids).size).toBe(2);
  });

  it.each(['exercise', 'cardio', 'weight', 'manual'])('a %s entry raises calories burned and nothing else', async (type) => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send({ ...run, type });

    expect(res.body.log).toMatchObject({ caloriesBurned: 250, consumedCalories: 0, totalWater: 0 });
  });

  it('a water entry raises only the water total', async () => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send(water);

    expect(res.body.log).toMatchObject({ totalWater: 250, consumedCalories: 0, caloriesBurned: 0 });
    expect(res.body.log.logs[0]).toMatchObject({ type: 'water', amountMl: 250, amount: '250ml' });
  });

  it('accepts a food with no macros and a zero-calorie entry', async () => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send({ type: 'food', name: 'Black coffee', calories: 0 });

    expect(res.status).toBe(200);
    expect(res.body.log.consumedCalories).toBe(0);
    expect(res.body.log.logs).toHaveLength(1);
  });

  it('is atomic: fifty simultaneous entries add up exactly', async () => {
    const { user1 } = makeApi();
    const results = await Promise.all(
      Array.from({ length: 50 }, () => user1.post(entries()).send({ type: 'food', name: 'Snack', calories: 100, protein: 2 })),
    );

    expect(results.every((r) => r.status === 200)).toBe(true);
    const day = (await user1.get(`/api/v1/logs/${DAY}`)).body.log;
    expect(day.consumedCalories).toBe(5_000);
    expect(day.totalProtein).toBe(100);
    expect(day.logs).toHaveLength(50);
  });

  it('two racing first writes for a new day both succeed', async () => {
    const { user1 } = makeApi();
    const results = await Promise.all(Array.from({ length: 12 }, () => user1.post(entries('2026-03-15')).send(water)));

    expect(results.map((r) => r.status)).toEqual(Array(12).fill(200));
    expect((await user1.get('/api/v1/logs/2026-03-15')).body.log.logs).toHaveLength(12);
  });
});

describe('what an entry may contain', () => {
  const rejected: [string, unknown][] = [
    ['negative calories', { ...dal, calories: -5 }],
    ['calories above the per-entry cap', { ...dal, calories: 10_001 }],
    ['negative macros', { ...dal, protein: -1 }],
    ['macros above the per-entry cap', { ...dal, carbs: 1_001 }],
    ['calories sent as text', { ...dal, calories: '300' }],
    ['a missing name', { type: 'food', calories: 100 }],
    ['an empty name', { ...dal, name: '   ' }],
    ['a name over 500 characters', { ...dal, name: 'x'.repeat(501) }],
    ['an unknown type', { ...dal, type: 'snack' }],
    ['no type', { name: 'x', calories: 1 }],
    ['an unknown field', { ...dal, userId: 'user-2' }],
    ['a uid in the body', { ...dal, uid: 'user-2' }],
    ['a water field on a food', { ...dal, amountMl: 250 }],
    ['calories on a water entry', { ...water, calories: 5 }],
    ['zero millilitres of water', { ...water, amountMl: 0 }],
    ['water above the daily cap in one entry', { ...water, amountMl: 20_001 }],
    ['an exercise longer than a day', { ...run, duration: 1_441 }],
    ['a MongoDB operator as a field', { ...dal, $set: { consumedCalories: 0 } }],
    ['an operator as the type', { ...dal, type: { $ne: 'food' } }],
    ['an operator as the calories', { ...dal, calories: { $gt: 0 } }],
  ];

  it.each(rejected)('rejects %s', async (_label, body) => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send(body as object);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    // Nothing was written.
    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log).toBeNull();
  });

  it('rejects a __proto__ key instead of merging it', async () => {
    const { app } = makeApi();
    const res = await request(app)
      .post(entries())
      .set('Authorization', 'Bearer good-token')
      .set('Content-Type', 'application/json')
      .send('{"type":"food","name":"x","calories":1,"__proto__":{"isAdmin":true}}');

    expect(res.status).toBe(400);
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  it('stores a MongoDB-looking string as plain text, without acting on it', async () => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send({ ...dal, itemId: '$set', name: '{"$gt":""}' });

    expect(res.status).toBe(200);
    expect(res.body.log.logs[0]).toMatchObject({ itemId: '$set', name: '{"$gt":""}' });
    expect(res.body.log.consumedCalories).toBe(300);
  });
});

describe('the date in the path', () => {
  it.each(['2026-13-01', '2026-02-30', '2026-1-5', '20260105', 'today', '2026-01-05x', '2019-12-31', '2999-01-01'])(
    'rejects %s',
    async (date) => {
      const { user1 } = makeApi();
      expect((await user1.post(entries(date)).send(water)).status).toBe(400);
      expect((await user1.get(`/api/v1/logs/${date}`)).status).toBe(400);
    },
  );

  it('rejects a MongoDB operator smuggled into the path', async () => {
    const { user1 } = makeApi();
    const res = await user1.get(`/api/v1/logs/${encodeURIComponent('{"$ne":null}')}`);
    expect(res.status).toBe(400);
  });

  it('accepts a real past day, and one a day ahead (clients name days by their own clock)', async () => {
    const { user1 } = makeApi();
    const tomorrow = new Date(Date.now() + 24 * 3_600_000).toISOString().slice(0, 10);
    expect((await user1.post(entries('2026-01-05')).send(water)).status).toBe(200);
    expect((await user1.post(entries(tomorrow)).send(water)).status).toBe(200);
  });
});

describe('daily limits', () => {
  it('refuses an entry that would push a total over the day cap, and writes nothing', async () => {
    const { user1 } = makeApi();
    const big = { type: 'food', name: 'Feast', calories: 10_000 };
    for (let i = 0; i < 3; i++) expect((await user1.post(entries()).send(big)).status).toBe(200);

    const over = await user1.post(entries()).send({ type: 'food', name: 'One more', calories: 1 });

    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe('DAY_LIMIT_EXCEEDED');
    const day = (await user1.get(`/api/v1/logs/${DAY}`)).body.log;
    expect(day.consumedCalories).toBe(30_000);
    expect(day.logs).toHaveLength(3);
  });

  it('caps water at 20 litres a day', async () => {
    const { user1 } = makeApi();
    expect((await user1.post(entries()).send({ ...water, amountMl: 20_000 })).status).toBe(200);
    expect((await user1.post(entries()).send({ ...water, amountMl: 1 })).status).toBe(422);
  });

  it('cannot be overshot by simultaneous requests: exactly thirty of forty succeed', async () => {
    const { user1 } = makeApi();
    const results = await Promise.all(
      Array.from({ length: 40 }, () => user1.post(entries()).send({ type: 'food', name: 'Thali', calories: 1_000 })),
    );

    expect(results.filter((r) => r.status === 200)).toHaveLength(30);
    expect(results.filter((r) => r.status === 422)).toHaveLength(10);
    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log.consumedCalories).toBe(30_000);
  });

  it('holds at most 500 entries a day', async () => {
    const { user1 } = makeApi();
    // Fill the day to one below the limit directly: 500 requests would test the network, not the limit.
    const filler = (i: number) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      type: 'food',
      name: `Item ${i}`,
      calories: 0,
      createdAt: new Date(),
    });
    await db.db.collection('dailyLogs').insertOne({
      uid: 'user-1',
      date: DAY,
      consumedCalories: 0,
      caloriesBurned: 0,
      totalCarbs: 0,
      totalProtein: 0,
      totalFat: 0,
      totalFiber: 0,
      totalWater: 0,
      logs: Array.from({ length: 499 }, (_, i) => filler(i)),
      lastUpdated: new Date(),
    });

    expect((await user1.post(entries()).send({ type: 'food', name: 'The 500th', calories: 0 })).status).toBe(200);
    const res = await user1.post(entries()).send({ type: 'food', name: 'One too many', calories: 0 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('DAY_LIMIT_EXCEEDED');
    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log.logs).toHaveLength(500);
  });
});

describe('deleting an entry', () => {
  const idOf = (body: { log: { logs: { id: string }[] } }, index = 0) => body.log.logs[index]!.id;

  it('takes back a food entry, macros included, and leaves the others alone', async () => {
    const { user1 } = makeApi();
    await user1.post(entries()).send({ type: 'food', name: 'Roti', calories: 100, carbs: 18, protein: 3, fat: 2 });
    const added = await user1.post(entries()).send(dal);

    const res = await user1.delete(`${entries()}/${idOf(added.body, 1)}`);

    expect(res.status).toBe(200);
    expect(res.body.log).toMatchObject({ consumedCalories: 100, totalCarbs: 18, totalProtein: 3, totalFat: 2, totalFiber: 0 });
    expect(res.body.log.logs.map((l: { name: string }) => l.name)).toEqual(['Roti']);
  });

  it.each(['exercise', 'cardio', 'weight', 'manual'])('takes calories burned back off for a %s entry', async (type) => {
    const { user1 } = makeApi();
    const added = await user1.post(entries()).send({ ...run, type });

    const res = await user1.delete(`${entries()}/${idOf(added.body)}`);

    expect(res.body.log).toMatchObject({ caloriesBurned: 0, logs: [] });
  });

  it('takes a whole litre of water back, not one millilitre', async () => {
    const { user1 } = makeApi();
    const added = await user1.post(entries()).send({ type: 'water', name: 'Paani', amountMl: 1_000, amount: '1L' });

    const res = await user1.delete(`${entries()}/${idOf(added.body)}`);

    expect(res.body.log.totalWater).toBe(0);
  });

  it('never leaves a total below zero, and leaves no floating-point dust', async () => {
    const { user1 } = makeApi();
    await user1.post(entries()).send({ type: 'food', name: 'A', calories: 10, protein: 0.1 });
    const second = await user1.post(entries()).send({ type: 'food', name: 'B', calories: 10, protein: 0.2 });
    const firstId = idOf(second.body, 0);
    const secondId = idOf(second.body, 1);

    await user1.delete(`${entries()}/${firstId}`);
    const res = await user1.delete(`${entries()}/${secondId}`);
    expect(res.body.log.totalProtein).toBe(0);

    // A total that was already lower than the entry (older or edited data) is clamped at zero.
    const again = await user1.post(entries()).send({ type: 'food', name: 'C', calories: 100 });
    await db.db.collection('dailyLogs').updateOne({ uid: 'user-1', date: DAY }, { $set: { consumedCalories: 40 } });
    const clamped = await user1.delete(`${entries()}/${idOf(again.body)}`);
    expect(clamped.body.log.consumedCalories).toBe(0);
  });

  it('answers 404 the second time, and only reverses once when two deletes race', async () => {
    const { user1 } = makeApi();
    const added = await user1.post(entries()).send(dal);
    await user1.post(entries()).send({ type: 'food', name: 'Keep', calories: 500 });
    const id = idOf(added.body);

    const [a, b] = await Promise.all([user1.delete(`${entries()}/${id}`), user1.delete(`${entries()}/${id}`)]);

    expect([a.status, b.status].sort()).toEqual([200, 404]);
    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log.consumedCalories).toBe(500);
  });

  it('answers 404 for an unknown entry and 400 for something that is not an id', async () => {
    const { user1 } = makeApi();
    await user1.post(entries()).send(dal);

    expect((await user1.delete(`${entries()}/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
    expect((await user1.delete(`${entries()}/not-an-id`)).status).toBe(400);
    expect((await user1.delete(`${entries('2026-01-05')}/00000000-0000-4000-8000-000000000000`)).status).toBe(404);
  });
});

describe('reading days', () => {
  it('returns null for a day with nothing logged', async () => {
    const { user1 } = makeApi();
    const res = await user1.get(`/api/v1/logs/${DAY}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ log: null });
  });

  it('lists days newest first, and honours from, to and limit', async () => {
    const { user1 } = makeApi();
    for (const date of ['2026-01-03', '2026-01-01', '2026-01-05', '2026-01-04', '2026-01-02']) {
      await user1.post(entries(date)).send({ type: 'food', name: date, calories: 1 });
    }

    const all = await user1.get('/api/v1/logs');
    expect(all.body.logs.map((d: { date: string }) => d.date)).toEqual(['2026-01-05', '2026-01-04', '2026-01-03', '2026-01-02', '2026-01-01']);

    const range = await user1.get('/api/v1/logs?from=2026-01-02&to=2026-01-04');
    expect(range.body.logs.map((d: { date: string }) => d.date)).toEqual(['2026-01-04', '2026-01-03', '2026-01-02']);

    const two = await user1.get('/api/v1/logs?limit=2');
    expect(two.body.logs.map((d: { date: string }) => d.date)).toEqual(['2026-01-05', '2026-01-04']);
  });

  it.each(['limit=0', 'limit=367', 'limit=abc', 'from=today', 'from[$gt]=2026-01-01', 'to[$ne]=x', 'sort=date', 'uid=user-2'])(
    'rejects the query %s',
    async (query) => {
      const { user1 } = makeApi();
      expect((await user1.get(`/api/v1/logs?${query}`)).status).toBe(400);
    },
  );
});

describe('one user can never reach the days of another user', () => {
  it('keeps the logs of two users separate', async () => {
    const { user1, user2 } = makeApi();
    await user1.post(entries()).send(dal);
    await user2.post(entries()).send({ type: 'food', name: 'Poha', calories: 250 });

    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log.consumedCalories).toBe(300);
    expect((await user2.get(`/api/v1/logs/${DAY}`)).body.log.consumedCalories).toBe(250);
    expect((await user2.get('/api/v1/logs')).body.logs).toHaveLength(1);
  });

  it('cannot delete an entry of another user by knowing its id', async () => {
    const { user1, user2 } = makeApi();
    const added = await user1.post(entries()).send(dal);
    const id = added.body.log.logs[0].id;

    const res = await user2.delete(`${entries()}/${id}`);

    expect(res.status).toBe(404);
    expect((await user1.get(`/api/v1/logs/${DAY}`)).body.log.consumedCalories).toBe(300);
  });

  it('ignores a uid in the query string', async () => {
    const { user1, user2 } = makeApi();
    await user1.post(entries()).send(dal);

    expect((await user2.get('/api/v1/logs?uid=user-1')).status).toBe(400);
    expect((await user2.get(`/api/v1/logs/${DAY}?uid=user-1`)).body.log).toBeNull();
  });
});

describe('demo data', () => {
  it('fills the last seven days with balanced sample days', async () => {
    const { user1 } = makeApi();
    const res = await user1.post('/api/v1/demo-data').send({});

    expect(res.body).toEqual({ days: 7 });
    const logs = (await user1.get('/api/v1/logs')).body.logs;
    expect(logs).toHaveLength(7);
    expect(logs[0]).toMatchObject({ consumedCalories: 2_000, totalWater: 2_000 });
    expect(logs[0].logs.some((l: { type: string }) => l.type === 'exercise')).toBe(true);
  });

  it('replaces rather than duplicates when run twice, and stays within the calling account', async () => {
    const { user1, user2 } = makeApi();
    await user1.post('/api/v1/demo-data').send({});
    await user1.post('/api/v1/demo-data').send({});

    expect((await user1.get('/api/v1/logs')).body.logs).toHaveLength(7);
    expect((await user2.get('/api/v1/logs')).body.logs).toHaveLength(0);
  });
});

describe('limits on the endpoint itself', () => {
  it('needs a signed-in user for every route', async () => {
    const { app } = makeApi();
    const calls = [
      request(app).get('/api/v1/me'),
      request(app).post('/api/v1/me/sync').send({}),
      request(app).patch('/api/v1/me').send({ onboardingCompleted: true }),
      request(app).get('/api/v1/logs'),
      request(app).get(`/api/v1/logs/${DAY}`),
      request(app).post(entries()).send(water),
      request(app).delete(`${entries()}/00000000-0000-4000-8000-000000000000`),
      request(app).post('/api/v1/demo-data').send({}),
    ];
    for (const call of calls) {
      const res = await call;
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rate limits per user, with Retry-After', async () => {
    const { user1, user2 } = makeApi({ DATA_RATE_PER_MINUTE: '3' });
    for (let i = 0; i < 3; i++) expect((await user1.get('/api/v1/logs')).status).toBe(200);

    const limited = await user1.get('/api/v1/logs');
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    // Another user is not affected.
    expect((await user2.get('/api/v1/logs')).status).toBe(200);
  });

  it('rejects a body over 32 kB before parsing it', async () => {
    const { user1 } = makeApi();
    const res = await user1.post(entries()).send({ ...dal, name: 'x'.repeat(40_000) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
