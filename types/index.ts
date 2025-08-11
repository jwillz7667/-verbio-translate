export type Page = 'main' | 'signin' | 'signup' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  settings: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    autoTranslate: boolean;
    saveHistory: boolean;
    voiceSettings: {
      speed: number;
      pitch: number;
      voice: string;
    };
  };
}

export interface ConversationMessage {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  inputType: 'voice' | 'text' | 'image';
  confidence: number;
  timestamp: Date;
  speaker: 'user' | 'other';
  audioUrl?: string;
  duration?: number;
  processingTime?: number;
}

export interface ConversationData {
  id: string;
  title: string;
  messages: ConversationMessage[];
  isActive: boolean;
  isProcessing?: boolean;
  startedAt: Date;
  lastActivityAt: Date;
  totalMessages: number;
  avgConfidence: number;
}

export interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
  processingTime: number;
}

export interface AppState {
  currentPage: Page;
  isListening: boolean;
  fromLanguage: string;
  toLanguage: string;
  showTips: boolean;
  user: User | null;
  currentConversation: ConversationData | null;
  isProcessing: boolean;
  conversationMode: boolean;
  showImageUpload: boolean;
  isVoiceInput: boolean;
  extractingText: boolean;
  speechRecognitionText: string;
  speechError: string | null;
  isRecordingAudio: boolean;
  showMicrophoneGuide: boolean;
  showPermissionBanner: boolean;
  realtimeSession: { sessionId: string; expiresAt: string } | null;
}

export interface AudioData {
  audioBlob: Blob;
  language: string;
  prompt?: string;
}

export interface OCRResult {
  extractedText: string;
  translatedText: string;
  confidence: number;
  detectedLanguage: string;
  toLanguage: string;
}

export interface AnalyticsEvent {
  event: string;
  data?: Record<string, any>;
}