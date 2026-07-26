import { CSV_FOODS } from '../data/csvFoods';
import { IndianFood } from '../data/indianFoods';

export interface CSVFood {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  servingSize: string;
  dietType: string;
  healthRating: string;
  tags: string[];
}

/**
 * Search the pre-parsed CSV dataset for a dish name
 */
export const searchCSVFoods = (query: string, limit: number = 25): IndianFood[] => {
  if (!query || query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  
  // Map CSVFood format to the app's IndianFood interface
  return (CSV_FOODS as any[])
    .filter(food => food.name.toLowerCase().includes(lowerQuery))
    .slice(0, limit)
    .map(f => ({
      id: f.id,
      name: f.name,
      nameHindi: '', 
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber || 0,
      servingSize: f.servingSize,
      servingGrams: 100,
      dietType: f.dietType as any,
      healthRating: f.healthRating as any,
      mealType: ['Lunch', 'Dinner'], 
      region: 'Pan-India',
      nature: 'Neutral',
      tags: f.tags
    }));
};

/**
 * Get a few popular items from the CSV set
 */
export const getPopularCSVFoods = (limit: number = 10): IndianFood[] => {
  return (CSV_FOODS as any[])
    .slice(0, limit)
    .map(f => ({
      id: f.id,
      name: f.name,
      nameHindi: '',
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber || 0,
      servingSize: f.servingSize,
      servingGrams: 100,
      dietType: f.dietType as any,
      healthRating: f.healthRating as any,
      mealType: ['Breakfast'],
      region: 'Pan-India',
      nature: 'Neutral',
      tags: f.tags
    }));
};
