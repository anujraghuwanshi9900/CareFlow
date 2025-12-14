import { motion } from "framer-motion";
import { FileText, Stethoscope } from "lucide-react";

export const TriageSummary = ({ summary }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mt-4 mx-4 mb-4"
        >
            <div className="bg-indigo-600 p-4 flex items-center gap-3 text-white">
                <Stethoscope size={24} />
                <h3 className="font-bold text-lg">Clinical Handover (SBAR)</h3>
            </div>
            <div className="p-6 prose prose-slate max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {summary}
                </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                    onClick={() => window.print()}
                >
                    <FileText size={18} />
                    Print / PDF
                </button>
            </div>
        </motion.div>
    );
};
