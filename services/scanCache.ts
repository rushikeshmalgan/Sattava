import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'scan-cache-v2';
const CACHE_SCHEMA_VERSION = 2;
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type CacheEnvelope<T> = {
  version: number;
  createdAt: number;
  value: T;
};

const buildKey = (kind: string, identifier: string) => `${CACHE_PREFIX}:${kind}:${identifier}`;

const readCache = async <T>(key: string, ttlMs = DEFAULT_TTL_MS): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.createdAt || !parsed?.value || parsed?.version !== CACHE_SCHEMA_VERSION) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    if (Date.now() - parsed.createdAt > ttlMs) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch (error) {
    console.warn('Failed to read scan cache:', error);
    return null;
  }
};

const writeCache = async <T>(key: string, value: T): Promise<void> => {
  try {
    const envelope: CacheEnvelope<T> = {
      version: CACHE_SCHEMA_VERSION,
      createdAt: Date.now(),
      value,
    };

    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('Failed to write scan cache:', error);
  }
};

export const getCachedBarcodeResult = async <T>(barcode: string): Promise<T | null> => {
  return readCache<T>(buildKey('barcode', barcode.trim()));
};

export const setCachedBarcodeResult = async <T>(barcode: string, value: T): Promise<void> => {
  return writeCache(buildKey('barcode', barcode.trim()), value);
};

export const getCachedImageResult = async <T>(imageKey: string): Promise<T | null> => {
  return readCache<T>(buildKey('image', imageKey));
};

export const setCachedImageResult = async <T>(imageKey: string, value: T): Promise<void> => {
  return writeCache(buildKey('image', imageKey), value);
};
