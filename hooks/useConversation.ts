import { useCallback } from 'react';
import { ConversationData } from '../types';
import { useAnalytics } from './useAnalytics';

interface UseConversationProps {
  currentConversation: ConversationData | null;
  setCurrentConversation: (conversation: ConversationData | null | ((prev: ConversationData | null) => ConversationData | null)) => void;
  conversationMode: boolean;
  setConversationMode: (mode: boolean) => void;
  performTranslation: (text: string, inputType: 'voice' | 'text' | 'image', speaker?: 'user' | 'other') => Promise<void>;
  setIsProcessing: (processing: boolean) => void;
  lastProcessedRef: React.MutableRefObject<string>;
  userId?: string;
}

export function useConversation({
  currentConversation,
  setCurrentConversation,
  conversationMode,
  setConversationMode,
  performTranslation,
  setIsProcessing,
  lastProcessedRef,
  userId
}: UseConversationProps) {
  const { trackAnalytics, saveConversation } = useAnalytics(userId);

  const handleClearConversation = useCallback(() => {
    setCurrentConversation(null);
    setIsProcessing(false);
    lastProcessedRef.current = '';
    trackAnalytics('conversation_cleared');
  }, [setCurrentConversation, setIsProcessing, lastProcessedRef, trackAnalytics]);

  const handleContinueConversation = useCallback(() => {
    if (currentConversation && !conversationMode) {
      setConversationMode(true);
      setCurrentConversation(prev => prev ? { ...prev, isActive: true } : null);
      trackAnalytics('conversation_continued', { 
        conversationId: currentConversation.id,
        messageCount: currentConversation.totalMessages 
      });
    }
  }, [currentConversation, conversationMode, setConversationMode, setCurrentConversation, trackAnalytics]);

  const handleRetryLastMessage = useCallback(() => {
    if (currentConversation && currentConversation.messages.length > 0) {
      const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
      
      // Remove last message
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.slice(0, -1),
        totalMessages: prev.totalMessages - 1
      } : null);
      
      // Retry translation
      performTranslation(lastMessage.originalText, lastMessage.inputType, lastMessage.speaker);
      
      trackAnalytics('message_retried', {
        messageType: lastMessage.inputType,
        originalConfidence: lastMessage.confidence
      });
    }
  }, [currentConversation, performTranslation, setCurrentConversation, trackAnalytics]);

  const handleSaveConversation = useCallback(async () => {
    if (!currentConversation) return;
    
    try {
      await saveConversation(currentConversation);
      
      trackAnalytics('conversation_saved', {
        conversationId: currentConversation.id,
        messageCount: currentConversation.totalMessages,
        avgConfidence: currentConversation.avgConfidence
      });
      
    } catch (error) {
      console.error('Failed to save conversation:', error);
      
      trackAnalytics('save_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error('Failed to save conversation. Please try again.');
    }
  }, [currentConversation, saveConversation, trackAnalytics]);

  const toggleConversationMode = useCallback(() => {
    const newMode = !conversationMode;
    setConversationMode(newMode);
    
    if (newMode && currentConversation) {
      setCurrentConversation(prev => prev ? { ...prev, isActive: true } : null);
    } else if (!newMode && currentConversation) {
      setCurrentConversation(prev => prev ? { ...prev, isActive: false } : null);
    }
    
    trackAnalytics('conversation_mode_toggled', { 
      enabled: newMode,
      hasActiveConversation: !!currentConversation 
    });
  }, [conversationMode, currentConversation, setConversationMode, setCurrentConversation, trackAnalytics]);

  return {
    handleClearConversation,
    handleContinueConversation,
    handleRetryLastMessage,
    handleSaveConversation,
    toggleConversationMode
  };
}