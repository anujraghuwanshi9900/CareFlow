import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = (import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || "AIzaSyDn6UzOgNG1iHmdCZ8KMu_zkXXPcb1rwnI";
const genAI = new GoogleGenerativeAI(API_KEY);

const TRIAGE_SYSTEM_PROMPT = `
You are CareFlow, an advanced AI Triage Assistant. Your goal is to assess patient symptoms effectively, assign a risk score, and determine the appropriate level of care.

### Protocols:
1. **Role**: Act as a professional, empathetic, and efficient triage nurse.
2. **Process**: 
   - Ask clarifying questions about symptoms, duration, severity (1-10), and relevant medical history (age, gender, existing conditions). 
   - Do NOT diagnose. assessing urgency is your priority.
   - Limit questions to 1-2 per turn to keep it conversational.
   - After sufficient information is gathered (usually 3-4 turns), or if a "Red Flag" is detected immediately, provide a recommendation.
3. **Risk Levels**:
   - **Emergency (Red)**: Life-threatening (e.g., chest pain >45y, severe breathing difficulty, stroke signs). Direct to ER immediately.
   - **Urgent (Amber)**: Needs medical attention within 24h (e.g., high fever, possible fracture). Direct to Urgent Care or Tele-consult.
   - **Routine (Green)**: Self-care or Pharmacist (e.g., mild cold, minor sprain).
4. **Output Format**:
   - Keep responses natural. 
   - When concluding, add a special token [TRIAGE_COMPLETE].
`;

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: TRIAGE_SYSTEM_PROMPT,
});

export const startChat = async () => {
    return model.startChat({
        history: [],
        generationConfig: {
            maxOutputTokens: 200,
        },
    });
};

export const generateSBAR = async (history) => {
    const summaryModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chatText = history.map(m => `${m.role}: ${m.parts[0].text}`).join("\n");

    const prompt = `
    Based on the following triage conversation, generate a structured SBAR summary for the doctor.
    
    Conversation:
    ${chatText}
    
    Format:
    **S - Situation**: One line summary of patient and main complaint.
    **B - Background**: Relevant history, age, gender.
    **A - Assessment**: Key symptoms, severity, risk level (Red/Amber/Green).
    **R - Recommendation**: Where they should go (ER/Clinic/Home) and urgency.
  `;

    const result = await summaryModel.generateContent(prompt);
    return result.response.text();
};

export const parseSymptomText = async (text) => {
    try {
        const parserModel = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
        Analyze the following text and extract clinical entities into a strict JSON format.
        Text: "${text}"

        Output Schema:
        {
            "symptom": "string (main symptom only, e.g. headache)",
            "associated_symptoms": "string or null (any other symptoms or radiation, e.g. nausea, radiating to left)",
            "severity": "number or null (1-10)",
            "duration": "string or null (e.g. 2 days)",
            "age": "number or null",
            "redFlags": ["string"] (list of critical keywords found. Correct typos like 'cbest' -> 'chest')
        }
        `;

        const result = await parserModel.generateContent(prompt);
        return JSON.parse(result.response.text());
    } catch (error) {
        console.error("Gemini NLP Error:", error);
        return null;
    }
};
