import { useCallback, useRef } from 'react';
import { AudioService } from '../services/audioService';
import { useAnalytics } from './useAnalytics';

interface UseSpeechProps {
  fromLanguage: string;
  conversationMode: boolean;
  isListening: boolean;
  performTranslation: (text: string, inputType: 'voice' | 'text' | 'image') => Promise<void>;
  setSpeechRecognitionText: (text: string) => void;
  setSpeechError: (error: string | null) => void;
  setIsListening: (listening: boolean) => void;
  setIsVoiceInput: (voiceInput: boolean) => void;
  setIsRecordingAudio: (recording: boolean) => void;
  setShowMicrophoneGuide: (show: boolean) => void;
  userId?: string;
}

export function useSpeech({
  fromLanguage,
  conversationMode,
  isListening,
  performTranslation,
  setSpeechRecognitionText,
  setSpeechError,
  setIsListening,
  setIsVoiceInput,
  setIsRecordingAudio,
  setShowMicrophoneGuide,
  userId
}: UseSpeechProps) {
  const { trackAnalytics } = useAnalytics(userId);
  const currentTranscriptRef = useRef<string>('');

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    console.log('Speech result:', text, 'Final:', isFinal, 'Confidence: high');
    setSpeechRecognitionText(text);
    currentTranscriptRef.current = text;
    
    if (isFinal && text.trim() && text.length > 2) {
      console.log('Processing final speech result:', text);
      performTranslation(text.trim(), 'voice');
      setSpeechRecognitionText('');
      currentTranscriptRef.current = '';
    }
  }, [performTranslation, setSpeechRecognitionText]);

  const handleSpeechError = useCallback((error: string) => {
    console.error('Speech recognition error received:', error);
    
    // Ensure we have a valid error message
    const errorMessage = typeof error === 'string' && error.trim() 
      ? error 
      : 'Speech recognition error occurred. Please try again.';
    
    setSpeechError(errorMessage);
    setSpeechRecognitionText('');
    currentTranscriptRef.current = '';
    
    // Stop listening if there's an error
    setIsListening(false);
    setIsVoiceInput(false);
    setIsRecordingAudio(false);
    
    trackAnalytics('speech_error', { 
      error: errorMessage,
      isListening,
      language: fromLanguage 
    });
    
    // Show microphone guide for permission-related errors
    if (errorMessage.toLowerCase().includes('permission') || 
        errorMessage.toLowerCase().includes('not-allowed') || 
        errorMessage.toLowerCase().includes('microphone') ||
        errorMessage.toLowerCase().includes('denied') ||
        errorMessage.toLowerCase().includes('access')) {
      console.log('Permission-related error detected, showing microphone guide');
      setShowMicrophoneGuide(true);
    }
    
    // Auto-clear error after a delay
    const clearTimeout = errorMessage.toLowerCase().includes('permission') ? 15000 : 8000;
    setTimeout(() => {
      setSpeechError(null);
    }, clearTimeout);
  }, [isListening, fromLanguage, trackAnalytics, setSpeechError, setSpeechRecognitionText, setIsListening, setIsVoiceInput, setIsRecordingAudio, setShowMicrophoneGuide]);

  const handleSpeechStart = useCallback(() => {
    console.log('Speech recognition started successfully');
    setSpeechError(null);
    setSpeechRecognitionText('');
    currentTranscriptRef.current = '';
    
    trackAnalytics('speech_start', { 
      language: fromLanguage,
      conversationMode 
    });
  }, [fromLanguage, conversationMode, trackAnalytics, setSpeechError, setSpeechRecognitionText]);

  const handleSpeechEnd = useCallback(() => {
    console.log('Speech recognition ended');
    
    if (currentTranscriptRef.current.trim() && currentTranscriptRef.current.length > 2) {
      console.log('Processing final transcript on speech end:', currentTranscriptRef.current);
      performTranslation(currentTranscriptRef.current.trim(), 'voice');
    }
    
    setSpeechRecognitionText('');
    currentTranscriptRef.current = '';
    
    trackAnalytics('speech_end', { 
      hadTranscript: !!currentTranscriptRef.current.trim() 
    });
  }, [performTranslation, trackAnalytics, setSpeechRecognitionText]);

  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    console.log('Processing audio blob:', audioBlob.size, 'bytes', audioBlob.type);
    
    if (audioBlob.size < 1000) {
      handleSpeechError('Recording too short. Please try speaking longer.');
      return;
    }

    try {
      const result = await AudioService.transcribeAudio({
        audioBlob,
        language: fromLanguage,
        prompt: `Voice translation request in ${fromLanguage}. Please transcribe accurately.`
      });
      
      trackAnalytics('transcription_success', {
        language: fromLanguage,
        confidence: result.confidence,
        duration: result.duration || 0,
        textLength: result.text.length
      });

      performTranslation(result.text, 'voice');
      
    } catch (error) {
      console.error('Audio transcription error:', error);
      trackAnalytics('transcription_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      handleSpeechError('Failed to transcribe audio. Please check your connection and try again.');
    }
  }, [fromLanguage, handleSpeechError, performTranslation, trackAnalytics]);

  const handleAudioError = useCallback((error: string) => {
    console.error('Audio recording error received:', error);
    
    // Ensure we have a valid error message
    const errorMessage = typeof error === 'string' && error.trim() 
      ? error 
      : 'Audio recording error occurred. Please try again.';
    
    setSpeechError(errorMessage);
    setIsRecordingAudio(false);
    setIsVoiceInput(false);
    setIsListening(false);
    
    trackAnalytics('audio_recording_error', { error: errorMessage });
    
    // Show microphone guide for permission-related errors
    if (errorMessage.toLowerCase().includes('permission') || 
        errorMessage.toLowerCase().includes('not-allowed') || 
        errorMessage.toLowerCase().includes('microphone') ||
        errorMessage.toLowerCase().includes('denied') ||
        errorMessage.toLowerCase().includes('access')) {
      console.log('Audio permission-related error detected, showing microphone guide');
      setShowMicrophoneGuide(true);
    }
    
    // Auto-clear error after a delay
    const clearTimeout = errorMessage.toLowerCase().includes('permission') ? 15000 : 8000;
    setTimeout(() => {
      setSpeechError(null);
    }, clearTimeout);
  }, [trackAnalytics, setSpeechError, setIsRecordingAudio, setIsVoiceInput, setIsListening, setShowMicrophoneGuide]);

  return {
    handleSpeechResult,
    handleSpeechError,
    handleSpeechStart,
    handleSpeechEnd,
    handleAudioData,
    handleAudioError,
    currentTranscriptRef
  };
}