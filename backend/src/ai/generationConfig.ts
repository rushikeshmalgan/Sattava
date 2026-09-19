import type { AppConfig } from '../config';
import type { GenerationConfig } from './provider';

const thinking = (config: AppConfig): Pick<GenerationConfig, 'thinkingConfig'> =>
  config.thinkingLevel === 'off' ? {} : { thinkingConfig: { thinkingLevel: config.thinkingLevel } };

/**
 * Single source of truth for the vision request shape. The route and
 * `npm run check:models` both use it, so the model check probes exactly what
 * production sends.
 *
 * responseMimeType is intentionally not set: some model versions reject it and
 * return an empty response. JSON is enforced by validation instead.
 */
export const visionGenerationConfig = (config: AppConfig): GenerationConfig => ({
  temperature: 0.1,
  ...thinking(config),
});

export const textGenerationConfig = (config: AppConfig, temperature: number, extra: GenerationConfig = {}): GenerationConfig => ({
  temperature,
  ...thinking(config),
  ...extra,
});
