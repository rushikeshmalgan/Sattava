import { textGenerationConfig, visionGenerationConfig } from '../src/ai/generationConfig';
import { testConfig } from './helpers';

describe('visionGenerationConfig', () => {
  it('uses a low temperature and the default minimal thinking level', () => {
    expect(visionGenerationConfig(testConfig())).toEqual({ temperature: 0.1, thinkingConfig: { thinkingLevel: 'minimal' } });
  });

  it.each(['minimal', 'low'] as const)('passes thinkingLevel=%s through', (level) => {
    expect(visionGenerationConfig(testConfig({ GEMINI_THINKING_LEVEL: level })).thinkingConfig).toEqual({ thinkingLevel: level });
  });

  it('omits thinkingConfig entirely when set to off', () => {
    const cfg = visionGenerationConfig(testConfig({ GEMINI_THINKING_LEVEL: 'off' }));
    expect(cfg).toEqual({ temperature: 0.1 });
    expect('thinkingConfig' in cfg).toBe(false);
  });

  it('never sets responseMimeType: some models reject it, so JSON is enforced by validation instead', () => {
    for (const level of ['minimal', 'low', 'off']) {
      expect('responseMimeType' in visionGenerationConfig(testConfig({ GEMINI_THINKING_LEVEL: level }))).toBe(false);
    }
  });
});

describe('textGenerationConfig', () => {
  it('uses the task temperature and the configured thinking level', () => {
    expect(textGenerationConfig(testConfig(), 0.8)).toEqual({ temperature: 0.8, thinkingConfig: { thinkingLevel: 'minimal' } });
  });

  it('honours off and merges extra options', () => {
    expect(textGenerationConfig(testConfig({ GEMINI_THINKING_LEVEL: 'off' }), 0.7, { maxOutputTokens: 80 })).toEqual({
      temperature: 0.7,
      maxOutputTokens: 80,
    });
  });

  it('lets an explicit extra override a default', () => {
    expect(textGenerationConfig(testConfig(), 0.7, { temperature: 0.2 }).temperature).toBe(0.2);
  });
});
