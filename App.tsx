import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Send, Sparkles as SparkleIcon, BrainCircuit, Clock, MessageSquare, Lightbulb, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Note, AppState, AiSuggestion } from './types';
import { generateInsights } from './services/geminiService';
import { Sparkles } from './components/Sparkles';

type Tab = 'history' | 'record' | 'idea';

const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [notes, setNotes] = useState<Note[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  
  // Effects
  const [sparklePos, setSparklePos] = useState({ x: 0, y: 0 });
  const [showSparkles, setShowSparkles] = useState(false);
  const sendButtonRef = useRef<HTMLButtonElement>(null);
  
  // Voice
  const recognitionRef = useRef<any>(null);

  // --- Data Persistence & Init ---
  useEffect(() => {
    const saved = localStorage.getItem('nebula_notes');
    if (saved) {
      setNotes(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nebula_notes', JSON.stringify(notes));
  }, [notes]);

  // --- AI Logic ---
  // Check for insights when notes change or periodically
  useEffect(() => {
    const timer = setInterval(async () => {
      if (notes.length > 0) {
        const recent = notes.slice(0, 5);
        const newSuggestions = await generateInsights(recent);
        setSuggestions(newSuggestions);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [notes]);

  // Initial AI check if we have notes but no suggestions
  useEffect(() => {
    if (activeTab === 'idea' && suggestions.length === 0 && notes.length > 0) {
      generateInsights(notes.slice(0, 5)).then(setSuggestions);
    }
  }, [activeTab, notes, suggestions.length]);


  // --- Voice Recognition ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech error", event);
        setAppState(AppState.IDLE);
      };
      
      recognitionRef.current.onend = () => {
          if (appState === AppState.RECORDING) {
             setAppState(AppState.IDLE);
          }
      };
    }
  }, [appState]);

  // --- Handlers ---
  const toggleRecording = () => {
    if (appState === AppState.RECORDING) {
      recognitionRef.current?.stop();
      setAppState(AppState.IDLE);
    } else {
      recognitionRef.current?.start();
      setAppState(AppState.RECORDING);
    }
  };

  const handleSave = useCallback(() => {
    if (!inputValue.trim()) return;

    if (sendButtonRef.current) {
      const rect = sendButtonRef.current.getBoundingClientRect();
      setSparklePos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 1000);
    }

    const newNote: Note = {
      id: Date.now().toString(),
      content: inputValue,
      createdAt: Date.now(),
    };

    setAppState(AppState.SAVING);

    setTimeout(() => {
      setNotes(prev => [newNote, ...prev]);
      setInputValue('');
      setAppState(AppState.IDLE);
      
      // Optional: Switch to history or stay to write more? 
      // Staying is better for flow, but maybe show a toast.
    }, 600);
  }, [inputValue, notes]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const useSuggestion = (text: string) => {
    // If on Record tab, add to input
    if (activeTab === 'record') {
        setInputValue(prev => prev + (prev ? '\n' : '') + text + ' ');
    } else {
        // If on Idea tab, switch to record and add
        setActiveTab('record');
        setTimeout(() => {
            setInputValue(prev => prev + (prev ? '\n' : '') + text + ' ');
        }, 200);
    }
  };

  // --- Render Views ---

  const renderHistory = () => (
    <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: -20 }}
        className="relative flex flex-col gap-4 pb-28 px-4"
    >
        {/* Timeline Vertical Line */}
        {notes.length > 0 && (
            <div className="absolute left-[28px] top-12 bottom-32 w-0.5 bg-gradient-to-b from-nebula-600/50 via-nebula-800/50 to-transparent rounded-full" />
        )}

        <div className="flex items-center gap-3 mb-2 opacity-70 px-2 relative z-10">
            <Clock className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Timeline</h2>
        </div>

        <AnimatePresence mode="popLayout">
            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-nebula-600">
                    <Clock className="w-12 h-12 mb-4 opacity-20" />
                    <p>No history yet.</p>
                </div>
            ) : (
                notes.map((note, index) => (
                    <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative pl-8"
                    >
                        {/* Timeline Dot */}
                        <div className="absolute left-[11px] top-6 w-2.5 h-2.5 rounded-full bg-nebula-950 border-2 border-nebula-500 z-10" />

                        <div className="group relative p-5 rounded-2xl bg-nebula-800/40 border border-nebula-700/30 backdrop-blur-sm active:scale-[0.98] transition-transform">
                             {/* Decorative accent */}
                             <div className="absolute -left-0 top-0 bottom-0 w-1 bg-nebula-600/0 rounded-l-2xl group-hover:bg-nebula-500/50 transition-all duration-300" />
                             
                            <p className="text-nebula-100 whitespace-pre-wrap leading-relaxed text-base">
                                {note.content}
                            </p>
                            <div className="mt-3 flex justify-between items-center text-xs text-nebula-500">
                                <span>{new Date(note.createdAt).toLocaleDateString()} • {new Date(note.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                    </motion.div>
                ))
            )}
        </AnimatePresence>
    </motion.div>
  );

  const renderRecord = () => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex flex-col justify-center min-h-[70vh] px-4"
    >
        <div className="relative z-20">
            <motion.div 
                className={`relative rounded-3xl bg-nebula-800/40 border border-nebula-700/50 backdrop-blur-xl shadow-[0_0_40px_rgba(118,82,214,0.1)] transition-all duration-500 overflow-hidden ${appState === AppState.RECORDING ? 'ring-2 ring-red-500/50 border-red-500/30' : 'focus-within:ring-2 focus-within:ring-nebula-500/50 focus-within:border-nebula-500'}`}
            >
                <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's on your mind?"
                    className="w-full bg-transparent text-xl md:text-2xl p-6 min-h-[280px] outline-none resize-none placeholder:text-nebula-600/50 text-nebula-100 leading-relaxed selection:bg-nebula-500/30"
                    autoFocus
                />

                {/* Toolbar inside the card */}
                <div className="flex justify-between items-center px-5 py-4 border-t border-nebula-700/30 bg-nebula-900/30">
                    <button 
                        onClick={toggleRecording}
                        className={`p-3 rounded-full transition-all duration-300 active:scale-90 ${appState === AppState.RECORDING ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-nebula-700/50 text-nebula-400 hover:text-nebula-200'}`}
                    >
                        <Mic className={`w-6 h-6 ${appState === AppState.RECORDING ? 'fill-current' : ''}`} />
                    </button>

                    <button
                        ref={sendButtonRef}
                        onClick={handleSave}
                        disabled={!inputValue.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-nebula-500 hover:bg-nebula-400 disabled:bg-nebula-800/50 disabled:text-nebula-600 text-white rounded-2xl font-semibold shadow-lg shadow-nebula-900/50 transition-all active:scale-95"
                    >
                        <span>Save</span>
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>

             {/* Quick Hints just for Record view */}
             {inputValue.length === 0 && suggestions.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2 justify-center opacity-60">
                     {suggestions.slice(0, 2).map(s => (
                         <button key={s.id} onClick={() => useSuggestion(s.text)} className="text-xs bg-nebula-800/50 px-3 py-1 rounded-full border border-nebula-700 hover:border-nebula-500 transition-colors">
                             {s.text}
                         </button>
                     ))}
                </div>
             )}
        </div>
    </motion.div>
  );

  const renderIdea = () => (
    <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        exit={{ opacity: 0, x: 20 }}
        className="flex flex-col gap-6 pb-28 p-4"
    >
        <div className="flex items-center gap-3 mb-2 opacity-70 px-2">
            <BrainCircuit className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Inspiration</h2>
        </div>

        <div className="grid gap-4">
            {suggestions.length === 0 ? (
                 <div className="p-6 rounded-2xl bg-nebula-800/20 border border-nebula-700/30 text-center">
                     <SparkleIcon className="w-8 h-8 text-nebula-500 mx-auto mb-3 animate-pulse" />
                     <p className="text-nebula-300">Analyzing your notes to spark new ideas...</p>
                 </div>
            ) : (
                suggestions.map((s, idx) => (
                    <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-nebula-800/60 to-nebula-900/60 border border-nebula-600/30 group"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-50 transition-opacity">
                            <Lightbulb className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm text-nebula-400 font-bold mb-2 uppercase tracking-wide">{s.type}</h3>
                        <p className="text-lg text-nebula-100 font-medium leading-relaxed mb-4">"{s.text}"</p>
                        <button 
                            onClick={() => useSuggestion(s.text)}
                            className="text-sm font-semibold text-nebula-300 hover:text-white flex items-center gap-2 group-hover:translate-x-2 transition-transform"
                        >
                            Write about this <Send className="w-3 h-3" />
                        </button>
                    </motion.div>
                ))
            )}
        </div>
        
        <div className="mt-8 p-6 rounded-3xl bg-nebula-500/10 border border-nebula-500/20 text-center">
            <p className="text-sm text-nebula-300 mb-4">Need more sparks?</p>
            <button 
                onClick={() => notes.length > 0 && generateInsights(notes.slice(0,10)).then(setSuggestions)}
                className="px-4 py-2 bg-nebula-600 hover:bg-nebula-500 rounded-xl text-white text-sm font-medium transition-colors"
            >
                Refresh Ideas
            </button>
        </div>
    </motion.div>
  );

  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-nebula-950 via-nebula-900 to-nebula-950 text-nebula-100 flex flex-col relative overflow-hidden">
      
      {/* Background Ambient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-nebula-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-nebula-500/10 rounded-full blur-[120px] pointer-events-none" />

      <Sparkles active={showSparkles} x={sparklePos.x} y={sparklePos.y} />

      {/* Header */}
      <header className="px-6 py-3 pt-[max(1rem,env(safe-area-inset-top))] flex justify-between items-center backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-nebula-600 to-nebula-800 flex items-center justify-center shadow-lg shadow-nebula-500/20">
                <MessageSquare className="w-4 h-4 text-white" />
            </div>
             {/* Dynamic Title based on Tab */}
            <h1 className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-nebula-100 to-nebula-400 transition-all">
                LittleChat
            </h1>
        </div>
        <div className="text-xs text-nebula-500 font-mono bg-nebula-900/50 px-2 py-1 rounded-md border border-nebula-800">
            {notes.length} Memos
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
        <div className="max-w-md mx-auto w-full h-full">
            <AnimatePresence mode="wait">
                {activeTab === 'record' && renderRecord()}
                {activeTab === 'history' && renderHistory()}
                {activeTab === 'idea' && renderIdea()}
            </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
          {/* Gradient Fade for content behind nav */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-nebula-950 via-nebula-950/90 to-transparent pointer-events-none" />
          
          <div className="relative flex items-end justify-center gap-8 pb-4 px-6">
              
              {/* History Tab */}
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 p-3 transition-all duration-300 ${activeTab === 'history' ? 'text-nebula-100 -translate-y-1' : 'text-nebula-500 hover:text-nebula-300'}`}
              >
                  <div className={`p-2 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-nebula-800' : 'bg-transparent'}`}>
                      <Clock className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium tracking-wider">History</span>
              </button>

              {/* Record Tab (Center, Large) */}
              <div className="relative -top-2">
                  <button 
                    onClick={() => setActiveTab('record')}
                    className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg shadow-nebula-500/20 transition-all duration-300 active:scale-95 ${activeTab === 'record' ? 'bg-gradient-to-tr from-nebula-600 to-nebula-500 text-white scale-110 border-4 border-nebula-950' : 'bg-nebula-800 text-nebula-400 border-4 border-nebula-950 hover:bg-nebula-700'}`}
                  >
                      <Mic className={`w-7 h-7 transition-transform ${activeTab === 'record' ? 'scale-110' : 'scale-100'}`} />
                      
                      {/* Subtle glow ring for active state */}
                      {activeTab === 'record' && (
                          <div className="absolute inset-0 rounded-full ring-2 ring-white/20 animate-pulse" />
                      )}
                  </button>
              </div>

              {/* Idea Tab */}
              <button 
                onClick={() => setActiveTab('idea')}
                className={`flex flex-col items-center gap-1 p-3 transition-all duration-300 ${activeTab === 'idea' ? 'text-nebula-100 -translate-y-1' : 'text-nebula-500 hover:text-nebula-300'}`}
              >
                  <div className={`p-2 rounded-xl transition-colors ${activeTab === 'idea' ? 'bg-nebula-800' : 'bg-transparent'}`}>
                      <Lightbulb className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium tracking-wider">Idea</span>
              </button>

          </div>
      </nav>
    </div>
  );
};

export default App;