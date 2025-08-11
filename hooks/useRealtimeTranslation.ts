import { useState, useEffect, useCallback, useRef } from 'react';
import { TranslationService } from '../services/translationService';
import { AudioProcessor } from '../services/audioProcessor';

export interface RealtimeTranslationState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  currentTranscription: string;
  currentTranslation: string;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface UseRealtimeTranslationOptions {
  apiKey?: string;
  autoConnect?: boolean;
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeTranslation(options: UseRealtimeTranslationOptions = {}) {
  const [state, setState] = useState<RealtimeTranslationState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    currentTranscription: '',
    currentTranslation: '',
    error: null,
    connectionStatus: 'disconnected'
  });

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize the translation service
  useEffect(() => {
    if (options.autoConnect && !isInitializedRef.current) {
      isInitializedRef.current = true;
      initializeService();
    }

    // Set up event listeners
    const handleTranscription = (event: CustomEvent) => {
      const transcript = event.detail.transcript;
      setState(prev => ({ ...prev, currentTranscription: transcript }));
      options.onTranscription?.(transcript);
    };

    const handleTranslation = (event: CustomEvent) => {
      const translation = event.detail.translatedText || event.detail.translation;
      setState(prev => ({ ...prev, currentTranslation: translation, isProcessing: false }));
      options.onTranslation?.(translation);
    };

    const handleError = (event: CustomEvent) => {
      const error = event.detail;
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'An error occurred',
        connectionStatus: 'error',
        isProcessing: false 
      }));
      options.onError?.(error);
    };

    const handleDisconnected = () => {
      setState(prev => ({ 
        ...prev, 
        isConnected: false,
        connectionStatus: 'disconnected',
        isRecording: false,
        isProcessing: false
      }));
    };

    const handleReconnectFailed = () => {
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: 'Failed to reconnect to OpenAI Realtime API'
      }));
    };

    window.addEventListener('transcription', handleTranscription as EventListener);
    window.addEventListener('translation', handleTranslation as EventListener);
    window.addEventListener('translation-error', handleError as EventListener);
    window.addEventListener('realtime-disconnected', handleDisconnected);
    window.addEventListener('realtime-reconnect-failed', handleReconnectFailed);

    return () => {
      window.removeEventListener('transcription', handleTranscription as EventListener);
      window.removeEventListener('translation', handleTranslation as EventListener);
      window.removeEventListener('translation-error', handleError as EventListener);
      window.removeEventListener('realtime-disconnected', handleDisconnected);
      window.removeEventListener('realtime-reconnect-failed', handleReconnectFailed);
    };
  }, [options]);

  const initializeService = useCallback(async () => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    
    try {
      const apiKey = options.apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OpenAI API key is required. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.');
      }

      await TranslationService.initialize(apiKey);
      
      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        connectionStatus: 'connected',
        error: null
      }));
    } catch (error) {
      console.error('Failed to initialize realtime translation:', error);
      setState(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: error instanceof Error ? error.message : 'Failed to initialize',
        isConnected: false
      }));
      options.onError?.(error as Error);
    }
  }, [options.apiKey, options.onError]);

  const connect = useCallback(async () => {
    if (state.isConnected || state.connectionStatus === 'connecting') {
      return;
    }
    
    await initializeService();
  }, [state.isConnected, state.connectionStatus, initializeService]);

  const disconnect = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    }
    
    // The TranslationService will handle cleanup
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      connectionStatus: 'disconnected',
      currentTranscription: '',
      currentTranslation: ''
    }));
  }, [state.isRecording]);

  const startRecording = useCallback(async (fromLanguage: string, toLanguage: string) => {
    if (state.isRecording) {
      console.warn('Already recording');
      return;
    }

    if (!state.isConnected) {
      await connect();
    }

    setState(prev => ({ 
      ...prev, 
      isRecording: true,
      isProcessing: true,
      currentTranscription: '',
      currentTranslation: '',
      error: null
    }));

    try {
      if (!audioProcessorRef.current) {
        audioProcessorRef.current = new AudioProcessor();
      }

      await TranslationService.startVoiceTranslation(
        fromLanguage,
        toLanguage,
        (transcription) => {
          setState(prev => ({ ...prev, currentTranscription: transcription }));
          options.onTranscription?.(transcription);
        },
        (translation) => {
          setState(prev => ({ 
            ...prev, 
            currentTranslation: translation,
            isProcessing: false 
          }));
          options.onTranslation?.(translation);
        }
      );
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ 
        ...prev, 
        isRecording: false,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to start recording'
      }));
      options.onError?.(error as Error);
    }
  }, [state.isRecording, state.isConnected, connect, options]);

  const stopRecording = useCallback(() => {
    if (!state.isRecording) {
      return;
    }

    setState(prev => ({ ...prev, isRecording: false }));
    
    try {
      TranslationService.stopVoiceTranslation();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [state.isRecording]);

  const translateText = useCallback(async (
    text: string,
    fromLanguage: string,
    toLanguage: string,
    context?: string
  ) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const result = await TranslationService.translateText(
        text,
        fromLanguage,
        toLanguage,
        context
      );

      setState(prev => ({ 
        ...prev, 
        currentTranslation: result.translatedText,
        isProcessing: false
      }));

      return result;
    } catch (error) {
      console.error('Translation error:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Translation failed'
      }));
      throw error;
    }
  }, []);

  const clearTranslations = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      currentTranscription: '',
      currentTranslation: '',
      error: null
    }));
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Microphone permission denied. Please allow microphone access to use voice translation.'
      }));
      return false;
    }
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    translateText,
    clearTranslations,
    requestMicrophonePermission,
    
    // Utilities
    isReady: state.isConnected && !state.error,
    canRecord: state.isConnected && !state.isRecording && !state.error
  };
}