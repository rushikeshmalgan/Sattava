const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

async function listGeminiModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    const geminiModels = data.models.filter(m => m.name.includes("gemini"));
    console.log(JSON.stringify(geminiModels, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listGeminiModels();
