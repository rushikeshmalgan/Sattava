/** SwasthBharat — Bilingual String Constants (English + Hindi) */

export const Strings = {
  // App name
  APP_NAME: 'SwasthBharat',
  APP_TAGLINE: 'Your Indian Wellness Companion',
  APP_TAGLINE_HINDI: 'आपका भारतीय स्वास्थ्य साथी',

  // Greetings (time-based)
  GREETING_MORNING: (name: string) => `Suprabhat, ${name}! 🌅`,
  GREETING_AFTERNOON: (name: string) => `Namaskar, ${name}! 🙏`,
  GREETING_EVENING: (name: string) => `Shubh Sandhya, ${name}! 🌆`,
  GREETING_NIGHT: (name: string) => `Shubh Ratri, ${name}! 🌙`,

  // Goals
  GOAL_WEIGHT_LOSS: 'Wajan Kam Karna (Lose Weight)',
  GOAL_MAINTAIN: 'Wajan Bnaye Rakhna (Maintain)',
  GOAL_WEIGHT_GAIN: 'Wajan Badhana (Gain Weight)',
  GOAL_MUSCLE: 'Muscle Gain',

  // Step counter
  STEPS_LABEL: 'Kadam (Steps)',
  STEPS_TODAY: 'Aaj ke Kadam',
  STEPS_GOAL_HIT: '🎉 Shabaash! Step goal reached!',
  STEPS_ENCOURAGE: (steps: number) => `${steps.toLocaleString('en-IN')} kadam ho gaye! Karo aur!`,

  // Water
  WATER_REMINDER: '💧 Paani peena mat bhulo! Drink water now.',
  WATER_GOAL_HIT: '✅ Aaj ka paani goal pura! Great job!',

  // Notification messages
  NOTIF_MORNING_DETOX: '🌿 Good morning! Jeera water peena mat bhulo aaj.',
  NOTIF_BREAKFAST: '🍳 Naashte ka waqt aa gaya! Your plan is ready.',
  NOTIF_LUNCH: '🍛 Dopahar ho gayi! Lunch kardein abhi.',
  NOTIF_EVENING: '☕ Chai break time! Log your evening snack.',
  NOTIF_DINNER: '🍽️ Raat ka khana ready karein!',
  NOTIF_BEDTIME: '🥛 Sone se pehle haldi doodh peeyein 😴',
  NOTIF_WATER_2HR: '💧 2 ghante ho gaye! Peeni hai paani?',

  // Food alerts (Hinglish)
  ALERT_SAMOSA: '⚠️ Ek samosa = 260 kcal! Try baked version.',
  ALERT_CHAI_EXCESS: '🧉 4 cups chai ho gayi aaj! Switch to green tea.',
  ALERT_SWEET_EXCESS: '🍬 Mithai alert! 1 gulab jamun = 30 min walk.',
  ALERT_SODIUM_PICKLE: '🌶️ High sodium from achar! Drink water.',
  ALERT_ROTI_EXCESS: '🫓 3 rotis ho gayi! Consider stopping for weight goal.',
  ALERT_PROTEIN_GOAL: '🎯 Aaj ka protein goal pura! Shabaash!',
  ALERT_CALORIE_BURN: (cal: number) => `🔥 Aaj ${cal} calories burn ki! Amazing.`,
  ALERT_DIWALI: '✨ Diwali week alert: 5 din se mithai chal rahi hai!',

  // Dashboard
  INDIAN_DIET_SCORE: 'Indian Diet Score',
  ICMR_COMPARE: 'ICMR Daily Allowance',
  WEEKLY_SUMMARY: 'Hafta Bhar Ka Hisaab',

  // Common UI
  LOG_FOOD: 'Khana Log Karein',
  LOG_EXERCISE: 'Vyayaam Log Karein',
  LOG_WATER: 'Paani Log Karein',
  SCAN_FOOD: 'Khana Scan Karein',
  MEAL_PLAN: 'Khane Ka Plan',
  MY_PROFILE: 'Mera Profile',
  INSIGHTS: 'Jaankari',
  HOME: 'Home',
  DIET: 'Diet',
  ACTIVITY: 'Activity',

  // Diet types
  VEG: '🟢 Shaakahaari (Veg)',
  NON_VEG: '🔴 Maansahaari (Non-Veg)',
  JAIN: '🕊️ Jain',
  VEGAN: '🌱 Vegan',

  // Serving sizes
  KATORI: 'katori',
  CHAMACH: 'chamach (tbsp)',
  GLASS: 'glass',
  PIECE: 'piece',
  PLATE: 'plate',

  // Ayurvedic
  HOT_NATURE: '🔥 Ushna (Hot nature)',
  COLD_NATURE: '❄️ Sheeta (Cold nature)',
  NEUTRAL_NATURE: '⚖️ Sama (Neutral)',

  // Success messages
  SHABASH: 'Shabash! 🎯',
  WAH_WACH: 'Wah! Kya baat hai! 🙌',
  ACHI_PROGRESS: 'Bahut achi progress! Keep it up! 💪',

  // Error
  NO_INTERNET: 'Internet nahi hai. Offline data dikha rahe hain.',
  TRY_AGAIN: 'Dobara koshish karein',
};
