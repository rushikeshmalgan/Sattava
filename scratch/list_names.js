const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

async function listGeminiNames() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    const names = data.models.map(m => m.name.replace('models/', ''));
    console.log(names.join('\n'));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listGeminiNames();
