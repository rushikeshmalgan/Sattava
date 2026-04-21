import { CSV_FOODS } from '../data/csvFoods';

export interface LocalIndianFood {
    id: string;
    name: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    servingSize: string;
    isVerified?: boolean;
}

export const searchLocalIndianFoods = (query: string): LocalIndianFood[] => {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return [];

    // Prioritize exact matches, then startsWith, then includes
    // We cast to any for a moment to treat the CSV_FOODS objects as LocalIndianFood
    const results = (CSV_FOODS as any[]).filter(food => 
        food.name.toLowerCase().includes(searchTerm)
    );

    // Sort: exact matches first, then by name length
    return results.sort((a, b) => {
        const aLower = a.name.toLowerCase();
        const bLower = b.name.toLowerCase();
        
        if (aLower === searchTerm) return -1;
        if (bLower === searchTerm) return 1;
        
        if (aLower.startsWith(searchTerm) && !bLower.startsWith(searchTerm)) return -1;
        if (bLower.startsWith(searchTerm) && !aLower.startsWith(searchTerm)) return 1;
        
        return aLower.length - bLower.length;
    });
};
