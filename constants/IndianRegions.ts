/** SwasthBharat — Indian Regions & Cuisine Definitions */

export type IndianRegion = 'North' | 'South' | 'East' | 'West' | 'Pan-India';

export interface RegionInfo {
  id: IndianRegion;
  name: string;
  nameHindi: string;
  states: string[];
  cuisineStyle: string;
  stapleGrains: string[];
  popularDishes: string[];
  spiceLevel: 'Mild' | 'Medium' | 'Hot' | 'Very Hot';
  emoji: string;
  color: string;
}

export const INDIAN_REGIONS: RegionInfo[] = [
  {
    id: 'North',
    name: 'North India',
    nameHindi: 'उत्तर भारत',
    states: ['Punjab', 'Haryana', 'UP', 'Rajasthan', 'Delhi', 'HP', 'J&K', 'Uttarakhand'],
    cuisineStyle: 'Rich, creamy, ghee-based. Heavy use of dairy and wheat.',
    stapleGrains: ['Wheat (Roti)', 'Rice'],
    popularDishes: ['Butter Chicken', 'Dal Makhani', 'Chole Bhature', 'Paneer dishes', 'Rajma'],
    spiceLevel: 'Medium',
    emoji: '🏔️',
    color: '#FF9933',
  },
  {
    id: 'South',
    name: 'South India',
    nameHindi: 'दक्षिण भारत',
    states: ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'],
    cuisineStyle: 'Rice-based, tangy, coconut-heavy. Fermented foods are common.',
    stapleGrains: ['Rice', 'Ragi', 'Tapioca'],
    popularDishes: ['Idli', 'Dosa', 'Sambar', 'Biryani (Hyderabadi)', 'Appam'],
    spiceLevel: 'Hot',
    emoji: '🥥',
    color: '#138808',
  },
  {
    id: 'East',
    name: 'East India',
    nameHindi: 'पूर्वी भारत',
    states: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Assam', 'Sikkim', 'NE States'],
    cuisineStyle: 'Mustard-oil based, subtle sweet notes, fish-centric.',
    stapleGrains: ['Rice'],
    popularDishes: ['Macher Jhol', 'Rasgulla', 'Litti Chokha', 'Momos', 'Shukto'],
    spiceLevel: 'Medium',
    emoji: '🐟',
    color: '#003087',
  },
  {
    id: 'West',
    name: 'West India',
    nameHindi: 'पश्चिम भारत',
    states: ['Maharashtra', 'Gujarat', 'Goa', 'Rajasthan'],
    cuisineStyle: 'Diverse: sweet-salty (Gujarat), spicy (Maharashtra), sea-food-rich (Goa).',
    stapleGrains: ['Wheat', 'Millet (Bajra)', 'Rice'],
    popularDishes: ['Pav Bhaji', 'Dhokla', 'Vada Pav', 'Dal Bati', 'Goan Fish Curry'],
    spiceLevel: 'Medium',
    emoji: '🌊',
    color: '#C8973A',
  },
  {
    id: 'Pan-India',
    name: 'Pan India',
    nameHindi: 'सर्व भारतीय',
    states: [],
    cuisineStyle: 'Universally enjoyed across all of India.',
    stapleGrains: ['Wheat', 'Rice'],
    popularDishes: ['Khichdi', 'Curd', 'Dal', 'Roti', 'Chai'],
    spiceLevel: 'Mild',
    emoji: '🇮🇳',
    color: '#FF9933',
  },
];

export const getRegionInfo = (region: IndianRegion): RegionInfo =>
  INDIAN_REGIONS.find(r => r.id === region) || INDIAN_REGIONS[4];
