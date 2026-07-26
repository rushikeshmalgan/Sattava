export interface AlternativeSuggestion {
    original: string;
    suggestion: string;
    reason: string;
}

export const HEALTHY_SWAPS: Record<string, AlternativeSuggestion> = {
    'samosa': {
        original: 'Samosa',
        suggestion: 'Baked Dhokla',
        reason: 'Samosas are deep-fried and high in saturated fat. Dhokla is steamed and much lighter.'
    },
    'burger': {
        original: 'Burger',
        suggestion: 'Paneer Tikka Sandwich',
        reason: 'Commercial burgers are high in sodium and processed meat. Paneer tikka provides better protein.'
    },
    'pizza': {
        original: 'Pizza',
        suggestion: 'Millet Uttapam',
        reason: 'Pizza dough is refined flour. Millet uttapam is gluten-free and fiber-rich.'
    },
    'cold drink': {
        original: 'Cold Drink',
        suggestion: 'Coconut Water',
        reason: 'Soft drinks are loaded with sugar. Coconut water is natural and hydrating.'
    },
    'gulab jamun': {
        original: 'Gulab Jamun',
        suggestion: 'Greek Yogurt with Honey',
        reason: 'Deep-fried sugar syrup vs high-protein probiotic yogurt.'
    },
    'french fries': {
        original: 'French Fries',
        suggestion: 'Roasted Makhana',
        reason: 'Makhana is low-calorie, high-fiber, and naturally crunchy.'
    }
};

export const getHealthyAlternative = (query: string): AlternativeSuggestion | null => {
    const lower = query.toLowerCase();
    for (const key in HEALTHY_SWAPS) {
        if (lower.includes(key)) {
            return HEALTHY_SWAPS[key];
        }
    }
    return null;
};
