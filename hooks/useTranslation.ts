import { useCallback } from 'react';
import { TranslationService } from '../services/translationService';
import { AudioService } from '../services/audioService';
import { ConversationMessage, ConversationData, User } from '../types';
import { useAnalytics } from './useAnalytics';

interface UseTranslationProps {
  fromLanguage: string;
  toLanguage: string;
  conversationMode: boolean;
  currentConversation: ConversationData | null;
  setCurrentConversation: (conversation: ConversationData | null | ((prev: ConversationData | null) => ConversationData | null)) => void;
  setIsProcessing: (processing: boolean) => void;
  user: User | null;
  lastProcessedRef: React.MutableRefObject<string>;
}

export function useTranslation({
  fromLanguage,
  toLanguage,
  conversationMode,
  currentConversation,
  setCurrentConversation,
  setIsProcessing,
  user,
  lastProcessedRef
}: UseTranslationProps) {
  const { trackAnalytics } = useAnalytics(user?.id);

  const translateText = useCallback(async (text: string, fromLang: string, toLang: string, context?: string) => {
    const result = await TranslationService.translateText(text, fromLang, toLang, context);
    
    if (result.confidence > 0) {
      trackAnalytics('translation_success', {
        fromLanguage: fromLang,
        toLanguage: toLang,
        textLength: text.length,
        processingTime: result.processingTime,
        confidence: result.confidence
      });
    } else {
      trackAnalytics('translation_error', {
        fromLanguage: fromLang,
        toLanguage: toLang,
        textLength: text.length,
        processingTime: result.processingTime
      });
    }
    
    return result;
  }, [trackAnalytics]);

  const playTranslatedText = useCallback(async (text: string, language: string) => {
    try {
      await AudioService.playTranslatedText(
        text,
        language,
        user?.settings?.voiceSettings?.voice,
        user?.settings?.voiceSettings?.speed
      );
      
      trackAnalytics('tts_success', {
        language,
        textLength: text.length,
        voice: user?.settings?.voiceSettings?.voice || 'default',
        speed: user?.settings?.voiceSettings?.speed || 0.9
      });
    } catch (error) {
      trackAnalytics('tts_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        language,
        textLength: text.length
      });
      throw error;
    }
  }, [user?.settings?.voiceSettings, trackAnalytics]);

  const performTranslation = useCallback(async (
    inputText: string, 
    inputType: 'voice' | 'text' | 'image', 
    speaker: 'user' | 'other' = 'user'
  ) => {
    if (!inputText.trim()) return;

    // Prevent duplicate processing
    if (inputText.trim() === lastProcessedRef.current) {
      console.log('Skipping duplicate translation request');
      return;
    }

    setIsProcessing(true);
    lastProcessedRef.current = inputText.trim();
    
    if (conversationMode && currentConversation) {
      setCurrentConversation(prev => prev ? {
        ...prev,
        isProcessing: true,
        lastActivityAt: new Date()
      } : null);
    }

    try {
      console.log(`Starting translation: "${inputText}" from ${fromLanguage} to ${toLanguage}`);
      
      // Perform enhanced translation
      const translationResult = await translateText(
        inputText,
        fromLanguage,
        toLanguage,
        conversationMode ? 'Conversation context' : undefined
      );
      
      const newMessage: ConversationMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalText: inputText,
        translatedText: translationResult.translatedText,
        fromLanguage: translationResult.detectedLanguage || fromLanguage,
        toLanguage,
        inputType,
        confidence: translationResult.confidence,
        timestamp: new Date(),
        speaker,
        processingTime: translationResult.processingTime
      };

      // Update conversation data
      if (conversationMode) {
        if (currentConversation) {
          setCurrentConversation(prev => {
            if (!prev) return null;
            const updatedMessages = [...prev.messages, newMessage];
            const avgConfidence = updatedMessages.reduce((sum, msg) => sum + msg.confidence, 0) / updatedMessages.length;
            
            return {
              ...prev,
              messages: updatedMessages,
              isProcessing: false,
              lastActivityAt: new Date(),
              totalMessages: updatedMessages.length,
              avgConfidence: Math.round(avgConfidence * 100) / 100
            };
          });
        } else {
          const newConversation: ConversationData = {
            id: `conv_${Date.now()}`,
            title: inputText.slice(0, 50) + (inputText.length > 50 ? '...' : ''),
            messages: [newMessage],
            isActive: true,
            isProcessing: false,
            startedAt: new Date(),
            lastActivityAt: new Date(),
            totalMessages: 1,
            avgConfidence: newMessage.confidence
          };
          setCurrentConversation(newConversation);
        }
      } else {
        const singleConversation: ConversationData = {
          id: `single_${Date.now()}`,
          title: inputText.slice(0, 50) + (inputText.length > 50 ? '...' : ''),
          messages: [newMessage],
          isActive: false,
          isProcessing: false,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          totalMessages: 1,
          avgConfidence: newMessage.confidence
        };
        setCurrentConversation(singleConversation);
      }

      // Auto-play translation with user preferences
      if (translationResult.confidence > 0.1) { // Only play if translation succeeded
        try {
          await playTranslatedText(translationResult.translatedText, toLanguage);
        } catch (ttsError) {
          console.error('TTS error (non-blocking):', ttsError);
        }
      }

    } catch (error) {
      console.error('Translation failed:', error);
      
      const errorMessage: ConversationMessage = {
        id: `error_${Date.now()}`,
        originalText: inputText,
        translatedText: error instanceof Error ? error.message : 'Translation failed. Please check your connection and try again.',
        fromLanguage,
        toLanguage,
        inputType,
        confidence: 0,
        timestamp: new Date(),
        speaker,
        processingTime: 0
      };

      if (conversationMode && currentConversation) {
        setCurrentConversation(prev => prev ? {
          ...prev,
          messages: [...prev.messages, errorMessage],
          isProcessing: false,
          lastActivityAt: new Date(),
          totalMessages: prev.totalMessages + 1
        } : null);
      } else {
        const errorConversation: ConversationData = {
          id: `error_${Date.now()}`,
          title: 'Translation Error',
          messages: [errorMessage],
          isActive: false,
          isProcessing: false,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          totalMessages: 1,
          avgConfidence: 0
        };
        setCurrentConversation(errorConversation);
      }
    }

    setIsProcessing(false);
  }, [fromLanguage, toLanguage, conversationMode, currentConversation, user, translateText, playTranslatedText, setCurrentConversation, setIsProcessing, lastProcessedRef]);

  return {
    translateText,
    playTranslatedText,
    performTranslation
  };
}