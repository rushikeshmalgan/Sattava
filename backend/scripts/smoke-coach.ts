/**
 * Manual smoke test of every /api/v1/coach task against the REAL Gemini API.
 *   npm run smoke:coach
 * Uses a fake token verifier; never prints the API key.
 */
import path from 'node:path';
import dotenv from 'dotenv';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { createLogger } from '../src/logger';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const n = { calories: 1200, protein: 40, carbs: 150, fat: 30 };
const CASES: Record<string, unknown> = {
  diet_insight: { consumed: n, targets: { calories: 2000, protein: 60, carbs: 250, fat: 70 } },
  daily_tip: { calories: 1200, water: 1500, steps: 4000 },
  diet_score_explanation: { score: 72, calories: 1800, protein: 50, carbs: 220, fat: 60, fiber: 20, water: 1800 },
  weekly_report: { daysLogged: 5, avgCals: 1850, highestProteinGrams: 80, highestProteinDay: '2026-01-05' },
  voice_coach: { transcript: 'I ate 2 rotis and a bowl of dal' },
  profile_plan: {
    gender: 'Female', goal: 'Lose Weight', activityLevel: '3-4 Days / Week',
    birthdate: { day: '14', month: '3', year: '1999' }, heightFeet: '5', heightInches: '4', weightKg: '62',
  },
};

async function main() {
  const config = loadConfig();
  const lines: string[] = [];
  const app = createApp({
    config,
    logger: createLogger({ destination: { write: (m: string) => void lines.push(m) } }),
    verifyToken: async () => ({ uid: 'smoke-user' }),
    provider: createGeminiRestProvider({ apiKey: config.geminiApiKey }),
  });
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;

  for (const [task, input] of Object.entries(CASES)) {
    const t = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/coach/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer smoke' },
      body: JSON.stringify({ task, input }),
    });
    const body = (await res.json()) as any;
    const out = res.ok ? JSON.stringify(body.text ?? body.plan).replace(/\s+/g, ' ').slice(0, 230) : JSON.stringify(body.error);
    console.log(`\n${task}: HTTP ${res.status} ${Date.now() - t}ms model=${body.meta?.model ?? '-'}\n  ${out}`);
  }

  const events = lines.map((l) => JSON.parse(l)).filter((l) => l.event === 'ai.request');
  console.log('\nattempt summary:', events.map((e) => `${e.route}=${e.attempts.map((a: any) => `${a.model}:${a.outcome}${a.reason ? '/' + a.reason : ''}`).join('>')}`).join(' | '));
  server.close();
}
main().catch((e) => { console.error('smoke failed:', e instanceof Error ? e.message : e); process.exit(1); });
