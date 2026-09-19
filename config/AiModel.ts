import { tryModels, getGenerativeModel, MODEL_PRIORITY } from '../services/geminiClient';
import type { GeminiModelName } from '../services/geminiClient';

/**
 * Sattva AI Model configuration.
 *
 * Uses the shared Gemini client fallback chain instead of a single hardcoded model.
 * All consumers should use `generateText` or `generateJson` below rather than
 * importing `model` directly.
 */

export { MODEL_PRIORITY };

export const generateText = async (prompt: string): Promise<string | null> => {
  const { text, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.7 });
      const res = await model.generateContent(prompt);
      return res.response.text().trim();
    },
    'AiModel',
  );

  if (!text) {
    console.warn('[AiModel] generateText failed — no model responded', { failureCategory });
  }
  return text;
};

export const generateJson = async (prompt: string): Promise<any | null> => {
  const { text, modelUsed, failureCategory } = await tryModels(
    async (modelName) => {
      const model = getGenerativeModel(modelName, { temperature: 0.7, responseMimeType: 'application/json' });
      const res = await model.generateContent(prompt);
      const raw = res.response.text().trim();
      if (!raw) throw new Error('Empty response from model');
      return raw;
    },
    'AiModel',
  );

  if (!text) {
    console.warn('[AiModel] generateJson failed — no model responded', { failureCategory });
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    console.warn('[AiModel] Failed to parse JSON response:', (parseErr as any)?.message);
    console.warn('[AiModel] Raw response was:', text.slice(0, 300));
    return null;
  }
};
