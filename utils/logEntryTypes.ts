/**
 * Entry types in a daily log that represent exercise.
 *
 * Writers disagree on the name: `addExerciseLog` stores the exercise subtype
 * ('cardio' | 'weight' | 'manual') as the entry type, while the yoga screen
 * writes plain 'exercise'. Everything that asks "is this exercise?" (the streak,
 * reversing a deleted entry's calories, the activity feed) must use this one
 * definition, or exercises of one kind get silently ignored.
 */
export const EXERCISE_LOG_TYPES: readonly string[] = ['exercise', 'cardio', 'weight', 'manual'];

export const isExerciseLogType = (type: unknown): boolean =>
  typeof type === 'string' && EXERCISE_LOG_TYPES.includes(type);
