// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'backend/**', '.kilo/**', '.venv*/**'],
  },
  {
    // Anything that ships inside the app bundle. console.log there ends up in the device log of a release
    // build (adb logcat), which is how the signed-in user's id and phone number used to leak out of this app.
    // Failures are still reported with console.warn / console.error.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'services/**/*.{ts,tsx}', 'utils/**/*.{ts,tsx}', 'context/**/*.{ts,tsx}', 'config/**/*.{ts,tsx}', 'firebaseConfig.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node scripts (CommonJS) run outside the app bundle.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', require: 'readonly', module: 'writable', process: 'readonly', console: 'readonly' },
    },
  },
]);
