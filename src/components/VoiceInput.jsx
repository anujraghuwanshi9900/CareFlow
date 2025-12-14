import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

export const VoiceInput = ({ onSpeechResult, onSpeechStart, onSpeechEnd, disabled }) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = false; // Simple sentence mode
            rec.interimResults = true; // Real-time typing
            rec.lang = "en-US";

            rec.onstart = () => {
                setIsListening(true);
                onSpeechStart?.();
            };

            rec.onresult = (event) => {
                let finalTranscript = "";
                let interimTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // We send the latest chunk. 
                // For simple one-shot, we can just send the combined.
                // But specifically for the "App.jsx" appending logic, 
                // we want the total current transcript of this session.
                // 'event.results' accumulates in current session? 
                // Yes, if continuous=false, it resets.
                // We simply send `interimTranscript + finalTranscript` as the "current speech text".
                // Wait, if isFinal, it might be done.

                // Simpler approach for React state mapping:
                // Just pass the most current full input from this session.
                // In Chrome, results[0][0] is usually the whole thing if continuous=false.

                const currentSpeech = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                onSpeechResult(currentSpeech);
            };

            rec.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                onSpeechEnd?.();
            };

            rec.onend = () => {
                setIsListening(false);
                onSpeechEnd?.();
            };

            setRecognition(rec);
        }
    }, [onSpeechResult]);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    if (!recognition) return null; // Hide if not supported

    return (
        <button
            onClick={toggleListening}
            disabled={disabled}
            className={`p-3 rounded-full transition-colors ${isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isListening ? "Stop listening" : "Start speaking"}
        >
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
    );
};
