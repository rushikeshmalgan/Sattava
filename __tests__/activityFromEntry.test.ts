import type { LogEntryDoc } from '../types/data';
import { activityFromEntry } from '../utils/activityFromEntry';

const entry = (over: Partial<LogEntryDoc>): LogEntryDoc => ({
  id: 'e1',
  type: 'food',
  name: 'Dal',
  createdAt: '2026-01-15T10:00:00.000Z',
  ...over,
});

describe('activityFromEntry', () => {
  it('carries a food across with its macros and time', () => {
    expect(activityFromEntry(entry({ calories: 300, carbs: 40, protein: 15, fat: 8, fiber: 6, time: '08:30 AM', servingSize: '1 bowl' }))).toEqual({
      id: 'e1',
      name: 'Dal',
      calories: 300,
      time: '08:30 AM',
      type: 'food',
      amount: undefined,
      intensity: undefined,
      duration: undefined,
      carbs: 40,
      protein: 15,
      fat: 8,
      fiber: 6,
      createdAt: '2026-01-15T10:00:00.000Z',
    });
  });

  it('carries an exercise across with its duration and intensity', () => {
    expect(activityFromEntry(entry({ type: 'cardio', name: 'Running', calories: 250, duration: 30, intensity: 'Medium', time: '07:00 AM' }))).toMatchObject({
      type: 'cardio',
      calories: 250,
      duration: 30,
      intensity: 'Medium',
    });
  });

  it('shows a water entry by its amount, from the label or, failing that, the millilitres', () => {
    expect(activityFromEntry(entry({ type: 'water', amountMl: 1000, amount: '1L' })).amount).toBe('1L');
    expect(activityFromEntry(entry({ type: 'water', amountMl: 250 })).amount).toBe('250ml');
  });

  it('fills in what the feed needs when the API left it out', () => {
    const activity = activityFromEntry(entry({ type: 'water', amountMl: 250 }));

    expect(activity.calories).toBe(0);
    expect(activity.time).toBe('');
  });

  it('keeps each entry id distinct, so a delete refers to exactly one row', () => {
    const a = activityFromEntry(entry({ id: 'one' }));
    const b = activityFromEntry(entry({ id: 'two' }));

    expect(a.id).not.toBe(b.id);
  });
});
