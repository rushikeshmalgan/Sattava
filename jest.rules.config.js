/**
 * Jest config for the Firestore security-rules tests (firestore-tests/).
 * Separate from jest.config.js because these tests need the Firestore
 * emulator; run them with `npm run test:rules`, which starts the emulator.
 *
 * Plain Node environment (no React Native preset). jest-expo/node does not
 * enable TypeScript on its own in a project without a Babel config, so the
 * same Expo Babel preset the app tests use is supplied explicitly.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firestore-tests/**/*.test.ts'],
  testTimeout: 30000,
  // Keep the backend package and any stray worktree copy out of Jest's module map.
  modulePathIgnorePatterns: ['<rootDir>/backend/', '<rootDir>/.kilo/'],
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        caller: { name: 'metro', bundler: 'metro', platform: 'web', isServer: true },
        configFile: require.resolve('expo/internal/babel-preset.js'),
      },
    ],
  },
};
