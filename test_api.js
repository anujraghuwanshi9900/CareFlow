import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const API_KEY = "AIzaSyDn6UzOgNG1iHmdCZ8KMu_zkXXPcb1rwnI";

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        // Try gemini-2.0-flash as seen in the models list
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log("Testing connection to gemini-2.0-flash...");
        const result = await model.generateContent("Hello");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("API Error occurred.");
        console.error(error.message);
        fs.writeFileSync("last_error.txt", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
}

test();
