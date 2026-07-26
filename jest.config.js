/** @type {import('jest').Config} */
module.exports = {
  // jest-expo preset handles all Babel transforms for React Native —
  // TS, JSX, asset mocks, native module stubs. Do NOT add ts-jest here.
  preset: 'jest-expo',

  // Set env vars before any module is loaded (so module-level consts pick them up)
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Only run files inside __tests__ directories
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],

  // Map the @/* alias from tsconfig.json paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Silence noisy React Native module warnings in test output
  setupFilesAfterFramework: [],

  // Collect coverage from service files only (the tested units)
  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.d.ts',
  ],
};
