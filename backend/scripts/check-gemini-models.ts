/**
 * Verifies GEMINI_MODEL_CHAIN against the live provider:
 *   npm run check:models
 *
 * 1. Lists models from the provider's model-list API.
 * 2. Sends a real vision request to each chain model using the EXACT
 *    production request shape (visionGenerationConfig).
 *
 * Listing alone is not enough: some models are still listed but return 404
 * "no longer available to new users". Exits non-zero if any chain model is
 * unusable for a configuration reason (not found, bad request, bad key), so
 * this can gate a deploy. Transient overload (503) and rate limits only warn.
 */
import path from 'node:path';
import dotenv from 'dotenv';
import { loadConfig } from '../src/config';
import { visionGenerationConfig } from '../src/ai/generationConfig';
import { createGeminiRestProvider } from '../src/ai/geminiRest';
import { ProviderError } from '../src/ai/provider';
import { VISION_PROMPT } from '../src/ai/visionPrompt';
import { syntheticPng } from './lib/syntheticImage';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listModels(apiKey: string): Promise<Set<string>> {
  const names = new Set<string>();
  let pageToken = '';
  do {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ''}`,
      { headers: { 'x-goog-api-key': apiKey } },
    );
    if (!res.ok) throw new Error(`model list failed: HTTP ${res.status}`);
    const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[]; nextPageToken?: string };
    for (const m of body.models ?? []) {
      if (m.supportedGenerationMethods?.includes('generateContent')) names.add(m.name.replace('models/', ''));
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return names;
}

async function main() {
  const config = loadConfig();
  const listed = await listModels(config.geminiApiKey);
  const provider = createGeminiRestProvider({ apiKey: config.geminiApiKey });
  const image = syntheticPng().toString('base64');
  let hardFailures = 0;

  console.log(`Chain: ${config.modelChain.join(' -> ')}  (thinking=${config.thinkingLevel})\n`);
  for (const model of config.modelChain) {
    const inList = listed.has(model);
    const started = Date.now();
    try {
      await provider.generate({
        model,
        parts: [{ text: VISION_PROMPT }, { inlineData: { mimeType: 'image/png', data: image } }],
        generationConfig: visionGenerationConfig(config),
        signal: AbortSignal.timeout(30_000),
      });
      console.log(`  OK    ${model}  ${Date.now() - started}ms  (listed: ${inList})`);
    } catch (err) {
      const e = err as ProviderError;
      const transient = e.category === 'RATE_LIMITED' || e.reason === 'MODEL_OVERLOADED' || e.category === 'NETWORK_ERROR';
      if (!transient) hardFailures += 1;
      console.log(`  ${transient ? 'WARN' : 'FAIL'}  ${model}  ${e.category}/${e.reason}  (listed: ${inList})  ${e.detail ?? ''}`);
    }
  }
  console.log(hardFailures ? `\n${hardFailures} chain model(s) unusable. Update GEMINI_MODEL_CHAIN.` : '\nAll chain models usable.');
  process.exit(hardFailures ? 1 : 0);
}

main().catch((e) => {
  console.error('check failed:', e instanceof Error ? e.message : e);
  process.exit(2);
});
