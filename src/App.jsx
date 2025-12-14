import { ChatInterface } from "./components/ChatInterface";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4 md:p-8">
      <div className="text-center mb-8 max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
            CareFlow
          </span>
        </h1>
        <p className="text-slate-600 text-lg">
          Intelligent Triage & Health Assessment
        </p>
      </div>

      <ChatInterface />

      <footer className="mt-8 text-slate-400 text-sm font-medium">
        © 2025 CareFlow Health • For Demonstration Only
      </footer>
    </div>
  );
}

export default App;
