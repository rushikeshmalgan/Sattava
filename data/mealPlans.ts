/**
 * SwasthBharat — Meal Plans
 * 7-day rotating Indian meal plans for different goals
 */

export interface ScheduledMeal {
  id: string;
  time: string;           // "06:30"
  timeDisplay: string;    // "6:30 AM"
  label: string;          // "Morning Detox"
  labelHindi: string;     // "सुबह का डिटॉक्स"
  items: string[];        // food names
  itemsHindi?: string[];
  estimatedCalories: number;
  mealCategory: 'morning_detox' | 'breakfast' | 'mid_morning' | 'lunch' | 'evening' | 'dinner' | 'bedtime';
}

export interface DayMealPlan {
  day: number;    // 1–7
  dayName: string;
  meals: ScheduledMeal[];
  totalCalories: number;
}

export interface MealPlanTemplate {
  id: string;
  goal: 'weight_loss' | 'maintain' | 'weight_gain' | 'muscle_gain';
  dietType: 'Veg' | 'Non-Veg' | 'Vegan';
  targetCalories: number;
  days: DayMealPlan[];
}

// ── Indian Meal Timings ───────────────────────────────────────────────────

export const INDIAN_MEAL_SCHEDULE = [
  { id: 'morning_detox', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', icon: '🌿' },
  { id: 'breakfast',     time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast',     labelHindi: 'नाश्ता',            icon: '🍳' },
  { id: 'mid_morning',   time: '11:00', timeDisplay: '11:00 AM',label: 'Mid-Morning',   labelHindi: 'मध्य-सुबह',         icon: '🍎' },
  { id: 'lunch',         time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch',          labelHindi: 'दोपहर का खाना',     icon: '🍛' },
  { id: 'evening',       time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय',        icon: '☕' },
  { id: 'dinner',        time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner',         labelHindi: 'रात का खाना',       icon: '🌙' },
  { id: 'bedtime',       time: '22:00', timeDisplay: '10:00 PM',label: 'Bedtime',        labelHindi: 'रात की दूध',        icon: '🥛' },
] as const;

// ── VEG — Weight Loss (1500 kcal) ─────────────────────────────────────────

export const VEG_WEIGHT_LOSS_PLAN: MealPlanTemplate = {
  id: 'veg_weight_loss',
  goal: 'weight_loss',
  dietType: 'Veg',
  targetCalories: 1500,
  days: [
    {
      day: 1, dayName: 'Monday', totalCalories: 1490,
      meals: [
        { id: 'd1_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Jeera water (1 glass)', 'Amla juice'], itemsHindi: ['जीरा पानी', 'आंवला जूस'], estimatedCalories: 40, mealCategory: 'morning_detox' },
        { id: 'd1_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['2 Besan Chilla', '1 cup low-fat curd', '1 cup green tea'], itemsHindi: ['बेसन चिल्ला', 'दही', 'ग्रीन टी'], estimatedCalories: 280, mealCategory: 'breakfast' },
        { id: 'd1_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['1 banana', 'Handful roasted chana'], itemsHindi: ['केला', 'भुना चना'], estimatedCalories: 240, mealCategory: 'mid_morning' },
        { id: 'd1_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['2 Phulkas', '1 katori Dal Tadka', '1 katori Lauki Ki Sabzi', '1 katori curd', 'Salad'], itemsHindi: ['फुल्का', 'दाल तड़का', 'लौकी', 'दही'], estimatedCalories: 450, mealCategory: 'lunch' },
        { id: 'd1_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['1 cup Masala Chai (no sugar)', '4 pieces Dhokla'], itemsHindi: ['मसाला चाय', 'ढोकला'], estimatedCalories: 220, mealCategory: 'evening' },
        { id: 'd1_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['2 Rotis', '1 katori Moong Dal', '1 katori mixed sabzi', '1 katori Curd'], itemsHindi: ['रोटी', 'मूंग दाल', 'मिक्स सब्जी', 'दही'], estimatedCalories: 380, mealCategory: 'dinner' },
        { id: 'd1_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Haldi Doodh (turmeric milk)'], itemsHindi: ['हल्दी दूध'], estimatedCalories: 120, mealCategory: 'bedtime' },
      ],
    },
    {
      day: 2, dayName: 'Tuesday', totalCalories: 1510,
      meals: [
        { id: 'd2_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Methi water', 'Giloy kadha'], estimatedCalories: 30, mealCategory: 'morning_detox' },
        { id: 'd2_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['2 Idlis', '1 katori Sambar', '1 tsp Coconut Chutney'], estimatedCalories: 270, mealCategory: 'breakfast' },
        { id: 'd2_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Sprouts salad', '1 glass nimbu pani'], estimatedCalories: 130, mealCategory: 'mid_morning' },
        { id: 'd2_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['1 katori Rice', '1 katori Rajma', '1 katori Aloo Gobi', 'Salad', 'Buttermilk'], estimatedCalories: 480, mealCategory: 'lunch' },
        { id: 'd2_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['1 cup green tea', 'Makhana handful', 'Fruit chaat'], estimatedCalories: 200, mealCategory: 'evening' },
        { id: 'd2_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['2 Missi Roti', '1 katori Dal Palak', 'Bhindi Masala', 'Curd'], estimatedCalories: 400, mealCategory: 'dinner' },
        { id: 'd2_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Warm Badam Milk'], estimatedCalories: 220, mealCategory: 'bedtime' },
      ],
    },
    {
      day: 3, dayName: 'Wednesday', totalCalories: 1480,
      meals: [
        { id: 'd3_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Jeera water', 'Tulsi kadha'], estimatedCalories: 25, mealCategory: 'morning_detox' },
        { id: 'd3_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['1 plate Poha (namkeen)', '1 cup Chai (light)'], estimatedCalories: 260, mealCategory: 'breakfast' },
        { id: 'd3_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Apple / Guava', 'Roasted peanuts'], estimatedCalories: 180, mealCategory: 'mid_morning' },
        { id: 'd3_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['2 Rotis', '1 katori Dal Makhani', 'Baingan Bharta', 'Salad'], estimatedCalories: 460, mealCategory: 'lunch' },
        { id: 'd3_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['Dhokla 3 pieces', 'Green chutney', '1 cup chai'], estimatedCalories: 220, mealCategory: 'evening' },
        { id: 'd3_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['1 plate Khichdi', '1 katori curd', 'Papad'], estimatedCalories: 360, mealCategory: 'dinner' },
        { id: 'd3_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Haldi doodh'], estimatedCalories: 120, mealCategory: 'bedtime' },
      ],
    },
    // Days 4–7 simplified
    {
      day: 4, dayName: 'Thursday', totalCalories: 1520,
      meals: [
        { id: 'd4_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Amla juice', 'Warm water with lemon'], estimatedCalories: 40, mealCategory: 'morning_detox' },
        { id: 'd4_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['2 Dosas with sambar', 'Green tea'], estimatedCalories: 330, mealCategory: 'breakfast' },
        { id: 'd4_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Mixed fruit', 'Chaas'], estimatedCalories: 110, mealCategory: 'mid_morning' },
        { id: 'd4_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['2 Rotis', 'Palak Paneer (small)', 'Moong dal', 'Salad'], estimatedCalories: 480, mealCategory: 'lunch' },
        { id: 'd4_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['Makhana', 'Green tea'], estimatedCalories: 140, mealCategory: 'evening' },
        { id: 'd4_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['2 Missi roti', 'Arhar dal', 'Bhindi masala'], estimatedCalories: 400, mealCategory: 'dinner' },
        { id: 'd4_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Haldi milk'], estimatedCalories: 120, mealCategory: 'bedtime' },
      ],
    },
    {
      day: 5, dayName: 'Friday', totalCalories: 1500,
      meals: [
        { id: 'd5_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Methi seeds water'], estimatedCalories: 15, mealCategory: 'morning_detox' },
        { id: 'd5_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['Dalia khichdi (1 bowl)', 'Curd', '1 cup chai'], estimatedCalories: 310, mealCategory: 'breakfast' },
        { id: 'd5_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Sattu sharbat', 'Roasted chana'], estimatedCalories: 190, mealCategory: 'mid_morning' },
        { id: 'd5_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['Curd rice', 'Sambar', 'Papad', 'Pickle (small)'], estimatedCalories: 380, mealCategory: 'lunch' },
        { id: 'd5_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['Thepla (1)', 'Curd dip', 'Chai'], estimatedCalories: 240, mealCategory: 'evening' },
        { id: 'd5_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['2 Rotis', 'Mixed veg', 'Dal tadka', 'Chaas'], estimatedCalories: 420, mealCategory: 'dinner' },
        { id: 'd5_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Warm milk (low fat)'], estimatedCalories: 80, mealCategory: 'bedtime' },
      ],
    },
    {
      day: 6, dayName: 'Saturday', totalCalories: 1600,
      meals: [
        { id: 'd6_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Jeera water', 'Amla'], estimatedCalories: 35, mealCategory: 'morning_detox' },
        { id: 'd6_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['2 Aloo Paratha (small)', 'Curd', 'Pickle'], estimatedCalories: 450, mealCategory: 'breakfast' },
        { id: 'd6_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Coconut water', 'Fruit'], estimatedCalories: 100, mealCategory: 'mid_morning' },
        { id: 'd6_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['2 Rotis', 'Rajma', 'Salad', 'Chaas'], estimatedCalories: 390, mealCategory: 'lunch' },
        { id: 'd6_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['Corn chaat', 'Green tea'], estimatedCalories: 200, mealCategory: 'evening' },
        { id: 'd6_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['2 Rotis', 'Palak paneer', 'Dal', 'Salad'], estimatedCalories: 480, mealCategory: 'dinner' },
        { id: 'd6_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Haldi milk'], estimatedCalories: 120, mealCategory: 'bedtime' },
      ],
    },
    {
      day: 7, dayName: 'Sunday', totalCalories: 1550,
      meals: [
        { id: 'd7_m1', time: '06:30', timeDisplay: '6:30 AM', label: 'Morning Detox', labelHindi: 'सुबह का डिटॉक्स', items: ['Lemon warm water', 'Tulsi'], estimatedCalories: 15, mealCategory: 'morning_detox' },
        { id: 'd7_m2', time: '08:00', timeDisplay: '8:00 AM', label: 'Breakfast', labelHindi: 'नाश्ता', items: ['Upma (1 bowl)', 'Coconut chutney', 'Filter coffee / Chai'], estimatedCalories: 285, mealCategory: 'breakfast' },
        { id: 'd7_m3', time: '11:00', timeDisplay: '11:00 AM', label: 'Mid-Morning', labelHindi: 'मध्य-सुबह', items: ['Mango / Papaya bowl', 'Sprouts'], estimatedCalories: 140, mealCategory: 'mid_morning' },
        { id: 'd7_m4', time: '13:30', timeDisplay: '1:30 PM', label: 'Lunch', labelHindi: 'दोपहर का खाना', items: ['Veg Biryani (small)', 'Raita', 'Salad'], estimatedCalories: 500, mealCategory: 'lunch' },
        { id: 'd7_m5', time: '16:30', timeDisplay: '4:30 PM', label: 'Evening Snack', labelHindi: 'शाम की चाय', items: ['Bhel puri', 'Nimbu pani'], estimatedCalories: 230, mealCategory: 'evening' },
        { id: 'd7_m6', time: '20:00', timeDisplay: '8:00 PM', label: 'Dinner', labelHindi: 'रात का खाना', items: ['Khichdi', 'Curd', 'Papad'], estimatedCalories: 300, mealCategory: 'dinner' },
        { id: 'd7_m7', time: '22:00', timeDisplay: '10:00 PM', label: 'Bedtime', labelHindi: 'सोने से पहले', items: ['Warm milk'], estimatedCalories: 80, mealCategory: 'bedtime' },
      ],
    },
  ],
};

// ── Non-Veg 7-day (same structure, different foods) ────────────────────────

export const NON_VEG_MAINTAIN_PLAN: MealPlanTemplate = {
  id: 'nonveg_maintain',
  goal: 'maintain',
  dietType: 'Non-Veg',
  targetCalories: 2000,
  days: VEG_WEIGHT_LOSS_PLAN.days.map((day, i) => ({
    ...day,
    totalCalories: day.totalCalories + 400,
    meals: day.meals.map(meal => {
      if (meal.mealCategory === 'lunch') {
        return { ...meal, items: ['2 Rotis', '1 katori Chicken Curry', 'Dal', 'Salad', 'Curd'], estimatedCalories: meal.estimatedCalories + 150 };
      }
      if (meal.mealCategory === 'dinner' && i % 2 === 0) {
        return { ...meal, items: ['2 Rotis', 'Egg Curry', 'Mix veg', 'Chaas'], estimatedCalories: meal.estimatedCalories + 100 };
      }
      return meal;
    }),
  })),
};

// ── Get plan by goal and diet ──────────────────────────────────────────────

export const getMealPlan = (
  goal: 'weight_loss' | 'maintain' | 'weight_gain' | 'muscle_gain',
  dietType: 'Veg' | 'Non-Veg' | 'Vegan'
): MealPlanTemplate => {
  if (dietType === 'Non-Veg') return NON_VEG_MAINTAIN_PLAN;
  return VEG_WEIGHT_LOSS_PLAN;
};

export const getTodaysMeals = (plan: MealPlanTemplate): ScheduledMeal[] => {
  const dayOfWeek = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const planDay = dayOfWeek === 0 ? 7 : dayOfWeek;
  const day = plan.days.find(d => d.day === planDay) || plan.days[0];
  return day.meals;
};

export const getNextMeal = (meals: ScheduledMeal[]): ScheduledMeal | null => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  for (const meal of meals) {
    const [h, m] = meal.time.split(':').map(Number);
    const mealTime = h * 60 + m;
    if (mealTime > currentTime) return meal;
  }
  return null;
};

export const getCurrentMeal = (meals: ScheduledMeal[]): ScheduledMeal | null => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  for (let i = meals.length - 1; i >= 0; i--) {
    const meal = meals[i];
    const [h, m] = meal.time.split(':').map(Number);
    const mealTime = h * 60 + m;
    if (mealTime <= currentTime) return meal;
  }
  return null;
};

// ── Grocery list generator ─────────────────────────────────────────────────

export const generateWeeklyGroceryList = (plan: MealPlanTemplate): string[] => {
  const items = new Set<string>();
  plan.days.forEach(day =>
    day.meals.forEach(meal =>
      meal.items.forEach(item => {
        const clean = item.replace(/\d+\s*(piece|katori|glass|cup|tbsp|roti|dosa|bowl|plate)s?\s*/gi, '').trim();
        if (clean.length > 2) items.add(clean);
      })
    )
  );
  return Array.from(items).sort();
};
