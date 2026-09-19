/**
 * Manual smoke test against the REAL Gemini API.
 *   npm run smoke:vision                 # synthetic image (verifies the pipeline, not accuracy)
 *   npm run smoke:vision -- photo.jpg    # a real food photo
 *
 * Boots the real app (real provider, real prompt, real validation) with a fake
 * token verifier so no Firebase login is needed. Never prints the API key.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { createLogger } from '../src/logger';
import { syntheticPng } from './lib/syntheticImage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

async function main() {
  const config = loadConfig();
  const lines: string[] = [];
  const logger = createLogger({ destination: { write: (m: string) => void lines.push(m) } });
  const app = createApp({
    config,
    logger,
    verifyToken: async () => ({ uid: 'smoke-user' }),
    provider: createGeminiRestProvider({ apiKey: config.geminiApiKey }),
  });

  const file = process.argv[2];
  const bytes = file ? fs.readFileSync(file) : syntheticPng();
  const mimeType = file ? MIME[path.extname(file).toLowerCase()] : 'image/png';
  if (!mimeType) throw new Error('Unsupported file extension');

  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const post = async () => {
    const t = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/vision/analyze-food`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer smoke' },
      body: JSON.stringify({ image: bytes.toString('base64'), mimeType }),
    });
    return { status: res.status, ms: Date.now() - t, body: (await res.json()) as any };
  };

  console.log(`chain: ${config.modelChain.join(' -> ')}  |  image: ${file ?? 'synthetic'} (${bytes.length} bytes)`);
  for (const label of ['request 1 (expect miss)', 'request 2 (expect cache hit)']) {
    const r = await post();
    console.log(`\n${label}: HTTP ${r.status} in ${r.ms}ms`);
    if (r.status === 200) {
      const { analysis: a, meta } = r.body;
      console.log(`  model=${meta.model} cached=${meta.cached} promptVersion=${meta.promptVersion}`);
      console.log(`  detected: ${a.items.map((i: any) => `${i.itemName} [${i.portionCategory}] ${i.estimatedNutrition.calories}kcal c${i.estimatedNutrition.carbs}/p${i.estimatedNutrition.protein}/f${i.estimatedNutrition.fat} conf=${i.confidence}`).join(' | ')}`);
    } else {
      console.log(`  error: ${JSON.stringify(r.body.error)}`);
    }
  }

  console.log('\nai.request log lines (what observability captured):');
  for (const l of lines.map((x) => JSON.parse(x)).filter((x) => x.event === 'ai.request')) {
    console.log(`  cache=${l.cache} outcome=${l.outcome} finalModel=${l.finalModel} latency=${l.latencyMs}ms attempts=${JSON.stringify(l.attempts.map((a: any) => `${a.model}:${a.outcome}${a.reason ? '/' + a.reason : ''}@${a.latencyMs}ms`))} warnings=${JSON.stringify(l.validation?.warnings ?? [])}`);
  }
  server.close();
}

main().catch((e) => {
  console.error('smoke failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
