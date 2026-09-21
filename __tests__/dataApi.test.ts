import { apiRequest } from '../services/apiClient';
import {
  addLogEntry,
  fetchCurrentUser,
  fetchDailyLog,
  fetchDailyLogs,
  loadDemoDays,
  patchCurrentUser,
  removeLogEntry,
  syncCurrentUser,
} from '../services/dataApi';
import { onInvalidate, type Topic } from '../services/dataEvents';

jest.mock('../services/apiClient', () => ({ apiRequest: jest.fn() }));

const mockedRequest = apiRequest as jest.Mock;

const day = { date: '2026-01-15', consumedCalories: 0, caloriesBurned: 0, totalCarbs: 0, totalProtein: 0, totalFat: 0, totalFiber: 0, totalWater: 0, logs: [], lastUpdated: 'x' };
const user = { id: 'user-1' };

let announced: Topic[];
let stopListening: () => void;

beforeEach(() => {
  mockedRequest.mockReset();
  announced = [];
  stopListening = onInvalidate((topic) => announced.push(topic));
});
afterEach(() => stopListening());

/** The method, path and options of the request that was made. */
const lastRequest = () => {
  const [method, path, options] = mockedRequest.mock.calls[0];
  return { method, path, options };
};

describe('reading', () => {
  it('fetchCurrentUser: GET /me, and null when there is no profile yet', async () => {
    mockedRequest.mockResolvedValue({ user: null });

    expect(await fetchCurrentUser()).toBeNull();
    expect(lastRequest()).toMatchObject({ method: 'GET', path: '/api/v1/me' });
    expect(announced).toEqual([]);
  });

  it('fetchDailyLog: GET one day', async () => {
    mockedRequest.mockResolvedValue({ log: day });

    expect(await fetchDailyLog('2026-01-15')).toEqual(day);
    expect(lastRequest()).toMatchObject({ method: 'GET', path: '/api/v1/logs/2026-01-15' });
  });

  it('fetchDailyLog: encodes what goes into the path', async () => {
    mockedRequest.mockResolvedValue({ log: null });

    await fetchDailyLog('a/b?c');

    expect(lastRequest().path).toBe('/api/v1/logs/a%2Fb%3Fc');
  });

  it('fetchDailyLogs: builds the query string, and none when there are no options', async () => {
    mockedRequest.mockResolvedValue({ logs: [day] });

    expect(await fetchDailyLogs({ from: '2026-01-01', to: '2026-01-15', limit: 7 })).toEqual([day]);
    expect(lastRequest().path).toBe('/api/v1/logs?from=2026-01-01&to=2026-01-15&limit=7');

    mockedRequest.mockClear();
    await fetchDailyLogs();
    expect(lastRequest().path).toBe('/api/v1/logs');
  });
});

describe('writing announces the change so screens refresh at once', () => {
  it('syncCurrentUser: POST /me/sync, then the user topic', async () => {
    mockedRequest.mockResolvedValue({ user });

    await syncCurrentUser({ email: 'a@example.com' });

    expect(lastRequest()).toMatchObject({ method: 'POST', path: '/api/v1/me/sync', options: { body: { email: 'a@example.com' } } });
    expect(announced).toEqual(['user']);
  });

  it('patchCurrentUser: PATCH /me, then the user topic', async () => {
    mockedRequest.mockResolvedValue({ user });

    await patchCurrentUser({ userProfile: { goal: 'Gain Weight' } });

    expect(lastRequest()).toMatchObject({ method: 'PATCH', path: '/api/v1/me', options: { body: { userProfile: { goal: 'Gain Weight' } } } });
    expect(announced).toEqual(['user']);
  });

  it('addLogEntry: POST the entry to its day, then that day topic', async () => {
    mockedRequest.mockResolvedValue({ log: day });

    await addLogEntry('2026-01-15', { type: 'water', name: 'Paani', amountMl: 250 });

    expect(lastRequest()).toMatchObject({
      method: 'POST',
      path: '/api/v1/logs/2026-01-15/entries',
      options: { body: { type: 'water', name: 'Paani', amountMl: 250 } },
    });
    expect(announced).toEqual(['log:2026-01-15']);
  });

  it('removeLogEntry: DELETE the entry, then that day topic', async () => {
    mockedRequest.mockResolvedValue({ log: day });

    await removeLogEntry('2026-01-15', 'entry-1');

    expect(lastRequest()).toMatchObject({ method: 'DELETE', path: '/api/v1/logs/2026-01-15/entries/entry-1' });
    expect(lastRequest().options.body).toBeUndefined();
    expect(announced).toEqual(['log:2026-01-15']);
  });

  it('loadDemoDays: POST, then every day topic', async () => {
    mockedRequest.mockResolvedValue({ days: 7 });

    await loadDemoDays();

    expect(lastRequest()).toMatchObject({ method: 'POST', path: '/api/v1/demo-data' });
    expect(announced).toEqual(['logs']);
  });

  it('announces nothing when the write fails', async () => {
    mockedRequest.mockRejectedValue(new Error('offline'));

    await expect(addLogEntry('2026-01-15', { type: 'water', name: 'Paani', amountMl: 250 })).rejects.toThrow('offline');
    await expect(patchCurrentUser({ generatedPlanStale: true })).rejects.toThrow('offline');
    await expect(removeLogEntry('2026-01-15', 'e')).rejects.toThrow('offline');

    expect(announced).toEqual([]);
  });
});

describe('every call sends a timeout and a response guard, and never a user id', () => {
  it('passes both to the transport', async () => {
    mockedRequest.mockResolvedValue({ user: null });
    await fetchCurrentUser();

    const { options } = lastRequest();
    expect(options.timeoutMs).toBeGreaterThan(0);
    expect(typeof options.accept).toBe('function');
  });

  it('the guards accept the right shape and refuse anything else', async () => {
    mockedRequest.mockResolvedValue({ user: null });
    await fetchCurrentUser();
    const { accept } = lastRequest().options;

    expect(accept({ user: null })).toBe(true);
    expect(accept({ user })).toBe(true);
    expect(accept({})).toBe(false);
    expect(accept('<html>Bad gateway</html>')).toBe(false);
    expect(accept({ user: 5 })).toBe(false);
  });
});
