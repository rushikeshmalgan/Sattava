/**
 * Advanced Local AI Engine
 * Guarantees 100% uptime for demo.
 * Uses intent matching and dynamic template arrays to simulate a real AI
 * without hitting any API rate limits.
 */

export interface ChatContext {
  calories: number;
  water: number;
  goal: string;
  coachType: string;
  protein?: number;
  carbs?: number;
  fat?: number;
  calorieTarget?: number;
  proteinTarget?: number;
  waterTarget?: number;
  steps?: number;
  streak?: number;
  diet?: string;
  recentFoods?: string[];
}

export async function safeAIReply(prompt: string, context: ChatContext): Promise<string> {
  // Simulate AI thinking time to make it feel real
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return getDynamicLocalResponse(prompt, context);
}

function getRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDynamicLocalResponse(prompt: string, ctx: ChatContext): string {
  const lower = prompt.toLowerCase();
  
  const calTarget = ctx.calorieTarget ?? 2000;
  const waterTarget = ctx.waterTarget ?? 2000;
  const proteinTarget = ctx.proteinTarget ?? 60;
  
  const calPct = Math.round((ctx.calories / Math.max(calTarget, 1)) * 100);
  const waterL = (ctx.water / 1000).toFixed(1);
  const remWater = Math.max((waterTarget - ctx.water) / 1000, 0).toFixed(1);
  const protRemaining = Math.max(proteinTarget - (ctx.protein ?? 0), 0);
  
  const streakText = (ctx.streak ?? 0) > 2 ? ` You're on a ${ctx.streak}-day streak, let's not break it!` : '';
  const lastFood = ctx.recentFoods && ctx.recentFoods.length > 0 ? ctx.recentFoods[0] : 'your last meal';

  // INTENT 1: Water / Hydration
  if (lower.includes('water') || lower.includes('drink') || lower.includes('hydrat')) {
    if (ctx.water >= waterTarget) {
      return getRandom([
        `You've hit your water goal of ${waterL}L today! Excellent hydration. 🚰`,
        `Amazing job! ${waterL}L logged. Staying hydrated is key for your ${ctx.goal} goal. 💧`
      ]);
    }
    return getRandom([
      `You're at ${waterL}L today. Try to drink ${remWater}L more before bed! 💧`,
      `Hydration check! You still need ${remWater}L to hit your target. Grab a glass now! 🚰`,
      `Don't forget your water! You've logged ${waterL}L so far. Keep sipping through the day. 🧊`
    ]);
  }

  // INTENT 2: Protein
  if (lower.includes('protein') || lower.includes('muscle')) {
    if ((ctx.protein ?? 0) >= proteinTarget) {
      return getRandom([
        `Awesome! You crushed your protein goal with ${ctx.protein}g today. 💪`,
        `Protein target hit! This is perfect for recovery and your ${ctx.goal} goal. 🔥`
      ]);
    }
    return getRandom([
      `You're at ${ctx.protein}g today. You need ${protRemaining}g more. Try having some paneer, soya chunks, or Greek yogurt! 🧀`,
      `Let's boost that protein! You need ${protRemaining}g to hit your goal. Roasted chana or a dal bowl are great Indian options. 🥣`,
      `You've logged ${ctx.protein}g protein so far. Adding a protein-rich snack will help you reach ${proteinTarget}g! 💪`
    ]);
  }

  // INTENT 3: Hunger / Food Suggestions
  if (lower.includes('hungry') || lower.includes('eat') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('snack')) {
    if (ctx.calories > calTarget * 0.9) {
      return getRandom([
        `You're at ${calPct}% of your calories today. Go for something very light like cucumber sticks or clear soup! 🥒`,
        `Since you've already had ${ctx.calories} kcal today, I suggest a light salad or buttermilk to keep you full without going over. 🥗`
      ]);
    }
    return getRandom([
      `You have plenty of calories left! A balanced meal of 2 rotis, dal, and sabzi would be around 450 kcal. 🍛`,
      `How about a nutritious Indian meal? Something like palak paneer or mixed dal is great for your ${ctx.goal} goal. 🥘`,
      `You're doing great on calories (${calPct}%). For a snack, try roasted makhana or a small bowl of sprouts! 🌱`
    ]);
  }

  // INTENT 4: Fatigue / Sleep
  if (lower.includes('tired') || lower.includes('sleep') || lower.includes('energy') || lower.includes('exhausted')) {
    return getRandom([
      `Low energy is often tied to dehydration. You're at ${waterL}L today—try drinking a glass of water right now! 💧`,
      `Feeling tired? Make sure you're resting well. A quick snack with complex carbs, like a banana or oats, might give you a boost! 🍌`,
      `Listen to your body! Sometimes a 20-minute power nap or a brisk walk is better than a coffee. Take it easy. 🧘🏽‍♂️`
    ]);
  }

  // INTENT 5: Progress / Status
  if (lower.includes('progress') || lower.includes('doing') || lower.includes('how am i') || lower.includes('status')) {
    return getRandom([
      `You are at ${ctx.calories} kcal (${calPct}%) today. With ${waterL}L water logged, you're on the right track!${streakText} 🔥`,
      `Overall, looking good! You've logged ${ctx.calories} kcal and ${ctx.protein ?? 0}g protein. Keep logging everything to stay accountable! 📈`,
      `You're doing great for your ${ctx.goal} goal. Calories: ${calPct}%, Protein: ${ctx.protein ?? 0}g. Stay consistent! 🚀`
    ]);
  }

  // INTENT 6: Guilt / Overeating / Cheat
  if (lower.includes('cheat') || lower.includes('bad') || lower.includes('junk') || lower.includes('guilt') || lower.includes('too much')) {
    return getRandom([
      `Don't stress about one meal! Consistency over a week matters more than one day. Drink some water and get back on track tomorrow. 🙏`,
      `It happens to the best of us! Just keep your next meal light and balanced. You've still got this! 💪`,
      `No guilt allowed! Enjoy the food, but let's balance it out with a good walk or a lighter dinner. 🚶🏽‍♂️`
    ]);
  }

  // INTENT 7: specific to their last logged food
  if (lower.includes('that') || lower.includes('this') || lower.includes('meal')) {
    return getRandom([
      `I see you recently had ${lastFood}. Good choice! Just make sure your next meal balances out your macros. 🍽️`,
      `Logging ${lastFood} was a smart move to stay accountable! What's next on the menu? 😋`
    ]);
  }

  // DEFAULT / CONVERSATIONAL
  return getRandom([
    `I'm here for you! You're currently at ${ctx.calories}/${calTarget} kcal today. What else can I help you with? 😊`,
    `Tell me more about what you're craving or how you're feeling today!${streakText}`,
    `Got it! Remember, for your ${ctx.goal} goal, consistency is key. Keep up the good work. 💪`,
    `I'm your personal Sattva coach! Whether it's meal ideas or motivation, just ask. 🌟`,
    `You've logged ${calPct}% of your daily calories. Are you planning any workouts today? 🏃🏽‍♀️`
  ]);
}
