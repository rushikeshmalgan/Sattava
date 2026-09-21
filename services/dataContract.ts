import type { DailyLogDoc, UserDoc } from '../types/data';

/*
 * Guards for what the data API returns. The server is trusted to send its own schema, but a cold-start gateway
 * page, an old server or a proxy must never be mistaken for data, so anything that does not have the expected
 * shape is treated as an INVALID_RESPONSE rather than being handed to a screen.
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const TOTALS = ['consumedCalories', 'caloriesBurned', 'totalCarbs', 'totalProtein', 'totalFat', 'totalFiber', 'totalWater'] as const;

export const isDailyLogDoc = (value: unknown): value is DailyLogDoc =>
  isObject(value) &&
  typeof value.date === 'string' &&
  TOTALS.every((key) => typeof value[key] === 'number') &&
  Array.isArray(value.logs) &&
  value.logs.every((entry) => isObject(entry) && typeof entry.id === 'string' && typeof entry.type === 'string');

const isUserDoc = (value: unknown): value is UserDoc => isObject(value) && typeof value.id === 'string';

export const isUserResponse = (json: unknown): json is { user: UserDoc | null } =>
  isObject(json) && 'user' in json && (json.user === null || isUserDoc(json.user));

export const isSavedUserResponse = (json: unknown): json is { user: UserDoc } =>
  isObject(json) && isUserDoc(json.user);

export const isLogResponse = (json: unknown): json is { log: DailyLogDoc | null } =>
  isObject(json) && 'log' in json && (json.log === null || isDailyLogDoc(json.log));

export const isSavedLogResponse = (json: unknown): json is { log: DailyLogDoc } =>
  isObject(json) && isDailyLogDoc(json.log);

export const isLogsResponse = (json: unknown): json is { logs: DailyLogDoc[] } =>
  isObject(json) && Array.isArray(json.logs) && json.logs.every(isDailyLogDoc);

export const isDemoResponse = (json: unknown): json is { days: number } =>
  isObject(json) && typeof json.days === 'number';
