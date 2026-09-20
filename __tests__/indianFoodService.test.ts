import { searchLocalIndianFoods } from '../services/indianFoodService';

describe('searchLocalIndianFoods', () => {
  it('returns real database entries for a food that exists', () => {
    const results = searchLocalIndianFoods('dal');

    expect(results.length).toBeGreaterThan(0);
    for (const food of results) {
      expect(food.id).not.toBe('fallback');
    }
  });

  it('returns no results, not an invented food, when nothing matches', () => {
    // The screen shows a "No results found" state for an empty list. A made-up
    // 150 kcal entry named after the query would be shown as if it were data.
    expect(searchLocalIndianFoods('zzqxjvkw')).toEqual([]);
  });

  it('returns nothing for a query that is too short to search', () => {
    expect(searchLocalIndianFoods('')).toEqual([]);
    expect(searchLocalIndianFoods('  ')).toEqual([]);
  });

  it('respects the result limit', () => {
    expect(searchLocalIndianFoods('a', 5).length).toBeLessThanOrEqual(5);
  });
});
