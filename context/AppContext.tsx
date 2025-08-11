'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, User, ConversationData, Page } from '../types';

// Initial state
const initialState: AppState = {
  currentPage: 'main' as Page,
  isListening: false,
  fromLanguage: 'English',
  toLanguage: 'Spanish',
  showTips: false,
  user: null,
  currentConversation: null,
  isProcessing: false,
  conversationMode: false,
  showImageUpload: false,
  isVoiceInput: false,
  extractingText: false,
  speechRecognitionText: '',
  speechError: null,
  isRecordingAudio: false,
  showMicrophoneGuide: false,
  showPermissionBanner: false,
  realtimeSession: null
};

// Action types
type AppAction = 
  | { type: 'SET_CURRENT_PAGE'; payload: Page }
  | { type: 'SET_IS_LISTENING'; payload: boolean }
  | { type: 'SET_FROM_LANGUAGE'; payload: string }
  | { type: 'SET_TO_LANGUAGE'; payload: string }
  | { type: 'SET_SHOW_TIPS'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_CURRENT_CONVERSATION'; payload: ConversationData | null }
  | { type: 'SET_IS_PROCESSING'; payload: boolean }
  | { type: 'SET_CONVERSATION_MODE'; payload: boolean }
  | { type: 'SET_SHOW_IMAGE_UPLOAD'; payload: boolean }
  | { type: 'SET_IS_VOICE_INPUT'; payload: boolean }
  | { type: 'SET_EXTRACTING_TEXT'; payload: boolean }
  | { type: 'SET_SPEECH_RECOGNITION_TEXT'; payload: string }
  | { type: 'SET_SPEECH_ERROR'; payload: string | null }
  | { type: 'SET_IS_RECORDING_AUDIO'; payload: boolean }
  | { type: 'SET_SHOW_MICROPHONE_GUIDE'; payload: boolean }
  | { type: 'SET_SHOW_PERMISSION_BANNER'; payload: boolean }
  | { type: 'SET_REALTIME_SESSION'; payload: { sessionId: string; expiresAt: string } | null };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_IS_LISTENING':
      return { ...state, isListening: action.payload };
    case 'SET_FROM_LANGUAGE':
      return { ...state, fromLanguage: action.payload };
    case 'SET_TO_LANGUAGE':
      return { ...state, toLanguage: action.payload };
    case 'SET_SHOW_TIPS':
      return { ...state, showTips: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_CURRENT_CONVERSATION':
      return { ...state, currentConversation: action.payload };
    case 'SET_IS_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_CONVERSATION_MODE':
      return { ...state, conversationMode: action.payload };
    case 'SET_SHOW_IMAGE_UPLOAD':
      return { ...state, showImageUpload: action.payload };
    case 'SET_IS_VOICE_INPUT':
      return { ...state, isVoiceInput: action.payload };
    case 'SET_EXTRACTING_TEXT':
      return { ...state, extractingText: action.payload };
    case 'SET_SPEECH_RECOGNITION_TEXT':
      return { ...state, speechRecognitionText: action.payload };
    case 'SET_SPEECH_ERROR':
      return { ...state, speechError: action.payload };
    case 'SET_IS_RECORDING_AUDIO':
      return { ...state, isRecordingAudio: action.payload };
    case 'SET_SHOW_MICROPHONE_GUIDE':
      return { ...state, showMicrophoneGuide: action.payload };
    case 'SET_SHOW_PERMISSION_BANNER':
      return { ...state, showPermissionBanner: action.payload };
    case 'SET_REALTIME_SESSION':
      return { ...state, realtimeSession: action.payload };
    default:
      return state;
  }
}

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}