import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { VoiceInput } from "./VoiceInput";
import { TriageSummary } from "./TriageSummary";
import { triageEngine } from "../services/triageEngine";
import { motion, AnimatePresence } from "framer-motion";

export const ChatInterface = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [sbar, setSbar] = useState(null);
    const messagesEndRef = useRef(null);
    const baseInputRef = useRef("");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSpeechStart = () => {
        baseInputRef.current = inputText;
    };

    const handleSpeechEnd = () => {
        // Optional cleanup
    };

    const handleSpeechResult = (transcript) => {
        const prefix = baseInputRef.current ? baseInputRef.current + " " : "";
        setInputText(prefix + transcript);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading, sbar]);

    // Initialize Chat
    useEffect(() => {
        // Simulate initial delay
        setIsLoading(true);
        setTimeout(() => {
            // Reset engine for new session if needed, but for now singleton is fine for demo
            // Actually better to handle greeting logic via the engine directly?
            // Let's manually trigger the first prompt from the engine.
            // Or just hardcode the greeting in UI to start? 
            // Let's call a "start" method on engine or just process empty/start signal.
            // Let's just create a fresh session feel by resetting if we could, 
            // but since we export a singleton instance, we should add a reset method.
            // For this demo, let's assume one pass.
            // We trigger the GREETING state.
            triageEngine.processMessage("START_SESSION").then(response => {
                setMessages([{ role: "model", text: response.text }]);
                setIsLoading(false);
            });
        }, 1000);
    }, []);

    const handleSendMessage = async (text) => {
        if (!text.trim() || isComplete) return;

        const userMsg = { role: "user", text };
        setMessages((prev) => [...prev, userMsg]);
        setInputText("");
        setIsLoading(true);

        // Simulate Network Delay for realism? No, API is real now.
        // But we want to simulate "thinking" or minimal delay so it doesn't flash.
        // Let's await the response.

        try {
            const response = await triageEngine.processMessage(text);

            const cleanText = response.text.replace("[TRIAGE_COMPLETE]", "").trim();
            setMessages((prev) => [...prev, { role: "model", text: cleanText }]);

            if (response.isComplete) {
                setIsComplete(true);
                // SBAR generation is also async now if we wanted, but triageEngine.generateSBAR is sync currently
                // Wait, triageEngine.generateSBAR is synchronous formatted string.
                // But gemini.js has generateSBAR async. 
                // triageEngine.js has a local synchronous generateSBAR helper.
                // Let's stick to the local one for now as it's immediate.
                const summary = triageEngine.generateSBAR();
                setTimeout(() => setSbar(summary), 500);
            }
        } catch (err) {
            console.error(err);
            setMessages((prev) => [...prev, { role: "model", text: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(inputText);
        }
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl bg-slate-50 rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="bg-white p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
                        CF
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">CareFlow Assistant</h2>
                        <p className="text-xs text-slate-500 font-medium">Local Expert System • Private & Secure</p>
                    </div>
                </div>
                {isComplete && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        Assessment Complete
                    </span>
                )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <MessageBubble key={idx} message={msg} />
                    ))}
                </AnimatePresence>

                {isLoading && !sbar && <TypingIndicator />}

                {sbar && <TriageSummary summary={sbar} />}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <VoiceInput
                        onSpeechResult={handleSpeechResult}
                        onSpeechStart={handleSpeechStart}
                        onSpeechEnd={handleSpeechEnd}
                        disabled={isLoading || isComplete}
                    />

                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={isComplete ? "Session ended." : "Type your symptoms..."}
                            disabled={isLoading || isComplete}
                            className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-700 placeholder-slate-400"
                        />
                        <button
                            onClick={() => handleSendMessage(inputText)}
                            disabled={!inputText.trim() || isLoading || isComplete}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
