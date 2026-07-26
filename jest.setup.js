process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_PROXY_BASE_URL = 'http://localhost:3000';

global.__mockGeminiGenerateContent = jest.fn();
