export type CommonPortionCategory = 'small' | 'medium' | 'large' | '1 bowl' | '1 plate' | '1 piece';

export const normalizePortionCategory = (
  input?: string,
  fallback: CommonPortionCategory = 'medium'
): CommonPortionCategory => {
  const value = String(input || fallback).toLowerCase().trim();

  if (
    value === 'small' ||
    value === 'medium' ||
    value === 'large' ||
    value === '1 bowl' ||
    value === '1 plate' ||
    value === '1 piece'
  ) {
    return value as CommonPortionCategory;
  }

  return fallback;
};
