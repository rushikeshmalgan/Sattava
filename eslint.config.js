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
      // alert/confirm/prompt are browser APIs. On the web build they open a modal that blocks the whole
      // page until dismissed, and on native React Native's polyfill gives a dialog with no title.
      // Alert.alert from react-native works on both.
      'no-restricted-globals': [
        'error',
        { name: 'alert', message: 'Use Alert.alert from react-native: alert() blocks the page on web.' },
        { name: 'confirm', message: 'Use Alert.alert with buttons from react-native.' },
        { name: 'prompt', message: 'Use a TextInput in a Modal; prompt() blocks the page on web.' },
      ],
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
