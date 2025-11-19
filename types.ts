export interface Note {
  id: string;
  content: string;
  createdAt: number;
  isAiGenerated?: boolean;
}

export interface AiSuggestion {
  id: string;
  text: string;
  type: 'question' | 'summary' | 'topic';
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  SAVING = 'SAVING',
  AI_THINKING = 'AI_THINKING',
}

// Extend Window for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
