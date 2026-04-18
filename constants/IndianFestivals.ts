/** SwasthBharat — Indian Festivals & Fasting Calendar */

export interface IndianFestival {
  id: string;
  name: string;
  nameHindi: string;
  month: number;       // 1-12
  day?: number;        // specific day (approximate)
  durationDays: number;
  fastingType?: 'full' | 'partial' | 'none';
  fastingRules?: string;
  fastingFoods?: string[];
  avoidFoods?: string[];
  emoji: string;
  religion: 'Hindu' | 'Muslim' | 'Sikh' | 'Jain' | 'Universal';
  greetingHindi: string;
  greetingEnglish: string;
}

export const INDIAN_FESTIVALS: IndianFestival[] = [
  {
    id: 'navratri',
    name: 'Navratri',
    nameHindi: 'नवरात्रि',
    month: 10, day: 3, durationDays: 9,
    fastingType: 'partial',
    fastingRules: 'No grains, onion, garlic. Eat fruits, milk, sabudana, kuttu, singhara.',
    fastingFoods: ['Sabudana Khichdi', 'Kuttu Paratha', 'Makhana', 'Fruits', 'Curd', 'Singhara Halwa', 'Aloo Sabzi (no onion)'],
    avoidFoods: ['Rice', 'Wheat Roti', 'Onion', 'Garlic', 'Non-Veg', 'Alcohol'],
    emoji: '🪔',
    religion: 'Hindu',
    greetingHindi: 'नवरात्रि की शुभकामनाएं!',
    greetingEnglish: 'Happy Navratri! Stay strong with your fast 🙏',
  },
  {
    id: 'diwali',
    name: 'Diwali',
    nameHindi: 'दीवाली',
    month: 11, day: 1, durationDays: 5,
    fastingType: 'none',
    emoji: '✨',
    religion: 'Hindu',
    greetingHindi: 'दीपावली की हार्दिक शुभकामनाएं!',
    greetingEnglish: 'Happy Diwali! Watch those sweets 🍬',
  },
  {
    id: 'holi',
    name: 'Holi',
    nameHindi: 'होली',
    month: 3, day: 14, durationDays: 2,
    fastingType: 'none',
    emoji: '🎨',
    religion: 'Hindu',
    greetingHindi: 'होली की हार्दिक शुभकामनाएं!',
    greetingEnglish: 'Happy Holi! Enjoy thandai in moderation 🌿',
  },
  {
    id: 'ekadashi',
    name: 'Ekadashi',
    nameHindi: 'एकादशी',
    month: 0, durationDays: 1,   // every lunar cycle
    fastingType: 'full',
    fastingRules: 'No rice, grains. Only fruits, milk, and water.',
    fastingFoods: ['Fruits', 'Milk', 'Dry fruits', 'Sendha Namak items'],
    avoidFoods: ['Rice', 'Wheat', 'Onion', 'Garlic', 'Non-Veg', 'Lentils'],
    emoji: '🌙',
    religion: 'Hindu',
    greetingHindi: 'एकादशी व्रत की शुभकामनाएं!',
    greetingEnglish: 'Ekadashi fast today. Stay hydrated! 💧',
  },
  {
    id: 'karva_chauth',
    name: 'Karva Chauth',
    nameHindi: 'करवा चौथ',
    month: 10, day: 20, durationDays: 1,
    fastingType: 'full',
    fastingRules: 'No food or water from sunrise until moonrise. Break fast after seeing moon.',
    fastingFoods: ['Sargi (pre-dawn): dry fruits, mithais', 'Break fast: Moon darshan foods'],
    avoidFoods: ['All food and water during fast'],
    emoji: '🌕',
    religion: 'Hindu',
    greetingHindi: 'करवा चौथ की शुभकामनाएं!',
    greetingEnglish: 'Karva Chauth — stay strong! 💪 Drink water after moonrise.',
  },
  {
    id: 'ramadan',
    name: 'Ramadan',
    nameHindi: 'रमज़ान',
    month: 3, durationDays: 30,
    fastingType: 'full',
    fastingRules: 'No food or water from Sehri (pre-dawn) to Iftar (sunset).',
    fastingFoods: ['Sehri: Dates, milk, oats, eggs', 'Iftar: Dates, water, fruits, soup, samosa, pakora'],
    avoidFoods: ['During fasting hours: All food and drink'],
    emoji: '🌙',
    religion: 'Muslim',
    greetingHindi: 'रमज़ान मुबारक!',
    greetingEnglish: 'Ramadan Mubarak! Iftar reminder set 🌙',
  },
  {
    id: 'paryushana',
    name: 'Paryushana (Jain)',
    nameHindi: 'पर्युषण',
    month: 8, durationDays: 8,
    fastingType: 'partial',
    fastingRules: 'Many Jains fast or eat only boiled water, fruits. No root vegetables.',
    fastingFoods: ['Boiled water', 'Coconut water', 'Fruits (above-ground only)'],
    avoidFoods: ['Root vegetables (potato, onion, garlic, carrot)', 'Non-Veg', 'Multi-seed foods'],
    emoji: '🕊️',
    religion: 'Jain',
    greetingHindi: 'मिच्छामि दुक्कड़म!',
    greetingEnglish: 'Paryushana — a time for forgiveness and fasting 🙏',
  },
];

export const getCurrentFestival = (): IndianFestival | null => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  for (const festival of INDIAN_FESTIVALS) {
    if (festival.month === month || festival.month === 0) {
      if (festival.day) {
        const festEnd = festival.day + festival.durationDays;
        if (day >= festival.day && day <= festEnd) return festival;
      }
    }
  }
  return null;
};

export const isFastingDay = (): boolean => {
  const festival = getCurrentFestival();
  return festival ? festival.fastingType === 'full' || festival.fastingType === 'partial' : false;
};
