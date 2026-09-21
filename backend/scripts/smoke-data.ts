/**
 * Manual smoke test of the data API against a REAL MongoDB: the one in MONGODB_URI (backend/.env or the environment).
 *   npm run smoke:data
 *
 * Use it right after adding your connection string: it proves the database is reachable, the indexes can be created,
 * and the whole flow the app uses works (sign-in sync, onboarding, logging, deleting, limits, the sample week).
 *
 * It works in a scratch database (sattava_smoke_<random>) that it drops at the end, so it never touches your real
 * data. It boots the real app with the real repository and a fake token verifier, so no Firebase login is needed,
 * and it never calls Gemini. It never prints the connection string.
 */
import path from 'node:path';
import dotenv from 'dotenv';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { loadConfig, ConfigError } from '../src/config';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { createDataRepository } from '../src/data/repository';
import { connectDatabase, secretsFromUri } from '../src/db/mongo';
import { createLogger } from '../src/logger';
import { scrub } from '../src/observability';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(2);
    }
    throw err;
  }
  if (!config.mongo) {
    console.error('MONGODB_URI is not set. Add it to backend/.env (see backend/.env.example) and run this again.');
    process.exit(2);
  }

  const { uri } = config.mongo;
  const dbName = `sattava_smoke_${Date.now().toString(36)}`;

  let database;
  try {
    database = await connectDatabase({ uri, dbName });
  } catch (err) {
    const message = scrub(err instanceof Error ? err.message : String(err), secretsFromUri(uri));
    console.error(`Could not connect to MongoDB: ${message}`);
    console.error('Check the connection string, the database user and password, and (Atlas) Network Access.');
    process.exit(1);
  }

  const app = createApp({
    config,
    logger: createLogger({ destination: { write: () => undefined } }),
    verifyToken: async () => ({ uid: 'smoke-user' }),
    provider: createGeminiRestProvider({ apiKey: config.geminiApiKey }),
    repo: createDataRepository(database.db),
    checkDatabase: database.ping,
  });
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;

  const call = async (method: string, url: string, body?: unknown) => {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, {
      method,
      headers: { authorization: 'Bearer smoke', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, body: (await res.json()) as any };
  };

  const results: Result[] = [];
  const check = (name: string, ok: boolean, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`);
  };

  const today = new Date().toISOString().slice(0, 10);
  console.log(`Connected. Scratch database: ${dbName}\n`);

  try {
    const ready = await call('GET', '/health/ready');
    check('readiness reports the database', ready.status === 200 && ready.body.database === 'ok');

    const empty = await call('GET', '/api/v1/me');
    check('no profile before sign-in', empty.status === 200 && empty.body.user === null);

    const sync = await call('POST', '/api/v1/me/sync', { email: 'smoke@example.com', name: 'Smoke', provider: 'password' });
    check('sign-in sync creates the profile', sync.status === 200 && sync.body.user.id === 'smoke-user' && !!sync.body.user.createdAt);

    const onboarding = await call('PATCH', '/api/v1/me', {
      onboardingCompleted: true,
      isSetupCompleted: true,
      physicalProfile: { gender: 'Female', goal: 'Lose Weight', activityLevel: '3-4 Days / Week', birthdate: { day: '14', month: '3', year: '1999' }, heightFeet: '5', heightInches: '4', weightKg: '62' },
      generatedPlan: { dailyCalories: 1800, macros: { carbs: '250g', protein: '60g', fats: '70g' }, waterIntake: '2.5L', planSummary: 'Balanced.', fitnessTips: ['Walk'] },
    });
    check('onboarding saves and stamps completion', onboarding.status === 200 && !!onboarding.body.user.onboardingCompletedAt);

    const targets = await call('PATCH', '/api/v1/me', { generatedPlan: { dailyCalories: 2000 } });
    check('editing a target keeps the rest of the plan', targets.body.user.generatedPlan.planSummary === 'Balanced.' && targets.body.user.generatedPlan.dailyCalories === 2000);

    const dal = { type: 'food', itemId: 'csv-12', name: 'Dal', calories: 300, carbs: 40, protein: 15, fat: 8, servingSize: '1 bowl' };
    const first = await call('POST', `/api/v1/logs/${today}/entries`, dal);
    await call('POST', `/api/v1/logs/${today}/entries`, dal);
    await call('POST', `/api/v1/logs/${today}/entries`, { type: 'water', name: 'Paani', amountMl: 1000, amount: '1L' });
    const run = await call('POST', `/api/v1/logs/${today}/entries`, { type: 'cardio', name: 'Running', calories: 250, duration: 30, intensity: 'Medium' });
    check('logging moves the totals', run.body.log.consumedCalories === 600 && run.body.log.totalWater === 1000 && run.body.log.caloriesBurned === 250, `${run.body.log.logs.length} entries`);

    const del = await call('DELETE', `/api/v1/logs/${today}/entries/${first.body.log.logs[0].id}`);
    check('deleting takes exactly that entry back out', del.status === 200 && del.body.log.consumedCalories === 300 && del.body.log.totalProtein === 15 && del.body.log.logs.length === 3);

    const missing = await call('DELETE', `/api/v1/logs/${today}/entries/${first.body.log.logs[0].id}`);
    check('deleting it again is a 404', missing.status === 404);

    const day = await call('GET', `/api/v1/logs/${today}`);
    check('the day reads back', day.body.log.consumedCalories === 300 && day.body.log.logs.length === 3);

    const cap = await call('POST', `/api/v1/logs/${today}/entries`, { type: 'food', name: 'Impossible', calories: 10_000 });
    const cap2 = await call('POST', `/api/v1/logs/${today}/entries`, { type: 'food', name: 'Impossible', calories: 10_000 });
    const cap3 = await call('POST', `/api/v1/logs/${today}/entries`, { type: 'food', name: 'Impossible', calories: 10_000 });
    check('the daily calorie cap holds', cap.status === 200 && cap2.status === 200 && cap3.status === 422 && cap3.body.error.code === 'DAY_LIMIT_EXCEEDED');

    const bad = await call('POST', `/api/v1/logs/${today}/entries`, { ...dal, calories: -5 });
    check('a negative value is refused', bad.status === 400);

    const demo = await call('POST', '/api/v1/demo-data', {});
    const week = await call('GET', '/api/v1/logs?limit=7');
    check('the sample week fills seven days', demo.body.days === 7 && week.body.logs.length === 7);
  } finally {
    server.close();
    await database.db.dropDatabase();
    await database.close();
    console.log(`\nDropped ${dbName}.`);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(failed.length === 0 ? `All ${results.length} checks passed. Your database works with Sattava.` : `${failed.length} of ${results.length} checks failed.`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
