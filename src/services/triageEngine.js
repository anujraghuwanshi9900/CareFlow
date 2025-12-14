
// ===============================
// CLINICAL NLP LAYER (Lightweight)
// Extract structured data from free text before FSM processing
// ===============================

const ClinicalNLP = {
    parse(text = "") {
        const cleanText = text.toLowerCase().trim();

        // Extract known entities first
        const ageObj = this.extractAge(cleanText);
        const durationObj = this.extractDuration(cleanText);
        const severityObj = this.extractSeverity(cleanText);
        const redFlags = this.detectRedFlags(cleanText);

        // Extract symptom by removing known entities from the text
        const symptom = this.extractSymptom(cleanText, [
            ageObj.matched,
            durationObj.matched,
            severityObj.matched
        ]);

        return {
            raw: text,
            symptom: symptom,
            severity: severityObj.value,
            duration: durationObj.value,
            age: ageObj.value,
            redFlags: redFlags,
            confidence: 0.9
        };
    },

    extractSymptom(text, removePhrases = []) {
        let clean = text;

        // 1. Remove identified entities (from other extractors)
        removePhrases.forEach(phrase => {
            if (phrase) {
                clean = clean.replace(phrase, "");
            }
        });

        // 2. Remove connectors and fillers
        clean = clean.replace(/\b(for|since|is|was|around|about|and|also|but|with)\b/g, " ");

        // 3. Remove common intro phrases
        clean = clean.replace(/\b(i have|i am having|i've had|i feel|it feels|there is|i'm|im|suffering from|complaining of|experiencing|my|severity|level|rated|pain|age|years|old)\b/g, " ");

        // 4. Remove articles and remaining descriptors
        clean = clean.replace(/\b(a|an|the|some|very|really|quite|bad|mild|severe|moderate)\b/g, " ");

        // 5. Clean up punctuation and whitespace
        clean = clean.replace(/[.,!?;:]/g, " ");
        clean = clean.replace(/\s+/g, " ").trim();

        return clean || null;
    },

    extractSeverity(text) {
        const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
        const adjectiveMap = {
            mild: 2, low: 2, slight: 2, bit: 2,
            moderate: 5, medium: 5, average: 5,
            severe: 8, high: 8, intense: 8, worst: 10, excruciating: 10, unbearable: 10,
            killer: 9, bad: 7, hurts: 6, painful: 6
        };

        // Track what we matched to remove it later
        let matchedStr = null;
        let value = null;

        // 1. Explicit Numbers (1-10)
        const numeric = text.match(/\b([1-9]|10)\b/);
        if (numeric) {
            value = parseInt(numeric[0]);
            matchedStr = numeric[0];
        }

        // 2. Number Words
        if (!value) {
            const word = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/);
            if (word) {
                value = wordMap[word[0]];
                matchedStr = word[0];
            }
        }

        // 3. Qualitative Adjectives
        if (!value) {
            let maxSev = 0;
            let match = "";
            Object.keys(adjectiveMap).forEach(adj => {
                if (text.includes(adj)) {
                    if (adjectiveMap[adj] > maxSev) {
                        maxSev = adjectiveMap[adj];
                        match = adj;
                    }
                }
            });
            if (maxSev > 0) {
                value = maxSev;
                matchedStr = match;
            }
        }

        return { value, matched: matchedStr };
    },

    extractDuration(text) {
        // Capture patterns like "2 days", "5 hours", "a week", "since yesterday"
        const specificTime = text.match(/\b(\d+|a|an|one|two|three)\s+(minute|hour|day|week|month|year)s?\b/);
        if (specificTime) return { value: specificTime[0], matched: specificTime[0] };

        const relativeTime = text.match(/\b(since|for)\s+(yesterday|last night|this morning|a while)\b/);
        if (relativeTime) return { value: relativeTime[0], matched: relativeTime[0] };

        return { value: null, matched: null };
    },

    extractAge(text) {
        const ageMatch = text.match(/(\d+)\s*(?:years|yrs|yo|old)/);
        if (ageMatch) return { value: parseInt(ageMatch[1]), matched: ageMatch[0] };
        return { value: null, matched: null };
    },

    detectRedFlags(text) {
        const criticalKeywords = [
            "chest pain", "heart attack", "crushing pain",
            "shortness of breath", "can't breathe", "gasping", "air hunger",
            "stroke", "face drooping", "slurred speech", "numbness",
            "unconscious", "fainted", "passed out",
            "severe bleeding", "hemorrhage",
            "suicide", "kill myself", "overdose"
        ];

        const found = [];
        criticalKeywords.forEach(k => {
            if (text.includes(k)) found.push(k);
        });
        return found;
    }
};


// ===============================
// TRIAGE SESSION (FSM)
// Consumes Structured Data from NLP Layer (Hybrid: API -> Local)
// ===============================

import { parseSymptomText } from "./gemini.js";

const RISK_LEVELS = {
    EMERGENCY: { label: "CRITICAL ALERT", color: "red", advice: "Call Emergency Services (911) or go to ER immediately." },
    URGENT: { label: "URGENT CARE", color: "orange", advice: "Seek medical attention (Clinic/Urgent Care) within 24 hours." },
    TELECONSULT: { label: "TELECONSULT", color: "blue", advice: "Schedule a video/audio consultation with a doctor." },
    ROUTINE: { label: "SELF CARE / ROUTINE", color: "green", advice: "Manage at home. Monitor symptoms." }
};

class TriageSession {
    constructor() {
        this.state = "GREETING";
        this.context = {
            mainSymptom: "",
            associatedSymptoms: "",
            severity: null,
            duration: "",
            age: null,
            risk: null,
            redFlags: [],
            rationale: "" // Explainability
        };
    }

    async processMessage(userText = "") {
        // 1. NLP PRE-PROCESSING (Hybrid)
        const uniqueText = userText || "";
        let nlpData = null;

        // Try Gemini API first for rich extraction
        if (uniqueText && uniqueText !== "START_SESSION") {
            nlpData = await parseSymptomText(uniqueText);
        }

        // Fallback to Local NLP if API failed or returned null
        if (!nlpData) {
            console.log("Using Local NLP Fallback");
            nlpData = ClinicalNLP.parse(uniqueText);
        } else {
            console.log("Using Gemini NLP", nlpData);
        }

        // --- GLOBAL CONTEXT MERGE (Full Prompt Extraction) ---
        // Capture entities regardless of current state or order
        if (nlpData) {
            if (nlpData.severity) this.context.severity = nlpData.severity;
            if (nlpData.duration) this.context.duration = nlpData.duration;
            if (nlpData.age) this.context.age = nlpData.age;
            // Note: Symptoms are handled per-state to avoid overwriting main vs associated
        }

        // 2. GLOBAL RED FLAG CHECK (Overrides everything)
        // Ensure redFlags is an array and filter out negations
        const detectedFlags = this._filterRedFlags(nlpData.redFlags || [], uniqueText);

        if (detectedFlags.length > 0) {
            this.context.redFlags = [...new Set([...this.context.redFlags, ...detectedFlags])];
            this.context.risk = RISK_LEVELS.EMERGENCY;
            this.context.rationale = `Detected Critical Red Flags: ${detectedFlags.join(", ")}`;
            this.state = "COMPLETE";
            return {
                text: `🚨 **CRITICAL ALERT** 🚨\n\nI have detected signs of a medical emergency ("${this.context.redFlags.join(", ")}").\n\n**Recommendation**: ${this.context.risk.advice}`,
                isComplete: true
            };
        }

        // 3. FSM LOGIC
        switch (this.state) {
            case "GREETING":
                this.state = "MAIN_SYMPTOM";
                return {
                    text: "Hi, I’m your health triage assistant. What symptoms are you experiencing today?",
                    isComplete: false
                };

            case "MAIN_SYMPTOM":
                // Store Extracted Entities
                if (nlpData.symptom) this.context.mainSymptom = nlpData.symptom;
                if (nlpData.associated_symptoms) this.context.associatedSymptoms = nlpData.associated_symptoms;
                if (nlpData.severity) this.context.severity = nlpData.severity;
                if (nlpData.duration) this.context.duration = nlpData.duration;
                if (nlpData.age) this.context.age = nlpData.age;

                // Fallback if extracting failed locally but user typed something
                if (!this.context.mainSymptom && uniqueText) this.context.mainSymptom = uniqueText;

                // --- ONE-SHOT COMPLETION CHECK ---
                // If we have Severity + Duration + Age, we can finish!
                if (this.context.severity && this.context.duration && this.context.age) {
                    this.state = "COMPLETE";
                    this._finalizeRisk();
                    return {
                        text: this._generateReport(),
                        isComplete: true
                    };
                }

                // Transition Logic:
                // If we found associated symptoms, skip to DETAILS
                if (this.context.associatedSymptoms) {
                    this.state = "DETAILS";
                    // Check if we need details
                    if (this.context.severity && this.context.duration) {
                        // We have details too, must be missing Age then (caught by check above) -> Go to Age
                        this.state = "AGE";
                        return {
                            text: `Got it. (${this.context.mainSymptom} + ${this.context.associatedSymptoms}).\n\nI just need your **Age** to finish.`,
                            isComplete: false
                        };
                    }
                    return this._askDetails();
                }

                this.state = "ASSOCIATED_SYMPTOMS";

                // Construct a smarter verification message
                let ack = `HI ("${this.context.mainSymptom}").`;
                if (this.context.severity || this.context.duration) {
                    ack += ` I've noted the details.`;
                }

                return {
                    text: `${ack}\n\nI’m your health triage assistant. Do you have any symptoms accompanying this? (e.g., fever, nausea, dizziness)`,
                    isComplete: false
                };

            case "ASSOCIATED_SYMPTOMS":
                this.context.associatedSymptoms = nlpData.symptom || uniqueText; // Just store what they said for associated
                this.state = "DETAILS";

                // --- SMART SKIP LOGIC ---
                // If we already have Severity + Duration + Age, we can finish!
                if (this.context.severity && this.context.duration && this.context.age) {
                    this.state = "COMPLETE";
                    this._finalizeRisk();
                    return {
                        text: this._generateReport(),
                        isComplete: true
                    };
                }

                // If we just have Sev+Dur but need Age:
                if (this.context.severity && this.context.duration && !this.context.age) {
                    this.state = "AGE";
                    return {
                        text: `Got it.\n\nSince you already mentioned the details (Severity ${this.context.severity}, ${this.context.duration}), I just need your **Age** to finish.`,
                        isComplete: false
                    };
                }

                // Else, proceed to DETAILS check
                return this._askDetails();

            case "DETAILS":
                // Fill in gaps
                if (!this.context.severity) this.context.severity = nlpData.severity || 5;
                if (!this.context.duration) this.context.duration = nlpData.duration || uniqueText;

                this.state = "AGE";

                // Smart Skip: If we already captured age earlier
                if (this.context.age) {
                    this.state = "COMPLETE";
                    this._finalizeRisk();
                    return {
                        text: this._generateReport(),
                        isComplete: true
                    };
                }

                return {
                    text: `Okay. Finally, just to be safe, what is your **age**?`,
                    isComplete: false
                };

            case "AGE":
                if (!this.context.age) {
                    this.context.age = nlpData.age || parseInt(uniqueText.match(/\d+/)?.[0] || "30");
                }
                this.state = "COMPLETE";
                this._finalizeRisk();

                return {
                    text: this._generateReport(),
                    isComplete: true
                };

            case "COMPLETE":
                return { text: "Session ended. Refresh to restart.", isComplete: true };

            default:
                return { text: "...", isComplete: false };
        }
    }

    // Helper to filter out negations like "no chest pain"
    _filterRedFlags(flags, text) {
        if (!flags || flags.length === 0) return [];
        const lowerText = text.toLowerCase();

        return flags.filter(flag => {
            const flagLower = flag.toLowerCase();
            // Check if user said "no {flag}" or "not {flag}"
            // Simple validation: regex for "no {flag}"
            const negationRegex = new RegExp(`\\b(no|not|don't have|without)\\s+${flagLower}`, 'i');
            if (negationRegex.test(lowerText)) {
                console.log(`Ignoring negated red flag: ${flag}`);
                return false;
            }
            return true;
        });
    }

    _askDetails() {
        let prompt = "Got it.\n\nPlease tell me:";
        let missing = [];
        if (!this.context.severity) missing.push("1️⃣ Severity (1–10)");
        if (!this.context.duration) missing.push("2️⃣ Duration (how long?)");
        return {
            text: `${prompt}\n${missing.join('\n')}`,
            isComplete: false
        };
    }

    _finalizeRisk() {
        const allSymptoms = (this.context.mainSymptom + " " + this.context.associatedSymptoms).toLowerCase();
        const sev = this.context.severity || 1;
        const age = this.context.age || 30;

        // 1. EMERGENCY (Severity 9-10 or Red Flags)
        if (sev >= 9) {
            this.context.risk = RISK_LEVELS.EMERGENCY;
            this.context.rationale = `Severity is extremely high (${sev}/10).`;
        }

        // 2. URGENT (Severity 7-8 or Age Risk)
        else if (sev >= 7) {
            this.context.risk = RISK_LEVELS.URGENT;
            this.context.rationale = `High severity symptoms (${sev}/10) require physical assessment.`;
        }
        else if (age > 65 && sev >= 5) {
            this.context.risk = RISK_LEVELS.URGENT;
            this.context.rationale = `Moderate symptoms at age ${age} carry higher risk.`;
        }

        // 3. TELECONSULT (Severity 4-6)
        else if (sev >= 4) {
            this.context.risk = RISK_LEVELS.TELECONSULT;
            this.context.rationale = `Moderate severity (${sev}/10) is suitable for remote assessment.`;
        }
        else if (allSymptoms.includes("fever") || allSymptoms.includes("vomit")) {
            // Systemic symptoms even if low severity might need a quick check
            this.context.risk = RISK_LEVELS.TELECONSULT;
            this.context.rationale = "Systemic symptoms detected (fever/vomiting).";
        }

        // 4. ROUTINE (Severity 1-3)
        else {
            this.context.risk = RISK_LEVELS.ROUTINE;
            this.context.rationale = `Symptoms appear mild (Severity ${sev}/10).`;
        }
    }

    _generateReport() {
        return `✅ **Assessment Complete**\n\n` +
            `**Main Symptom:** ${this.context.mainSymptom}\n` +
            `**Associated:** ${this.context.associatedSymptoms || "None"}\n` +
            `**Severity:** ${this.context.severity}/10\n` +
            `**Age:** ${this.context.age}\n\n` +
            `**Result:** ${this.context.risk.label}\n` +
            `**Analysis:** ${this.context.rationale}\n` +
            `**Advice:** ${this.context.risk.advice}\n\n[TRIAGE_COMPLETE]`;
    }

    generateSBAR() {
        const c = this.context;
        return `S: ${c.mainSymptom} (Sev ${c.severity}). B: Age ${c.age}, Duration ${c.duration}. A: ${c.risk.label} - ${c.rationale}. R: ${c.risk.advice}`;
    }
}

export const triageEngine = new TriageSession();
