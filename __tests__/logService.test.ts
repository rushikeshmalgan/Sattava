import { getDoc, setDoc } from 'firebase/firestore';
import { deleteFoodLog, getStreakCount } from '../services/logService';
import { EXERCISE_LOG_TYPES, isExerciseLogType } from '../utils/logEntryTypes';

jest.mock('../firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  arrayRemove: jest.fn((value: unknown) => ({ op: 'arrayRemove', value })),
  arrayUnion: jest.fn((value: unknown) => ({ op: 'arrayUnion', value })),
  doc: jest.fn((...segments: unknown[]) => ({ path: segments.slice(1).join('/') })),
  getDoc: jest.fn(),
  increment: jest.fn((n: number) => ({ op: 'increment', n })),
  setDoc: jest.fn(async () => undefined),
}));

const mockedGetDoc = getDoc as unknown as jest.Mock;
const mockedSetDoc = setDoc as unknown as jest.Mock;

// A day that meets the calorie and water rules, with the given log entries.
const daySnapshot = (logs: { type: string }[]) => ({
  exists: () => true,
  data: () => ({ consumedCalories: 2000, totalWater: 2000, logs }),
});
const noSnapshot = { exists: () => false, data: () => undefined };

beforeEach(() => {
  mockedGetDoc.mockReset();
  mockedSetDoc.mockClear();
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

describe('getStreakCount', () => {
  it.each(['exercise', 'cardio', 'weight', 'manual'])(
    'counts a day whose exercise was logged as %s',
    async (type) => {
      mockedGetDoc.mockResolvedValueOnce(daySnapshot([{ type }])).mockResolvedValue(noSnapshot);

      expect(await getStreakCount('user-1', 2000, 2000)).toBe(1);
    }
  );

  it('counts consecutive days across different exercise types', async () => {
    mockedGetDoc
      .mockResolvedValueOnce(daySnapshot([{ type: 'cardio' }]))
      .mockResolvedValueOnce(daySnapshot([{ type: 'weight' }]))
      .mockResolvedValueOnce(daySnapshot([{ type: 'manual' }]))
      .mockResolvedValue(noSnapshot);

    expect(await getStreakCount('user-1', 2000, 2000)).toBe(3);
  });

  it('does not count a day that only has food and water entries', async () => {
    mockedGetDoc
      .mockResolvedValueOnce(daySnapshot([{ type: 'food' }, { type: 'water' }]))
      .mockResolvedValue(noSnapshot);

    expect(await getStreakCount('user-1', 2000, 2000)).toBe(0);
  });

  it('still requires the calorie and water rules, even with an exercise logged', async () => {
    const underWater = {
      exists: () => true,
      data: () => ({ consumedCalories: 2000, totalWater: 100, logs: [{ type: 'cardio' }] }),
    };
    mockedGetDoc.mockResolvedValueOnce(underWater).mockResolvedValue(noSnapshot);

    expect(await getStreakCount('user-1', 2000, 2000)).toBe(0);
  });

  it('returns 0 instead of throwing when Firestore fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedGetDoc.mockRejectedValue(new Error('offline'));

    expect(await getStreakCount('user-1', 2000, 2000)).toBe(0);
    consoleError.mockRestore();
  });
});

describe('deleteFoodLog', () => {
  const written = () => {
    expect(mockedSetDoc).toHaveBeenCalledTimes(1);
    const [ref, payload, options] = mockedSetDoc.mock.calls[0];
    return { ref, payload, options };
  };

  it.each(['exercise', 'cardio', 'weight', 'manual'])(
    'takes the calories back off the burned total when a %s entry is removed',
    async (type) => {
      const entry = { id: 'e1', name: 'Morning run', calories: 250, type, time: '07:00 AM' };

      await deleteFoodLog('user-1', '2026-01-05', entry);

      const { ref, payload, options } = written();
      expect(ref).toEqual({ path: 'users/user-1/dailyLogs/2026-01-05' });
      expect(options).toEqual({ merge: true });
      expect(payload.logs).toEqual({ op: 'arrayRemove', value: entry });
      expect(payload.caloriesBurned).toEqual({ op: 'increment', n: -250 });
      expect(payload).not.toHaveProperty('consumedCalories');
    }
  );

  it('reverses consumed calories and macros for a food entry, not calories burned', async () => {
    await deleteFoodLog('user-1', '2026-01-05', {
      id: 'f1',
      name: 'Dal',
      calories: 300,
      carbs: 40,
      protein: 15,
      fat: 8,
      fiber: 6,
      type: 'food',
    });

    const { payload } = written();
    expect(payload.consumedCalories).toEqual({ op: 'increment', n: -300 });
    expect(payload.totalCarbs).toEqual({ op: 'increment', n: -40 });
    expect(payload.totalProtein).toEqual({ op: 'increment', n: -15 });
    expect(payload.totalFat).toEqual({ op: 'increment', n: -8 });
    expect(payload.totalFiber).toEqual({ op: 'increment', n: -6 });
    expect(payload).not.toHaveProperty('caloriesBurned');
  });

  it('treats an entry with no type as food', async () => {
    await deleteFoodLog('user-1', '2026-01-05', { id: 'f2', name: 'Roti', calories: 120 });

    const { payload } = written();
    expect(payload.consumedCalories).toEqual({ op: 'increment', n: -120 });
    expect(payload).not.toHaveProperty('caloriesBurned');
  });

  it('reverses the water total for a water entry', async () => {
    await deleteFoodLog('user-1', '2026-01-05', {
      id: 'w1',
      name: 'Paani',
      calories: 0,
      type: 'water',
      amount: '500ml',
    });

    const { payload } = written();
    expect(payload.totalWater).toEqual({ op: 'increment', n: -500 });
    expect(payload).not.toHaveProperty('caloriesBurned');
    expect(payload).not.toHaveProperty('consumedCalories');
  });
});
