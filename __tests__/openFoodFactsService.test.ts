/**
 * Tests for services/openFoodFactsService.ts
 *
 * fetch is mocked, so no network is needed. Open Food Facts is crowd-sourced;
 * these tests pin what happens to a product whose numbers cannot be true.
 */

import { lookupBarcodeFood, searchFoodsByText, toFoodData } from '../services/openFoodFactsService';

// FoodData is only a type here, but keep Firebase out of the test either way.
jest.mock('../services/logService', () => ({}));

// The service only reads fetch when a function is called, so assigning it after the import is fine.
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

const product = (nutriments: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  code: '8901234567890',
  product_name: 'Test Biscuit',
  brands: 'Acme',
  serving_size: '30 g',
  nutriments,
  ...extra,
});

const barcodeResponse = (p: unknown) => ({ ok: true, json: async () => ({ status: 1, product: p }) });
const searchResponse = (products: unknown[]) => ({ ok: true, json: async () => ({ products }) });

const SANE = { 'energy-kcal_100g': 450, carbohydrates_100g: 70, proteins_100g: 6, fat_100g: 16 };

beforeEach(() => {
  mockFetch.mockReset();
});

describe('lookupBarcodeFood', () => {
  it('scales per-100g values to the serving size', async () => {
    mockFetch.mockResolvedValueOnce(barcodeResponse(product(SANE)));

    const match = await lookupBarcodeFood('8901234567890');

    expect(match).toMatchObject({
      name: 'Test Biscuit',
      brandName: 'Acme',
      servingSize: '30 g',
      calories: 135,
      carbs: 21,
      protein: 2,
      fat: 5,
      source: 'barcode',
      confidence: 0.97,
    });
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/v2/product/8901234567890');
  });

  it('accepts values at the top of the plausible range (a pure oil)', async () => {
    mockFetch.mockResolvedValueOnce(
      barcodeResponse(product({ 'energy-kcal_100g': 900, fat_100g: 100 }, { serving_size: '100 g' }))
    );

    const match = await lookupBarcodeFood('1');

    expect(match).toMatchObject({ calories: 900, fat: 100 });
  });

  it.each([
    ['kJ entered as kcal', { ...SANE, 'energy-kcal_100g': 3700 }],
    ['calories just over the limit', { ...SANE, 'energy-kcal_100g': 1001 }],
    ['negative calories', { ...SANE, 'energy-kcal_100g': -450 }],
    ['negative protein', { ...SANE, proteins_100g: -6 }],
    ['negative fat', { ...SANE, fat_100g: -1 }],
    ['more than 100 g of carbs per 100 g', { ...SANE, carbohydrates_100g: 250 }],
    ['carbs just over the limit', { ...SANE, carbohydrates_100g: 106 }],
    ['more than 100 g of protein per 100 g', { ...SANE, proteins_100g: 180 }],
    ['more than 100 g of fat per 100 g', { ...SANE, fat_100g: 300 }],
    ['a number too large to be finite', { ...SANE, 'energy-kcal_100g': '9'.repeat(400) }],
  ])('treats a product with %s as not found', async (_label, nutriments) => {
    mockFetch.mockResolvedValueOnce(barcodeResponse(product(nutriments)));

    expect(await lookupBarcodeFood('8901234567890')).toBeNull();
  });

  it('returns null when the product is not in the database', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 0 }) });

    expect(await lookupBarcodeFood('000')).toBeNull();
  });

  it('does not call the network for an empty barcode', async () => {
    expect(await lookupBarcodeFood('   ')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when the service fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    await expect(lookupBarcodeFood('8901234567890')).rejects.toThrow('Failed to fetch barcode product.');
  });
});

describe('searchFoodsByText', () => {
  it('drops implausible products and keeps the plausible ones in order', async () => {
    mockFetch.mockResolvedValueOnce(
      searchResponse([
        product(SANE, { code: '1', product_name: 'Good One' }),
        product({ ...SANE, 'energy-kcal_100g': 3700 }, { code: '2', product_name: 'kJ Mistake' }),
        product({ ...SANE, 'energy-kcal_100g': 300 }, { code: '3', product_name: 'Good Two' }),
      ])
    );

    const results = await searchFoodsByText('biscuit');

    expect(results.map((r) => r.name)).toEqual(['Good One', 'Good Two']);
    expect(results.map((r) => r.calories)).toEqual([450, 300]);
    // Confidence still reflects the original ranking, not the position after filtering.
    expect(results.map((r) => r.confidence)).toEqual([0.9, 0.8]);
  });

  it('no longer offers a negative-calorie result', async () => {
    // A negative entry used to come back as-is, and logging it would have lowered the day's total.
    mockFetch.mockResolvedValueOnce(
      searchResponse([product({ ...SANE, 'energy-kcal_100g': -200 }, { product_name: 'Negative' })])
    );

    expect(await searchFoodsByText('anything')).toEqual([]);
  });

  it('returns nothing for a blank query without calling the network', async () => {
    expect(await searchFoodsByText('  ')).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws when the service fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(searchFoodsByText('biscuit')).rejects.toThrow('Failed to search Open Food Facts.');
  });
});

describe('toFoodData', () => {
  it('keeps just the fields the log needs', async () => {
    mockFetch.mockResolvedValueOnce(barcodeResponse(product(SANE)));
    const match = await lookupBarcodeFood('8901234567890');

    expect(toFoodData(match!)).toEqual({
      id: '8901234567890',
      name: 'Test Biscuit',
      calories: 135,
      carbs: 21,
      protein: 2,
      fat: 5,
      servingSize: '30 g',
    });
  });
});
