const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
const envContent = fs.readFileSync(envPath, "utf8");
const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = match ? match[1].trim() : null;

if (!apiKey) {
  console.error("No API key found");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function runTest() {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.1-flash-lite-preview"];
  
  for (const modelName of models) {
    console.log(`\n--- Testing Model: ${modelName} ---`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'hello' in 2 words.");
      const response = await result.response;
      const text = response.text();
      console.log(`✅ Success! Response: ${text}`);
    } catch (error) {
      console.error(`❌ Failed: ${error.message}`);
    }
  }
}

runTest();
