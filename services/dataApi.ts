import type { DailyLogDoc, LogsQuery, NewLogEntry, SyncUserInput, UserDoc, UserPatch } from '../types/data';
import { apiRequest } from './apiClient';
import { isDemoResponse, isLogResponse, isLogsResponse, isSavedLogResponse, isSavedUserResponse, isUserResponse } from './dataContract';
import { emitInvalidate } from './dataEvents';

/**
 * Users and daily logs, over the authenticated Sattava API. Nothing here sends a user id: the server takes the
 * identity from the Firebase ID token, so there is no way to ask for someone else's data.
 *
 * Long enough for a cold-starting server, short enough that a stuck request does not hang a screen.
 */
const TIMEOUT_MS = 30_000;

// ── the signed-in user ──────────────────────────────────────────────────────

/** The profile, or null before it has been created. */
export const fetchCurrentUser = async (): Promise<UserDoc | null> => {
  const res = await apiRequest('GET', '/api/v1/me', { timeoutMs: TIMEOUT_MS, accept: isUserResponse });
  return res.user;
};

/** Called on every sign-in: creates the profile the first time and records the login. */
export const syncCurrentUser = async (input: SyncUserInput): Promise<UserDoc> => {
  const res = await apiRequest('POST', '/api/v1/me/sync', { body: input, timeoutMs: TIMEOUT_MS, accept: isSavedUserResponse });
  emitInvalidate('user');
  return res.user;
};

export const patchCurrentUser = async (patch: UserPatch): Promise<UserDoc> => {
  const res = await apiRequest('PATCH', '/api/v1/me', { body: patch, timeoutMs: TIMEOUT_MS, accept: isSavedUserResponse });
  emitInvalidate('user');
  return res.user;
};

// ── daily logs ──────────────────────────────────────────────────────────────

/** One day, or null when nothing has been logged on it. */
export const fetchDailyLog = async (date: string): Promise<DailyLogDoc | null> => {
  const res = await apiRequest('GET', `/api/v1/logs/${encodeURIComponent(date)}`, { timeoutMs: TIMEOUT_MS, accept: isLogResponse });
  return res.log;
};

/** Days that have a log, newest first. */
export const fetchDailyLogs = async (query: LogsQuery = {}): Promise<DailyLogDoc[]> => {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await apiRequest('GET', `/api/v1/logs${qs ? `?${qs}` : ''}`, { timeoutMs: TIMEOUT_MS, accept: isLogsResponse });
  return res.logs;
};

/** Adds an entry to a day and returns the updated day. */
export const addLogEntry = async (date: string, entry: NewLogEntry): Promise<DailyLogDoc> => {
  const res = await apiRequest('POST', `/api/v1/logs/${encodeURIComponent(date)}/entries`, { body: entry, timeoutMs: TIMEOUT_MS, accept: isSavedLogResponse });
  emitInvalidate(`log:${date}`);
  return res.log;
};

/** Removes an entry and takes exactly what it added back out of the totals. */
export const removeLogEntry = async (date: string, entryId: string): Promise<DailyLogDoc> => {
  const res = await apiRequest('DELETE', `/api/v1/logs/${encodeURIComponent(date)}/entries/${encodeURIComponent(entryId)}`, { timeoutMs: TIMEOUT_MS, accept: isSavedLogResponse });
  emitInvalidate(`log:${date}`);
  return res.log;
};

/** Replaces the last seven days with sample data, for presentations. */
export const loadDemoDays = async (): Promise<void> => {
  await apiRequest('POST', '/api/v1/demo-data', { body: {}, timeoutMs: TIMEOUT_MS, accept: isDemoResponse });
  emitInvalidate('logs');
};
