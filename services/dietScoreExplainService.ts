import { generateCoachText } from './aiService';

const FALLBACK_NO_AI = 'Your diet score reflects your current macro balance. Try to incorporate more protein and fiber tomorrow for a better score.';
const FALLBACK_ERROR = 'Your diet score reflects your current macro balance. Stay consistent with your tracking to see better insights tomorrow.';

export async function explainDietScore(
    score: number,
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    fiber: number,
    water: number
): Promise<string> {
    try {
        const response = await generateCoachText('diet_score_explanation', {
            score: Math.max(0, Math.min(100, score)),
            calories: Math.max(0, calories),
            protein: Math.max(0, protein),
            carbs: Math.max(0, carbs),
            fat: Math.max(0, fat),
            fiber: Math.max(0, fiber),
            water: Math.max(0, water),
        });
        return response || FALLBACK_NO_AI;
    } catch (error) {
        console.error("Error generating diet score explanation:", error);
        return FALLBACK_ERROR;
    }
}
