const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test15() {
  const apiKey = 'AIzaSyBqVAKadwChEI-XtcIg-D-2eAhXxhD_E6A';
  const genAI = new GoogleGenerativeAI(apiKey); 
  
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ];

  for (const modelName of models) {
    try {
      console.log(`Testing ${modelName} on default v1...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Hello");
      console.log(`SUCCESS [${modelName}]: OK`);
    } catch (err) {
      console.error(`FAILED [${modelName}]: ${err.message}`);
    }
  }
}

test15();
