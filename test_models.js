import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyDn6UzOgNG1iHmdCZ8KMu_zkXXPcb1rwnI";
const genAI = new GoogleGenerativeAI(API_KEY);

const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function testModels() {
    for (const modelName of modelsToTest) {
        console.log(`Testing model: ${modelName}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`SUCCESS: ${modelName}`);
            console.log(result.response.text());
            break; // Found one!
        } catch (error) {
            console.log(`FAILED: ${modelName} - ${error.message.split('\n')[0]}`);
            if (error.status === 429) {
                console.log("  (Rate Limited)");
            }
        }
        console.log("---");
    }
}

testModels();
