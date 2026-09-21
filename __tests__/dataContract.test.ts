import {
  isDailyLogDoc,
  isDemoResponse,
  isLogResponse,
  isLogsResponse,
  isSavedLogResponse,
  isSavedUserResponse,
  isUserResponse,
} from '../services/dataContract';

const entry = { id: 'e1', type: 'food', name: 'Dal', calories: 300, createdAt: '2026-01-15T10:00:00.000Z' };
const day = {
  date: '2026-01-15',
  consumedCalories: 300,
  caloriesBurned: 0,
  totalCarbs: 40,
  totalProtein: 15,
  totalFat: 8,
  totalFiber: 6,
  totalWater: 0,
  logs: [entry],
  lastUpdated: '2026-01-15T10:00:00.000Z',
};

describe('isDailyLogDoc', () => {
  it('accepts a day as the server sends it', () => {
    expect(isDailyLogDoc(day)).toBe(true);
    expect(isDailyLogDoc({ ...day, logs: [] })).toBe(true);
  });

  it.each([
    ['null', null],
    ['text', 'not a day'],
    ['a list', []],
    ['no date', { ...day, date: undefined }],
    ['a total sent as text', { ...day, consumedCalories: '300' }],
    ['a missing total', { ...day, totalWater: undefined }],
    ['logs that is not a list', { ...day, logs: {} }],
    ['an entry without an id', { ...day, logs: [{ type: 'food' }] }],
    ['an entry without a type', { ...day, logs: [{ id: 'e1' }] }],
  ])('refuses %s', (_label, value) => {
    expect(isDailyLogDoc(value)).toBe(false);
  });
});

describe('response guards', () => {
  it('user: a profile or null, never anything else', () => {
    expect(isUserResponse({ user: { id: 'u1' } })).toBe(true);
    expect(isUserResponse({ user: null })).toBe(true);
    expect(isUserResponse({})).toBe(false);
    expect(isUserResponse({ user: {} })).toBe(false);
    expect(isUserResponse({ user: 'u1' })).toBe(false);
    expect(isUserResponse(null)).toBe(false);
  });

  it('saved user: the profile is required', () => {
    expect(isSavedUserResponse({ user: { id: 'u1' } })).toBe(true);
    expect(isSavedUserResponse({ user: null })).toBe(false);
  });

  it('log: a day or null', () => {
    expect(isLogResponse({ log: day })).toBe(true);
    expect(isLogResponse({ log: null })).toBe(true);
    expect(isLogResponse({})).toBe(false);
    expect(isLogResponse({ log: { date: '2026-01-15' } })).toBe(false);
  });

  it('saved log: the day is required', () => {
    expect(isSavedLogResponse({ log: day })).toBe(true);
    expect(isSavedLogResponse({ log: null })).toBe(false);
  });

  it('logs: a list of days', () => {
    expect(isLogsResponse({ logs: [day, day] })).toBe(true);
    expect(isLogsResponse({ logs: [] })).toBe(true);
    expect(isLogsResponse({ logs: [day, { date: 'x' }] })).toBe(false);
    expect(isLogsResponse({ logs: 'none' })).toBe(false);
    expect(isLogsResponse({})).toBe(false);
  });

  it('demo: a day count', () => {
    expect(isDemoResponse({ days: 7 })).toBe(true);
    expect(isDemoResponse({ days: '7' })).toBe(false);
  });

  it('a gateway page during a cold start is never mistaken for data', () => {
    const html = '<!DOCTYPE html><html><title>Service Unavailable</title></html>';
    for (const guard of [isUserResponse, isLogResponse, isLogsResponse, isSavedUserResponse, isSavedLogResponse, isDemoResponse]) {
      expect(guard(html)).toBe(false);
    }
  });
});
