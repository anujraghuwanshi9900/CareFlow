import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";

export const MessageBubble = ({ message }) => {
    const isUser = message.role === "user";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}
        >
            <div className={`flex max-w-[80%] ${isUser ? "flex-row-reverse" : "flex-row"} items-start gap-2`}>
                <div
                    className={`p-2 rounded-full shrink-0 ${isUser ? "bg-primary text-white" : "bg-emerald-500 text-white"
                        }`}
                >
                    {isUser ? <User size={20} /> : <Bot size={20} />}
                </div>

                <div
                    className={`p-4 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed ${isUser
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                        }`}
                >
                    {message.text}
                </div>
            </div>
        </motion.div>
    );
};

export const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex w-full mb-4 justify-start"
    >
        <div className="flex max-w-[80%] flex-row items-start gap-2">
            <div className="p-2 rounded-full bg-emerald-500 text-white shrink-0">
                <Bot size={20} />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 bg-slate-400 rounded-full"
                    />
                ))}
            </div>
        </div>
    </motion.div>
);
