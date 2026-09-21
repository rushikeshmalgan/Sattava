import request from 'supertest';
import { DB_START_TIMEOUT_MS, startTestDatabase, type TestDatabase } from './dbHelpers';
import { makeTestApp } from './helpers';

/** The user document API against a real MongoDB: sign-in sync, onboarding, targets and profile edits. */

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

const makeApi = () => {
  const { app } = makeTestApp({ repo: db.repo, checkDatabase: db.ping, env: { DATA_RATE_PER_MINUTE: '100000' } });
  const as = (token: string) => ({
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  });
  return { user1: as('good-token'), user2: as('other-token') };
};

const physicalProfile = {
  gender: 'Female',
  goal: 'Lose Weight',
  activityLevel: '3-4 Days / Week',
  birthdate: { day: '14', month: '3', year: '1999' },
  heightFeet: '5',
  heightInches: '4',
  weightKg: '62',
};

const plan = {
  dailyCalories: 1800,
  macros: { carbs: '250g', protein: '60g', fats: '70g' },
  waterIntake: '2.5L',
  planSummary: 'A balanced Indian diet plan.',
  fitnessTips: ['Morning yoga', 'Evening walk'],
};

describe('GET /me', () => {
  it('is null until the user has signed in', async () => {
    const { user1 } = makeApi();
    const res = await user1.get('/api/v1/me');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });
});

describe('POST /me/sync (every sign-in)', () => {
  it('creates the user with the verified uid as its id', async () => {
    const { user1 } = makeApi();
    const res = await user1.post('/api/v1/me/sync').send({ email: 'a@example.com', name: 'Asha', photo: '', provider: 'google.com' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'user-1', email: 'a@example.com', name: 'Asha', provider: 'google.com' });
    expect(res.body.user.createdAt).toBeDefined();
    expect(res.body.user.lastLoginAt).toBeDefined();
    expect(res.body.user._id).toBeUndefined();
  });

  it('keeps createdAt and moves lastLoginAt on the next sign-in', async () => {
    const { user1 } = makeApi();
    const first = (await user1.post('/api/v1/me/sync').send({ email: 'a@example.com' })).body.user;
    await new Promise((resolve) => setTimeout(resolve, 15));
    const second = (await user1.post('/api/v1/me/sync').send({ email: 'a@example.com' })).body.user;

    expect(second.createdAt).toBe(first.createdAt);
    expect(new Date(second.lastLoginAt).getTime()).toBeGreaterThan(new Date(first.lastLoginAt).getTime());
    expect(await db.db.collection('users').countDocuments({ _id: 'user-1' } as never)).toBe(1);
  });

  it('never overwrites onboarding data', async () => {
    const { user1 } = makeApi();
    await user1.patch('/api/v1/me').send({ physicalProfile, generatedPlan: plan, onboardingCompleted: true });

    const res = await user1.post('/api/v1/me/sync').send({ email: 'a@example.com', name: 'Asha' });

    expect(res.body.user.physicalProfile).toEqual(physicalProfile);
    expect(res.body.user.generatedPlan).toEqual(plan);
    expect(res.body.user.onboardingCompleted).toBe(true);
  });

  it('accepts an empty body and rejects an identity in it', async () => {
    const { user1 } = makeApi();
    expect((await user1.post('/api/v1/me/sync').send({})).status).toBe(200);
    for (const body of [{ uid: 'user-2' }, { id: 'user-2' }, { userId: 'user-2' }, { _id: 'user-2' }]) {
      const res = await user1.post('/api/v1/me/sync').send(body);
      expect(res.status).toBe(400);
    }
    expect((await user1.get('/api/v1/me')).body.user.id).toBe('user-1');
  });

  it('rejects over-long values', async () => {
    const { user1 } = makeApi();
    expect((await user1.post('/api/v1/me/sync').send({ email: 'x'.repeat(321) })).status).toBe(400);
    expect((await user1.post('/api/v1/me/sync').send({ photo: 'x'.repeat(2049) })).status).toBe(400);
  });
});

describe('PATCH /me', () => {
  it('saves the onboarding profile and stamps when onboarding finished', async () => {
    const { user1 } = makeApi();
    const res = await user1.patch('/api/v1/me').send({
      onboardingCompleted: true,
      isSetupCompleted: true,
      generatedPlan: plan,
      physicalProfile,
      imageUrl: 'https://example.com/a.png',
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 'user-1', onboardingCompleted: true, isSetupCompleted: true, physicalProfile, generatedPlan: plan });
    expect(res.body.user.onboardingCompletedAt).toBeDefined();
    expect(res.body.user.lastUpdated).toBeDefined();
    expect(res.body.user.createdAt).toBeDefined();
  });

  it('creates the user if the first call is a patch', async () => {
    const { user1 } = makeApi();
    await user1.patch('/api/v1/me').send({ physicalProfile });

    expect((await user1.get('/api/v1/me')).body.user).toMatchObject({ id: 'user-1', physicalProfile });
  });

  it('merges profile fields one at a time, so editing the goal keeps the name', async () => {
    const { user1 } = makeApi();
    await user1.patch('/api/v1/me').send({ userProfile: { name: 'Asha', goal: 'Lose Weight', coachType: 'Friendly' } });

    const res = await user1.patch('/api/v1/me').send({ userProfile: { goal: 'Gain Weight' }, generatedPlanStale: true });

    expect(res.body.user.userProfile).toEqual({ name: 'Asha', goal: 'Gain Weight', coachType: 'Friendly' });
    expect(res.body.user.generatedPlanStale).toBe(true);
  });

  it('merges the daily targets without dropping the rest of the plan', async () => {
    const { user1 } = makeApi();
    await user1.patch('/api/v1/me').send({ generatedPlan: plan });

    const res = await user1.patch('/api/v1/me').send({
      generatedPlan: { dailyCalories: 2200, macros: { protein: '80g' }, waterIntake: '3L' },
    });

    expect(res.body.user.generatedPlan).toEqual({
      dailyCalories: 2200,
      macros: { carbs: '250g', protein: '80g', fats: '70g' },
      waterIntake: '3L',
      planSummary: 'A balanced Indian diet plan.',
      fitnessTips: ['Morning yoga', 'Evening walk'],
    });
  });

  it('replaces the physical profile as a whole', async () => {
    const { user1 } = makeApi();
    await user1.patch('/api/v1/me').send({ physicalProfile });
    const res = await user1.patch('/api/v1/me').send({ physicalProfile: { ...physicalProfile, weightKg: '58' } });

    expect(res.body.user.physicalProfile.weightKg).toBe('58');
  });

  const rejected: [string, unknown][] = [
    ['an empty patch', {}],
    ['an unknown top-level field', { isAdmin: true }],
    ['an identity', { uid: 'user-2' }],
    ['a MongoDB operator', { $set: { onboardingCompleted: true } }],
    ['a dotted path', { 'userProfile.goal': 'x' }],
    ['an unknown profile field', { userProfile: { admin: true } }],
    ['an operator inside the profile', { userProfile: { goal: { $ne: null } } }],
    ['a daily target below 100 kcal', { generatedPlan: { dailyCalories: 99 } }],
    ['a daily target above 20,000 kcal', { generatedPlan: { dailyCalories: 20_001 } }],
    ['a daily target sent as text', { generatedPlan: { dailyCalories: '2000' } }],
    ['a macro string over 16 characters', { generatedPlan: { macros: { protein: 'x'.repeat(17) } } }],
    ['too many fitness tips', { generatedPlan: { fitnessTips: Array(21).fill('walk') } }],
    ['an incomplete physical profile', { physicalProfile: { gender: 'Female' } }],
    ['an extra field in the physical profile', { physicalProfile: { ...physicalProfile, isAdmin: true } }],
    ['a flag sent as text', { onboardingCompleted: 'true' }],
    ['an over-long name', { userProfile: { name: 'x'.repeat(201) } }],
  ];

  it.each(rejected)('rejects %s', async (_label, body) => {
    const { user1 } = makeApi();
    const res = await user1.patch('/api/v1/me').send(body as object);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect((await user1.get('/api/v1/me')).body.user).toBeNull();
  });

  it('does not let a client set server-managed fields', async () => {
    const { user1 } = makeApi();
    for (const body of [{ createdAt: '2000-01-01' }, { lastLoginAt: '2000-01-01' }, { onboardingCompletedAt: '2000-01-01' }, { id: 'user-2' }]) {
      expect((await user1.patch('/api/v1/me').send(body)).status).toBe(400);
    }
  });
});

describe('isolation between users', () => {
  it('keeps every user document separate', async () => {
    const { user1, user2 } = makeApi();
    await user1.patch('/api/v1/me').send({ userProfile: { name: 'Asha' } });

    expect((await user2.get('/api/v1/me')).body.user).toBeNull();

    await user2.patch('/api/v1/me').send({ userProfile: { name: 'Ravi' } });
    expect((await user1.get('/api/v1/me')).body.user.userProfile.name).toBe('Asha');
    expect((await user2.get('/api/v1/me')).body.user.userProfile.name).toBe('Ravi');
    expect(await db.db.collection('users').countDocuments({})).toBe(2);
  });
});
