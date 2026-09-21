import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../config/api';

/** Where the app finds the backend: the configured URL, the LAN in development, or localhost in a browser. */

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { hostUri: undefined }, manifest2: null, manifest: null },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

const constants = Constants as unknown as { expoConfig: { hostUri?: string } };
const platform = Platform as unknown as { OS: string };
const globals = globalThis as unknown as { __DEV__?: boolean };

const savedUrl = process.env.EXPO_PUBLIC_PROXY_BASE_URL;
const savedDev = globals.__DEV__;

beforeEach(() => {
  delete process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  constants.expoConfig = { hostUri: undefined };
  platform.OS = 'ios';
  globals.__DEV__ = true;
});
afterAll(() => {
  if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_PROXY_BASE_URL;
  else process.env.EXPO_PUBLIC_PROXY_BASE_URL = savedUrl;
  globals.__DEV__ = savedDev;
});

describe('getApiBaseUrl', () => {
  it('uses the configured URL, without trailing slashes, ahead of anything else', () => {
    process.env.EXPO_PUBLIC_PROXY_BASE_URL = '  https://api.example.com//  ';
    constants.expoConfig = { hostUri: '192.168.1.5:8081' };
    platform.OS = 'web';

    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('on a phone in development, finds the backend on the same machine as Metro', () => {
    constants.expoConfig = { hostUri: '192.168.1.5:8081' };

    expect(getApiBaseUrl()).toBe('http://192.168.1.5:3000');
  });

  it('on a phone, never treats localhost as the backend (localhost there is the phone itself)', () => {
    constants.expoConfig = { hostUri: 'localhost:8081' };

    expect(() => getApiBaseUrl()).toThrow('Cannot determine the API URL');
    constants.expoConfig = { hostUri: '127.0.0.1:8081' };
    expect(() => getApiBaseUrl()).toThrow('Cannot determine the API URL');
  });

  it('in a browser on the same machine (Expo web), localhost is the backend', () => {
    platform.OS = 'web';
    constants.expoConfig = { hostUri: 'localhost:8081' };
    expect(getApiBaseUrl()).toBe('http://localhost:3000');

    constants.expoConfig = { hostUri: undefined };
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('in a browser opened from another device, uses the machine the page came from', () => {
    platform.OS = 'web';
    constants.expoConfig = { hostUri: '192.168.1.5:8081' };

    expect(getApiBaseUrl()).toBe('http://192.168.1.5:3000');
  });

  it('never guesses localhost in a release build: a missing URL is an error', () => {
    platform.OS = 'web';
    globals.__DEV__ = false;

    expect(() => getApiBaseUrl()).toThrow('Cannot determine the API URL');
  });

  it('fails with a message that says what to set when nothing can be found', () => {
    expect(() => getApiBaseUrl()).toThrow(/EXPO_PUBLIC_PROXY_BASE_URL/);
  });
});
