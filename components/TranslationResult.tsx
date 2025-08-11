'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Copy, Volume2, Star, RotateCcw, Languages, Mic, Type, MessageCircle, Plus, Send, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConversationMessage {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  inputType: 'voice' | 'text' | 'image';
  confidence?: number;
  timestamp: Date;
  speaker: 'user' | 'other';
}

interface ConversationData {
  id: string;
  messages: ConversationMessage[];
  isActive: boolean;
  isProcessing?: boolean;
  startedAt: Date;
  lastActivityAt: Date;
}

interface TranslationResultProps {
  conversationData: ConversationData | null;
  conversationMode: boolean;
  fromLanguage: string;
  toLanguage: string;
  onFromLanguageChange: (language: string) => void;
  onToLanguageChange: (language: string) => void;
  onClear: () => void;
  onContinue: () => void;
  onRetry: () => void;
  onSave: () => void;
  onNewTranslation: (text: string) => void;
}

const languageFlags: Record<string, string> = {
  'English': '🇺🇸',
  'Spanish': '🇪🇸',
  'French': '🇫🇷',
  'German': '🇩🇪',
  'Italian': '🇮🇹',
  'Portuguese': '🇵🇹',
  'Russian': '🇷🇺',
  'Japanese': '🇯🇵',
  'Korean': '🇰🇷',
  'Chinese': '🇨🇳',
};


export function TranslationResult({ 
  conversationData, 
  conversationMode,
  fromLanguage,
  toLanguage,
  onFromLanguageChange,
  onToLanguageChange,
  onClear, 
  onContinue,
  onRetry, 
  onSave,
  onNewTranslation
}: TranslationResultProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationData?.messages]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSpeak = (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'Spanish' ? 'es-ES' : 
                      language === 'French' ? 'fr-FR' :
                      language === 'German' ? 'de-DE' :
                      language === 'Japanese' ? 'ja-JP' :
                      language === 'Chinese' ? 'zh-CN' :
                      language === 'Korean' ? 'ko-KR' :
                      language === 'Italian' ? 'it-IT' :
                      language === 'Portuguese' ? 'pt-PT' :
                      language === 'Russian' ? 'ru-RU' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    onSave();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onNewTranslation(newMessage);
      setNewMessage('');
    }
  };

  if (!conversationData) return null;

  const isProcessing = conversationData.isProcessing;
  const messages = conversationData.messages;
  const isSingleMessage = messages.length === 1 && !conversationMode;

  return (
    <div className="relative w-full max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto mb-4 sm:mb-6">
      <AnimatePresence mode="wait">
        {/* Processing State - Mobile Optimized */}
        {isProcessing && (
          <motion.div
            key="processing"
            className="w-full mb-3 sm:mb-4"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ 
              duration: 0.6, 
              type: "spring", 
              stiffness: 120, 
              damping: 20 
            }}
          >
            <Card className="bg-white/20 backdrop-blur-md border-white/30 p-3 sm:p-4 rounded-2xl sm:rounded-3xl">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-1 sm:mb-2">
                <motion.div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-purple-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: 0 
                  }}
                />
                <motion.div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-pink-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: 0.2 
                  }}
                />
                <motion.div
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-400 rounded-full"
                  animate={{ 
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1, 
                    repeat: Infinity, 
                    delay: 0.4 
                  }}
                />
              </div>
              <motion.p 
                className="text-white/80 text-center text-xs sm:text-sm"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {conversationMode ? 'Translating message...' : 'Processing translation...'}
              </motion.p>
            </Card>
          </motion.div>
        )}

        {/* Single Translation Mode - Mobile Optimized */}
        {!isProcessing && isSingleMessage && (
          <motion.div
            key="single-translation"
            className="w-full"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ 
              duration: 0.7, 
              type: "spring", 
              stiffness: 100, 
              damping: 20 
            }}
          >
            <Card className="bg-white/20 backdrop-blur-xl border-white/30 overflow-hidden shadow-2xl rounded-2xl sm:rounded-3xl">
              {/* Header - Mobile Optimized */}
              <motion.div 
                className="flex items-center justify-between p-3 sm:p-4 border-b border-white/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Languages className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-xs sm:text-sm">Translation Complete</p>
                    {messages[0].confidence && (
                      <p className="text-white/60 text-xs hidden sm:block">
                        {Math.round(messages[0].confidence * 100)}% confidence
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onRetry}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <RotateCcw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSave}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <Star className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isSaved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Single Message Content - Mobile Optimized */}
              <div className="p-3 sm:p-4 lg:p-5">
                <SingleMessageView 
                  message={messages[0]} 
                  onCopy={handleCopy} 
                  onSpeak={handleSpeak}
                />

                {/* Action Buttons - Mobile Optimized */}
                <motion.div 
                  className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      onClick={onClear}
                      className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 rounded-full px-4 sm:px-6 text-xs sm:text-sm h-9 sm:h-10"
                    >
                      New Translation
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      onClick={onContinue}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full px-4 sm:px-6 shadow-lg text-xs sm:text-sm h-9 sm:h-10 flex items-center justify-center space-x-2"
                    >
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>Start Conversation</span>
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Conversation Mode - Mobile Optimized */}
        {!isProcessing && conversationMode && messages.length > 0 && (
          <motion.div
            key="conversation"
            className="w-full"
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ 
              duration: 0.7, 
              type: "spring", 
              stiffness: 100, 
              damping: 20 
            }}
          >
            <Card className="bg-white/20 backdrop-blur-xl border-white/30 overflow-hidden shadow-2xl rounded-2xl sm:rounded-3xl">
              {/* Conversation Header - Mobile Optimized */}
              <motion.div 
                className="flex items-center justify-between p-3 sm:p-4 border-b border-white/20"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                    <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-xs sm:text-sm">Active Conversation</p>
                    <p className="text-white/60 text-xs">
                      {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSave}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <Star className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isSaved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClear}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full"
                    >
                      <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5 rotate-45" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Compact Language Selector for Conversation Mode */}
              <motion.div 
                className="px-4 py-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  {/* From Language - Display Only */}
                  <div className="flex items-center space-x-1.5 bg-white/10 rounded-lg px-2 py-1">
                    <span className="text-sm">{languageFlags[fromLanguage]}</span>
                    <span className="text-white text-xs font-medium">{fromLanguage}</span>
                  </div>

                  {/* Swap Button */}
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const tempFromLang = fromLanguage;
                        onFromLanguageChange(toLanguage);
                        onToLanguageChange(tempFromLang);
                      }}
                      className="h-6 w-6 rounded-full bg-white/20 hover:bg-white/30 text-white border-0 flex-shrink-0"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </Button>
                  </motion.div>

                  {/* To Language - Display Only */}
                  <div className="flex items-center space-x-1.5 bg-white/10 rounded-lg px-2 py-1">
                    <span className="text-sm">{languageFlags[toLanguage]}</span>
                    <span className="text-white text-xs font-medium">{toLanguage}</span>
                  </div>
                </div>
              </motion.div>

              {/* Messages Area - Mobile Optimized */}
              <ScrollArea className="h-60 sm:h-80 lg:h-96 p-3 sm:p-4" ref={scrollAreaRef}>
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ConversationMessageView 
                        message={message} 
                        onCopy={handleCopy} 
                        onSpeak={handleSpeak}
                      />
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input Area - Mobile Optimized */}
              <div className="p-3 sm:p-4 border-t border-white/20">
                <div className="flex space-x-2 sm:space-x-3">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Continue the conversation..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-xl sm:rounded-2xl h-9 sm:h-10 text-sm px-3 sm:px-4"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 rounded-xl sm:rounded-2xl px-3 sm:px-4 h-9 sm:h-10"
                    >
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Single Message Component - Mobile Optimized
function SingleMessageView({ 
  message, 
  onCopy, 
  onSpeak 
}: { 
  message: ConversationMessage; 
  onCopy: (text: string) => void; 
  onSpeak: (text: string, lang: string) => void; 
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Original Text */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className={`
              ${message.inputType === 'voice' 
                ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' 
                : 'bg-blue-500/20 text-blue-200 border-blue-500/30'
              } px-2 sm:px-3 py-1 text-xs
            `}
          >
            {message.inputType === 'voice' ? (
              <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            ) : (
              <Type className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            )}
            {languageFlags[message.fromLanguage]} {message.fromLanguage}
          </Badge>
          
          <div className="flex space-x-1 flex-shrink-0">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(message.originalText)}
                className="h-6 w-6 sm:h-7 sm:w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSpeak(message.originalText, message.fromLanguage)}
                className="h-6 w-6 sm:h-7 sm:w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="bg-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/20">
          <p className="text-white text-sm sm:text-base leading-relaxed break-words">
            {message.originalText}
          </p>
        </div>
      </div>

      {/* Arrow Separator */}
      <div className="flex justify-center py-1 sm:py-2">
        <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center shadow-lg">
          <Languages className="h-4 w-4 sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5 text-white" />
        </div>
      </div>

      {/* Translated Text */}
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <Badge 
            variant="secondary" 
            className="bg-green-500/20 text-green-200 border-green-500/30 px-2 sm:px-3 py-1 text-xs"
          >
            <Languages className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
            {languageFlags[message.toLanguage]} {message.toLanguage}
          </Badge>
          
          <div className="flex space-x-1 flex-shrink-0">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(message.translatedText)}
                className="h-6 w-6 sm:h-7 sm:w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSpeak(message.translatedText, message.toLanguage)}
                className="h-6 w-6 sm:h-7 sm:w-7 text-white/60 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white/15 to-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/30 shadow-inner">
          <p className="text-white text-sm sm:text-base leading-relaxed font-medium break-words">
            {message.translatedText}
          </p>
        </div>
      </div>
    </div>
  );
}

// Conversation Message Component - Mobile Optimized
function ConversationMessageView({ 
  message, 
  onCopy, 
  onSpeak 
}: { 
  message: ConversationMessage; 
  onCopy: (text: string) => void; 
  onSpeak: (text: string, lang: string) => void; 
}) {
  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Original Message */}
      <div className="flex items-start space-x-2 sm:space-x-3">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-xs sm:text-sm">{languageFlags[message.fromLanguage]}</span>
          </div>
        </div>
        <div className="flex-1 bg-white/10 rounded-xl sm:rounded-2xl rounded-tl-none p-2 sm:p-3 border border-white/20">
          <p className="text-white text-xs sm:text-sm break-words">{message.originalText}</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <span className="text-white/50 text-xs">{message.fromLanguage}</span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(message.originalText)}
                className="h-5 w-5 sm:h-6 sm:w-6 text-white/50 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSpeak(message.originalText, message.fromLanguage)}
                className="h-5 w-5 sm:h-6 sm:w-6 text-white/50 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Translated Message */}
      <div className="flex items-start space-x-2 sm:space-x-3 flex-row-reverse">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-xs sm:text-sm">{languageFlags[message.toLanguage]}</span>
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-white/15 to-white/10 rounded-xl sm:rounded-2xl rounded-tr-none p-2 sm:p-3 border border-white/30">
          <p className="text-white text-xs sm:text-sm font-medium break-words">{message.translatedText}</p>
          <div className="flex items-center justify-between mt-1 sm:mt-2">
            <span className="text-white/50 text-xs">{message.toLanguage}</span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(message.translatedText)}
                className="h-5 w-5 sm:h-6 sm:w-6 text-white/50 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSpeak(message.translatedText, message.toLanguage)}
                className="h-5 w-5 sm:h-6 sm:w-6 text-white/50 hover:text-white hover:bg-white/20 rounded-full"
              >
                <Volume2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}