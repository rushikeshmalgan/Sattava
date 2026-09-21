import { addLogEntry, fetchDailyLogs, loadDemoDays, removeLogEntry } from '../services/dataApi';
import { addExerciseLog, addFoodLog, deleteLogEntry, getStreakCount, loadDemoData } from '../services/logService';
import type { DailyLogDoc, LogEntryDoc } from '../types/data';
import { EXERCISE_LOG_TYPES, isExerciseLogType } from '../utils/logEntryTypes';

jest.mock('../services/dataApi', () => ({
  addLogEntry: jest.fn(),
  fetchDailyLogs: jest.fn(),
  loadDemoDays: jest.fn(),
  removeLogEntry: jest.fn(),
}));

const mockedAdd = addLogEntry as jest.Mock;
const mockedFetchDays = fetchDailyLogs as jest.Mock;
const mockedRemove = removeLogEntry as jest.Mock;
const mockedDemo = loadDemoDays as jest.Mock;

beforeEach(() => {
  mockedAdd.mockReset().mockResolvedValue({});
  mockedFetchDays.mockReset();
  mockedRemove.mockReset().mockResolvedValue({});
  mockedDemo.mockReset().mockResolvedValue(undefined);
});

describe('isExerciseLogType', () => {
  it.each(['exercise', 'cardio', 'weight', 'manual'])('treats %s as exercise', (type) => {
    expect(isExerciseLogType(type)).toBe(true);
  });

  it.each(['food', 'water', '', 'Exercise'])('does not treat %p as exercise', (type) => {
    expect(isExerciseLogType(type)).toBe(false);
  });

  it('is false for a missing or non-string type', () => {
    expect(isExerciseLogType(undefined)).toBe(false);
    expect(isExerciseLogType(null)).toBe(false);
    expect(isExerciseLogType(42)).toBe(false);
  });

  it('covers every subtype addExerciseLog can store', () => {
    // ExerciseData['type'] in logService.ts is 'cardio' | 'weight' | 'manual', and
    // the yoga screen writes 'exercise'. Adding a new subtype there means adding
    // it to EXERCISE_LOG_TYPES too; this pins the current set.
    expect([...EXERCISE_LOG_TYPES].sort()).toEqual(['cardio', 'exercise', 'manual', 'weight']);
  });
});

describe('addFoodLog', () => {
  const dal = { id: 'csv-12', name: 'Dal', calories: 300, carbs: 40, protein: 15, fat: 8, servingSize: '1 bowl' };

  it('sends the food as a log entry for that day, with the device time and no user id', async () => {
    await addFoodLog('2026-01-15', { ...dal, fiber: 6 });

    expect(mockedAdd).toHaveBeenCalledTimes(1);
    const [date, entry] = mockedAdd.mock.calls[0];
    expect(date).toBe('2026-01-15');
    expect(entry).toMatchObject({
      type: 'food',
      itemId: 'csv-12',
      name: 'Dal',
      calories: 300,
      carbs: 40,
      protein: 15,
      fat: 8,
      fiber: 6,
      servingSize: '1 bowl',
    });
    expect(typeof entry.time).toBe('string');
    expect(entry).not.toHaveProperty('userId');
    expect(entry).not.toHaveProperty('uid');
  });

  it('leaves fiber out when the food has none, and defaults the serving size', async () => {
    await addFoodLog('2026-01-15', { ...dal, servingSize: '' });

    const [, entry] = mockedAdd.mock.calls[0];
    expect(entry).not.toHaveProperty('fiber');
    expect(entry.servingSize).toBe('1 serving');
  });

  it('passes a failure on to the screen, which shows it', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedAdd.mockRejectedValue(new Error('offline'));

    await expect(addFoodLog('2026-01-15', dal)).rejects.toThrow('offline');
    consoleError.mockRestore();
  });
});

describe('addExerciseLog', () => {
  it.each(['cardio', 'weight', 'manual'] as const)('sends a %s exercise as that type', async (type) => {
    await addExerciseLog('2026-01-15', { id: 'x', type, name: 'Running', duration: 30, calories: 250, intensity: 'Medium' });

    expect(mockedAdd.mock.calls[0][1]).toMatchObject({
      type,
      itemId: 'x',
      name: 'Running',
      calories: 250,
      duration: 30,
      intensity: 'Medium',
    });
  });

  it('never sends a negative duration', async () => {
    await addExerciseLog('2026-01-15', { id: 'x', type: 'manual', name: 'Manual Exercise', duration: -5, calories: 100, intensity: 'N/A' });

    expect(mockedAdd.mock.calls[0][1].duration).toBe(0);
  });
});

describe('deleteLogEntry', () => {
  it('removes the entry by its own id', async () => {
    await deleteLogEntry('2026-01-15', 'entry-1');

    expect(mockedRemove).toHaveBeenCalledWith('2026-01-15', 'entry-1');
  });

  it('passes a failure on so the screen can put the row back', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedRemove.mockRejectedValue(new Error('offline'));

    await expect(deleteLogEntry('2026-01-15', 'entry-1')).rejects.toThrow('offline');
    consoleError.mockRestore();
  });
});

describe('loadDemoData', () => {
  it('asks the server for the sample week', async () => {
    await loadDemoData();
    expect(mockedDemo).toHaveBeenCalledTimes(1);
  });
});

describe('getStreakCount', () => {
  // Only Date is faked; the promises in these tests need real scheduling.
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date(2026, 0, 15, 12, 0, 0),
      doNotFake: [
        'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
        'setTimeout', 'clearTimeout',
      ],
    });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const dateAgo = (daysAgo: number): string => {
    const d = new Date();
    d.setDate(new Date().getDate() - daysAgo);
    return d.toISOString().split('T')[0]!;
  };

  const entry = (type: LogEntryDoc['type']): LogEntryDoc => ({ id: `id-${type}`, type, name: type, createdAt: '2026-01-15T10:00:00.000Z' });

  /** A day that meets the calorie and water rules (target 2,000 kcal and 2,000 ml), with these entries. */
  const day = (daysAgo: number, types: LogEntryDoc['type'][], over: Partial<DailyLogDoc> = {}): DailyLogDoc => ({
    date: dateAgo(daysAgo),
    consumedCalories: 2000,
    caloriesBurned: 0,
    totalCarbs: 0,
    totalProtein: 0,
    totalFat: 0,
    totalFiber: 0,
    totalWater: 2000,
    logs: types.map(entry),
    lastUpdated: '2026-01-15T10:00:00.000Z',
    ...over,
  });

  it.each(['exercise', 'cardio', 'weight', 'manual'] as const)('counts a day whose exercise was logged as %s', async (type) => {
    mockedFetchDays.mockResolvedValue([day(0, [type])]);

    expect(await getStreakCount(2000, 2000)).toBe(1);
  });

  it('counts consecutive days across different exercise types', async () => {
    mockedFetchDays.mockResolvedValue([day(0, ['cardio']), day(1, ['weight']), day(2, ['manual'])]);

    expect(await getStreakCount(2000, 2000)).toBe(3);
  });

  it('does not count a day that only has food and water entries', async () => {
    mockedFetchDays.mockResolvedValue([day(0, ['food', 'water'])]);

    expect(await getStreakCount(2000, 2000)).toBe(0);
  });

  it('still requires the calorie and water rules, even with an exercise logged', async () => {
    mockedFetchDays.mockResolvedValue([day(0, ['cardio'], { totalWater: 100 })]);
    expect(await getStreakCount(2000, 2000)).toBe(0);

    mockedFetchDays.mockResolvedValue([day(0, ['cardio'], { consumedCalories: 3000 })]);
    expect(await getStreakCount(2000, 2000)).toBe(0);
  });

  it('gives today until the day is over: an unfinished today does not break the streak', async () => {
    mockedFetchDays.mockResolvedValue([day(0, ['food']), day(1, ['cardio']), day(2, ['cardio'])]);

    expect(await getStreakCount(2000, 2000)).toBe(2);
  });

  it('stops at the first missing or unmet earlier day', async () => {
    mockedFetchDays.mockResolvedValue([day(0, ['cardio']), day(1, ['cardio']), day(3, ['cardio'])]);
    expect(await getStreakCount(2000, 2000)).toBe(2);

    mockedFetchDays.mockResolvedValue([day(0, ['cardio']), day(1, ['food']), day(2, ['cardio'])]);
    expect(await getStreakCount(2000, 2000)).toBe(1);
  });

  it('asks for the whole 30-day window in one request', async () => {
    mockedFetchDays.mockResolvedValue([]);

    await getStreakCount(2000, 2000);

    expect(mockedFetchDays).toHaveBeenCalledTimes(1);
    expect(mockedFetchDays).toHaveBeenCalledWith({ from: dateAgo(29), to: dateAgo(0), limit: 30 });
  });

  it('is 0 with no data', async () => {
    mockedFetchDays.mockResolvedValue([]);

    expect(await getStreakCount(2000, 2000)).toBe(0);
  });

  it('returns 0 instead of throwing when the request fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedFetchDays.mockRejectedValue(new Error('offline'));

    expect(await getStreakCount(2000, 2000)).toBe(0);
    consoleError.mockRestore();
  });
});
