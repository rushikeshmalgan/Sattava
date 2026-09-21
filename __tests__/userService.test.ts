import { addLogEntry, patchCurrentUser } from '../services/dataApi';
import { activityToEntry, addActivityLog, toWaterMl, updateUserProfile, updateUserTargets } from '../services/userService';

jest.mock('../services/dataApi', () => ({ addLogEntry: jest.fn(), patchCurrentUser: jest.fn() }));

const mockedAdd = addLogEntry as jest.Mock;
const mockedPatch = patchCurrentUser as jest.Mock;

beforeEach(() => {
  mockedAdd.mockReset().mockResolvedValue({});
  mockedPatch.mockReset().mockResolvedValue({});
});

describe('toWaterMl', () => {
  it.each([
    ['250ml', 250],
    ['500 ML', 500],
    ['1L', 1000],
    ['1.5l', 1500],
    ['2000ml', 2000],
    ['750', 750],
  ])('reads %p as %p ml', (amount, expected) => {
    expect(toWaterMl(amount)).toBe(expected);
  });

  it.each([undefined, '', '   ', 'abc', '-5ml', '0', '0L'])('falls back to a glass (250 ml) for %p', (amount) => {
    expect(toWaterMl(amount)).toBe(250);
  });

  it('caps an absurd amount at the daily limit', () => {
    expect(toWaterMl('99L')).toBe(20_000);
  });
});

describe('activityToEntry', () => {
  it('maps a water entry to its amount in millilitres, keeping the label', () => {
    expect(activityToEntry({ id: 'w1', name: 'Paani (Water)', calories: 0, time: '09:00 AM', type: 'water', amount: '1L' })).toEqual({
      itemId: 'w1',
      name: 'Paani (Water)',
      time: '09:00 AM',
      type: 'water',
      amountMl: 1000,
      amount: '1L',
    });
  });

  it('maps an exercise, keeping its duration and intensity', () => {
    expect(
      activityToEntry({ id: 'y1', name: 'Surya Namaskar', calories: 90, time: '07:00 AM', type: 'exercise', duration: 10, intensity: 'Medium' }),
    ).toEqual({ itemId: 'y1', name: 'Surya Namaskar', time: '07:00 AM', type: 'exercise', calories: 90, duration: 10, intensity: 'Medium' });
  });

  it('maps a food with macros under `macros`', () => {
    expect(
      activityToEntry({ id: 'f1', name: 'Poha', calories: 350, time: '08:30 AM', type: 'food', macros: { protein: 8, carbs: 60, fat: 9 } }),
    ).toEqual({ itemId: 'f1', name: 'Poha', time: '08:30 AM', type: 'food', calories: 350, protein: 8, carbs: 60, fat: 9 });
  });

  it('also reads macros given at the top level (the demo button does)', () => {
    expect(activityToEntry({ id: 'f2', name: 'Samosa', calories: 1200, time: '05:00 PM', type: 'food', protein: 15, carbs: 120, fat: 80 })).toMatchObject({
      calories: 1200,
      protein: 15,
      carbs: 120,
      fat: 80,
    });
  });

  it('leaves out zero macros and anything the API does not know, such as unit or timestamp', () => {
    const entry = activityToEntry({
      id: 'f3',
      name: 'Ghar Ka Khana',
      calories: 500,
      time: '01:00 PM',
      type: 'food',
      macros: { protein: 0, carbs: 0, fat: 0 },
      // @ts-expect-error extra fields callers have passed in the past
      unit: 'pieces',
      timestamp: '2026-01-05',
    });

    expect(entry).toEqual({ itemId: 'f3', name: 'Ghar Ka Khana', time: '01:00 PM', type: 'food', calories: 500 });
  });
});

describe('addActivityLog', () => {
  it('sends the mapped entry for the given day, and no user id', async () => {
    await addActivityLog('2026-01-15', { id: 'w1', name: 'Paani', calories: 0, time: '09:00 AM', type: 'water', amount: '250ml' });

    expect(mockedAdd).toHaveBeenCalledWith('2026-01-15', expect.objectContaining({ type: 'water', amountMl: 250 }));
    expect(JSON.stringify(mockedAdd.mock.calls[0])).not.toMatch(/uid|userId/);
  });

  it('passes a failure on to the screen', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedAdd.mockRejectedValue(new Error('offline'));

    await expect(addActivityLog('2026-01-15', { id: 'a', name: 'x', calories: 1, time: '', type: 'food' })).rejects.toThrow('offline');
    consoleError.mockRestore();
  });
});

describe('updateUserTargets', () => {
  it('patches only the targets, as nested fields the server merges', async () => {
    await updateUserTargets({ calories: 2200, macros: { protein: '80g', fats: '60g', carbs: '250g' }, waterIntake: '3L' });

    expect(mockedPatch).toHaveBeenCalledWith({
      generatedPlan: { dailyCalories: 2200, macros: { protein: '80g', fats: '60g', carbs: '250g' }, waterIntake: '3L' },
    });
  });
});

describe('updateUserProfile', () => {
  it('passes nested profile fields through untouched', async () => {
    await updateUserProfile({ userProfile: { goal: 'Gain Weight' }, generatedPlanStale: true });

    expect(mockedPatch).toHaveBeenCalledWith({ userProfile: { goal: 'Gain Weight' }, generatedPlanStale: true });
  });

  it('passes a failure on to the screen', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockedPatch.mockRejectedValue(new Error('offline'));

    await expect(updateUserProfile({ userProfile: { name: 'Asha' } })).rejects.toThrow('offline');
    consoleError.mockRestore();
  });
});
