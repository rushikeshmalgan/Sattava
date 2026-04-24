import { generateText } from './geminiVisionService';

export async function explainDietScore(
    score: number,
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
    fiber: number,
    water: number
): Promise<string> {
    const prompt = `
    You are an expert Indian nutritionist. Analyze the following daily nutrition data for a user:
    - Diet Score: ${score}/100
    - Calories: ${calories} kcal
    - Protein: ${protein}g
    - Carbs: ${carbs}g
    - Fat: ${fat}g
    - Fiber: ${fiber}g
    - Water: ${water}ml

    Write a highly concise, 3-sentence explanation of why they received this score and what they should focus on tomorrow.
    Keep the tone encouraging but clinical. Mention specific Indian food elements (like dal, sabzi, hydration) if relevant to their gaps.
    Do NOT use markdown, just plain text.
    `;

    try {
        const response = await generateText(prompt);
        return response || "Your diet score reflects your current macro balance. Try to incorporate more protein and fiber tomorrow for a better score.";
    } catch (error) {
        console.error("Error generating diet score explanation:", error);
        return "Your diet score reflects your current macro balance. Stay consistent with your tracking to see better insights tomorrow.";
    }
}
