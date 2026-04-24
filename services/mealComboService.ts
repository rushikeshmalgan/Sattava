import { INDIAN_CSV_DATA, LocalIndianFood } from '../data/indianFoodsDatabase';

export interface MealCombo {
    main: LocalIndianFood;
    side: LocalIndianFood;
    extra?: LocalIndianFood;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
}

const MAINS_KEYWORDS = ['roti', 'rice', 'pulao', 'khichdi', 'biryani', 'naan', 'paratha', 'chapati'];
const SIDES_KEYWORDS = ['dal', 'paneer', 'chicken', 'sabzi', 'curry', 'fish', 'mutton', 'chole', 'rajma'];
const EXTRAS_KEYWORDS = ['curd', 'raita', 'salad', 'papad', 'buttermilk'];

// Helper to check if a food belongs to a category
const isMain = (name: string) => MAINS_KEYWORDS.some(kw => name.toLowerCase().includes(kw));
const isSide = (name: string) => SIDES_KEYWORDS.some(kw => name.toLowerCase().includes(kw)) && !isMain(name);
const isExtra = (name: string) => EXTRAS_KEYWORDS.some(kw => name.toLowerCase().includes(kw));

// Pre-categorize local foods for fast lookup
const mains = INDIAN_CSV_DATA.filter(f => isMain(f.name));
const sides = INDIAN_CSV_DATA.filter(f => isSide(f.name));
const extras = INDIAN_CSV_DATA.filter(f => isExtra(f.name));

// Helper to clone and scale a food item's macros
const scaleFood = (food: LocalIndianFood, multiplier: number): LocalIndianFood => ({
    ...food,
    calories: Math.floor(food.calories * multiplier),
    protein: Math.floor(food.protein * multiplier),
    carbs: Math.floor(food.carbs * multiplier),
    fat: Math.floor(food.fat * multiplier),
    fiber: Math.floor((food.fiber || 0) * multiplier),
});

function getRandomFood(arr: LocalIndianFood[]): LocalIndianFood {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMealCombo(targetCalories: number, prioritizeProtein: boolean = false): MealCombo[] {
    const combos: MealCombo[] = [];

    // If arrays are empty for some reason, return empty
    if (!mains.length || !sides.length) return [];

    // Create 5 distinct meal profiles for variety
    const profiles = [
        { name: 'The Classic Plate', hasExtra: true },
        { name: 'Protein Powerhouse', hasExtra: false },
        { name: 'Light & Fresh', hasExtra: true },
        { name: 'Hearty Feast', hasExtra: false },
        { name: 'Balanced Bowl', hasExtra: true }
    ];

    for (const profile of profiles) {
        // 1. Pick logical bases
        let main = getRandomFood(mains);
        let side = getRandomFood(sides);
        
        // If prioritizing protein, try to pick a high protein side
        if (prioritizeProtein) {
            const sortedSides = [...sides].sort((a, b) => b.protein - a.protein);
            side = sortedSides[Math.floor(Math.random() * 3)]; // Pick from top 3
        }

        let extra: LocalIndianFood | undefined = undefined;
        if (profile.hasExtra && extras.length > 0) {
            extra = getRandomFood(extras);
        }

        // 2. Calculate base calories
        const baseCal = main.calories + side.calories + (extra ? extra.calories : 0);
        if (baseCal === 0) continue;

        // 3. Scale everything to exactly match the target calories
        // We ensure that if user asks for 800kcal, the combo gives EXACTLY ~800kcal
        const scaleFactor = targetCalories / baseCal;

        const scaledMain = scaleFood(main, scaleFactor);
        const scaledSide = scaleFood(side, scaleFactor);
        const scaledExtra = extra ? scaleFood(extra, scaleFactor) : undefined;

        const totalCalories = scaledMain.calories + scaledSide.calories + (scaledExtra ? scaledExtra.calories : 0);
        const totalProtein = scaledMain.protein + scaledSide.protein + (scaledExtra ? scaledExtra.protein : 0);
        const totalCarbs = scaledMain.carbs + scaledSide.carbs + (scaledExtra ? scaledExtra.carbs : 0);
        const totalFat = scaledMain.fat + scaledSide.fat + (scaledExtra ? scaledExtra.fat : 0);

        combos.push({
            main: scaledMain,
            side: scaledSide,
            extra: scaledExtra,
            totalCalories,
            totalProtein,
            totalCarbs,
            totalFat,
        });
    }

    // Sort by protein if prioritized
    if (prioritizeProtein) {
        combos.sort((a, b) => b.totalProtein - a.totalProtein);
    }

    return combos;
}
