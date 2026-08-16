import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
} else {
    console.warn('[AI] Missing EXPO_PUBLIC_GEMINI_API_KEY — AI features disabled');
}

export const model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = genAI
    ? genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      })
    : null;
