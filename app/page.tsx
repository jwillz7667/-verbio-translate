'use client';

import React, { useState, useEffect } from 'react';
import { ListeningOrb } from '../components/ListeningOrb';
import { LanguageSelector } from '../components/LanguageSelector';
import { AudioControls } from '../components/AudioControls';
import { TipsPopup } from '../components/TipsPopup';
import { TranslationResult } from '../components/TranslationResult';
import { VerbioLogo } from '../components/VerbioLogo';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { SignIn } from '../components/SignIn';
import { SignUp } from '../components/SignUp';
import { AccountSettings } from '../components/AccountSettings';
import { RealtimeAudioCapture } from '../components/RealtimeAudioCapture';
import { RealtimeAudioPlayer } from '../components/RealtimeAudioPlayer';
import { RealtimeAPIService } from '../services/realtimeAPIService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, User as UserIcon, Mic, Camera, Keyboard, HelpCircle, MessageCircle } from 'lucide-react';
import { motion, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import type { User } from '../types';

type Page = 'main' | 'signin' | 'signup' | 'settings';

interface ConversationMessage {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  inputType: 'voice' | 'text';
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

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [isListening, setIsListening] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('English');
  const [toLanguage, setToLanguage] = useState('Spanish');
  const [showTips, setShowTips] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentConversation, setCurrentConversation] = useState<ConversationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [realtimeService, setRealtimeService] = useState<RealtimeAPIService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [responseAudioBuffer, setResponseAudioBuffer] = useState<ArrayBuffer[]>([]);
  const [currentAudioToPlay, setCurrentAudioToPlay] = useState<ArrayBuffer | undefined>();

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  // Create transforms at top level to avoid conditional hook calls
  const orbTransformX = useTransform(x, [-10, 10], [-5, 5]);
  const orbTransformY = useTransform(y, [-10, 10], [-3, 3]);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (currentPage !== 'main') return;
    
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    
    const xPct = (clientX / innerWidth - 0.5) * 2;
    const yPct = (clientY / innerHeight - 0.5) * 2;
    
    x.set(xPct * 8);
    y.set(yPct * 8);
  };

  const handleSignIn = (userData: User) => {
    setUser(userData);
    setCurrentPage('main');
  };

  const handleSignUp = (userData: User) => {
    setUser(userData);
    setCurrentPage('main');
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentPage('signin');
  };

  const handleBackClick = () => {
    if (currentPage === 'settings') {
      setCurrentPage('main');
    } else if (currentPage === 'signin' || currentPage === 'signup') {
      setCurrentPage('main');
    }
  };



  // Initialize Realtime API Service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not configured');
      return;
    }

    const service = new RealtimeAPIService({
      apiKey,
      voice: 'alloy',
      modalities: ['text', 'audio'],
      instructions: `You are a real-time voice translator. 
        When you hear speech in ${fromLanguage}, immediately translate it to ${toLanguage} and respond with the translation.
        Keep translations natural and conversational.
        Respond ONLY with the translation, no explanations or confirmations.
        If you hear ${toLanguage}, translate it to ${fromLanguage}.`,
      inputAudioTranscription: {
        model: 'whisper-1'
      },
      turnDetection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
        create_response: true
      }
    });

    // Set up event listeners
    service.on('connected', () => {
      console.log('Connected to OpenAI Realtime API');
      setConnectionStatus('connected');
    });

    service.on('disconnected', () => {
      console.log('Disconnected from OpenAI Realtime API');
      setConnectionStatus('disconnected');
    });

    service.on('transcription.completed', (transcript) => {
      console.log('Transcription:', transcript);
      setTranscribedText(transcript.transcript);
      
      // Add to conversation
      const message: ConversationMessage = {
        id: Date.now().toString(),
        originalText: transcript.transcript,
        translatedText: '', // Will be filled by translation
        fromLanguage,
        toLanguage,
        inputType: 'voice',
        confidence: transcript.confidence,
        timestamp: new Date(),
        speaker: 'user'
      };

      setCurrentConversation(prev => {
        if (!prev) {
          return {
            id: Date.now().toString(),
            messages: [message],
            isActive: true,
            isProcessing: true,
            startedAt: new Date(),
            lastActivityAt: new Date()
          };
        }
        return {
          ...prev,
          messages: [...prev.messages, message],
          isProcessing: true,
          lastActivityAt: new Date()
        };
      });
    });

    service.on('translation.result', (result) => {
      console.log('Translation result:', result);
      // Update the last message with translation
      setCurrentConversation(prev => {
        if (!prev || prev.messages.length === 0) return prev;
        const messages = [...prev.messages];
        const lastMessage = messages[messages.length - 1];
        lastMessage.translatedText = result.translation.text || '';
        return {
          ...prev,
          messages,
          isProcessing: false,
          lastActivityAt: new Date()
        };
      });
      setIsProcessing(false);
    });

    // Audio response events
    service.on('audio.delta', (data: { audio: ArrayBuffer }) => {
      console.log('Received audio delta');
      setResponseAudioBuffer(prev => [...prev, data.audio]);
    });

    service.on('audio.done', () => {
      console.log('Audio response complete, preparing playback');
      // Combine all audio chunks and play
      setResponseAudioBuffer(prev => {
        if (prev.length > 0) {
          // Combine all audio buffers
          const totalLength = prev.reduce((sum, buf) => sum + buf.byteLength, 0);
          const combined = new ArrayBuffer(totalLength);
          const view = new Uint8Array(combined);
          let offset = 0;
          
          for (const buffer of prev) {
            view.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
          }
          
          setCurrentAudioToPlay(combined);
          return []; // Clear buffer
        }
        return prev;
      });
      setIsProcessing(false);
      setIsListening(false);
    });

    service.on('response.audio_transcript.done', (data) => {
      console.log('Response transcript:', data.transcript);
      // Update conversation with assistant's response
      if (data.transcript) {
        const assistantMessage: ConversationMessage = {
          id: Date.now().toString(),
          originalText: data.transcript,
          translatedText: '',
          fromLanguage: toLanguage,
          toLanguage: fromLanguage,
          inputType: 'voice',
          timestamp: new Date(),
          speaker: 'other' as const
        };
        
        setCurrentConversation(prev => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, assistantMessage],
            lastActivityAt: new Date()
          };
        });
      }
    });

    service.on('response.done', () => {
      console.log('Response complete');
      setIsProcessing(false);
    });

    service.on('error', (error) => {
      console.error('Realtime API error:', error);
      setIsProcessing(false);
    });

    setRealtimeService(service);

    return () => {
      service.disconnect();
    };
  }, [fromLanguage, toLanguage]);

  // Handle recording state changes
  useEffect(() => {
    if (isListening && realtimeService) {
      // Connect and start recording
      setConnectionStatus('connecting');
      setIsRecordingAudio(true);
      setTranscribedText('');
      setIsProcessing(true);
      
      realtimeService.connect()
        .then(() => {
          console.log('Successfully connected for recording');
          // Audio recording will be handled by AudioRecorder component
        })
        .catch((error) => {
          console.error('Failed to connect:', error);
          setIsListening(false);
          setIsRecordingAudio(false);
          setIsProcessing(false);
          setConnectionStatus('disconnected');
        });
    } else if (!isListening && isRecordingAudio && realtimeService) {
      // Stop recording and commit audio buffer
      setIsRecordingAudio(false);
      realtimeService.commitAudioBuffer();
      
      // Explicitly trigger a response if using manual mode
      // Note: With server_vad, this might not be necessary
      setTimeout(() => {
        realtimeService.createResponse();
      }, 100);
      
      // Keep connection alive for response
    }
  }, [isListening, isRecordingAudio, realtimeService]);

  // Reset mouse tracking when page changes
  useEffect(() => {
    if (currentPage !== 'main') {
      x.set(0);
      y.set(0);
    }
  }, [currentPage, x, y]);

  const handleTextTranslation = (text: string) => {
    if (text.trim()) {
      // TODO: Implement real translation using RealtimeAPIService
      console.log('Text translation requested:', text);
    }
  };

  const handleClearConversation = () => {
    setCurrentConversation(null);
    setIsProcessing(false);
  };

  const handleContinueConversation = () => {
    if (currentConversation && !conversationMode) {
      setConversationMode(true);
      setCurrentConversation(prev => prev ? { ...prev, isActive: true } : null);
    }
  };

  const handleRetryLastMessage = () => {
    if (currentConversation && currentConversation.messages.length > 0) {
      const lastMessage = currentConversation.messages[currentConversation.messages.length - 1];
      // Remove last message and retry
      setCurrentConversation(prev => prev ? {
        ...prev,
        messages: prev.messages.slice(0, -1)
      } : null);
      // TODO: Retry translation with RealtimeAPIService
      console.log('Retry translation:', lastMessage.originalText);
    }
  };

  const handleSaveConversation = () => {
    // In a real app, this would save to backend/local storage
    console.log('Conversation saved:', currentConversation);
  };

  const toggleConversationMode = () => {
    setConversationMode(!conversationMode);
    if (!conversationMode && currentConversation) {
      setCurrentConversation(prev => prev ? { ...prev, isActive: true } : null);
    } else if (conversationMode && currentConversation) {
      setCurrentConversation(prev => prev ? { ...prev, isActive: false } : null);
    }
  };

  const renderMainPage = () => (
    <div className="flex flex-col min-h-screen safe-area-padding" onMouseMove={handleMouseMove}>
      {/* Header - Mobile Optimized */}
      <motion.header 
        className="flex items-center justify-between p-4 sm:p-6 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.6,
          type: "spring",
          stiffness: 100,
          damping: 20
        }}
      >
        <motion.div
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </motion.div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Conversation Mode Toggle */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className={`text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10 ${conversationMode ? 'bg-white/20' : ''}`}
              onClick={toggleConversationMode}
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setShowTips(true)}
            >
              <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
              onClick={() => setCurrentPage(user ? 'settings' : 'signin')}
            >
              <UserIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </motion.div>
        </div>
      </motion.header>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-2 sm:py-4 overflow-hidden">
        {/* App Logo - Mobile Responsive */}
        <AnimatePresence>
          {!currentConversation && (
            <motion.div 
              className="text-center mb-8 sm:mb-12 lg:mb-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ 
                duration: 0.8, 
                delay: 0.2,
                type: "spring",
                stiffness: 80
              }}
            >
              <VerbioLogo 
                isListening={isListening || isProcessing}
                className="mb-4 sm:mb-6"
              />
              
              {user && (
                <motion.p
                  className="text-white/70 text-base sm:text-lg mt-3 sm:mt-4 px-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Welcome back, {user.name}
                </motion.p>
              )}

              {conversationMode && (
                <motion.p
                  className="text-purple-300 text-xs sm:text-sm mt-2 bg-white/10 rounded-full px-3 sm:px-4 py-1 backdrop-blur-md inline-block"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 }}
                >
                  Conversation Mode Active
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translation Result / Conversation - Mobile Optimized */}
        <div className="w-full flex-shrink-0">
          <TranslationResult 
            conversationData={currentConversation}
            conversationMode={conversationMode}
            fromLanguage={fromLanguage}
            toLanguage={toLanguage}
            onFromLanguageChange={setFromLanguage}
            onToLanguageChange={setToLanguage}
            onClear={handleClearConversation}
            onContinue={handleContinueConversation}
            onRetry={handleRetryLastMessage}
            onSave={handleSaveConversation}
            onNewTranslation={handleTextTranslation}
          />
        </div>

        {/* 3D Listening Orb - Mobile Responsive */}
        <motion.div 
          className={`flex-shrink-0 ${currentConversation ? 'mb-6 sm:mb-8' : 'mb-8 sm:mb-12 lg:mb-16'}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            scale: currentConversation ? 0.7 : 0.85,
            y: currentConversation ? -10 : 0
          }}
          transition={{ 
            duration: 0.8, 
            delay: 0.4,
            type: "spring",
            stiffness: 60,
            damping: 20
          }}
          style={{ x: orbTransformX, y: orbTransformY }}
        >
          <ListeningOrb isListening={isListening} />
        </motion.div>

        {/* Language Selector - Mobile Responsive */}
        <motion.div 
          className={`w-full max-w-lg ${currentConversation ? 'mb-4 sm:mb-6' : 'mb-6 sm:mb-8 lg:mb-12'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: currentConversation ? 0.95 : 1
          }}
          transition={{ 
            duration: 0.8, 
            delay: 0.6,
            type: "spring",
            stiffness: 100
          }}
          whileHover={{ 
            y: -3,
            transition: { duration: 0.2 }
          }}
        >
          <LanguageSelector
            fromLanguage={fromLanguage}
            toLanguage={toLanguage}
            onFromLanguageChange={(lang) => {
              setFromLanguage(lang);
              if (!conversationMode) {
                handleClearConversation();
              }
            }}
            onToLanguageChange={(lang) => {
              setToLanguage(lang);
              if (!conversationMode) {
                handleClearConversation();
              }
            }}
          />
        </motion.div>

        {/* Audio Controls - Mobile Responsive */}
        <motion.div 
          className={`flex-shrink-0 ${currentConversation ? 'mb-3 sm:mb-4' : 'mb-4 sm:mb-6 lg:mb-8'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: currentConversation ? 0.9 : 1
          }}
          transition={{ 
            duration: 0.8, 
            delay: 0.8,
            type: "spring",
            stiffness: 80
          }}
        >
          <AudioControls 
            isListening={isListening} 
            setIsListening={(listening) => {
              setIsListening(listening);
              if (listening && !conversationMode) {
                handleClearConversation();
              }
            }} 
          />
        </motion.div>
      </div>

      {/* Bottom Input - Mobile Optimized */}
      <motion.div 
        className="p-4 sm:p-6 flex-shrink-0 safe-area-bottom"
        initial={{ opacity: 0, y: 50 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: currentConversation ? 0.98 : 1
        }}
        transition={{ 
          duration: 0.8, 
          delay: 1,
          type: "spring",
          stiffness: 80
        }}
      >
        <motion.div 
          className="relative"
          whileHover={{ scale: 1.005 }}
          whileFocus={{ scale: 1.01 }}
        >
          <Input 
            placeholder={conversationMode ? "Continue the conversation..." : "Type to translate instead..."}
            className="w-full bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/70 rounded-2xl sm:rounded-3xl py-4 sm:py-6 px-4 sm:px-6 pr-28 sm:pr-32 transition-all duration-300 focus:bg-white/25 focus:border-white/50 text-sm sm:text-base"
            disabled={isListening || isProcessing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim() && !isProcessing) {
                handleTextTranslation(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 flex space-x-1 sm:space-x-2">
            {[Mic, Camera, Keyboard].map((Icon, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.2, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 sm:h-8 sm:w-8 text-white/70 hover:text-white disabled:opacity-50"
                  disabled={isListening || isProcessing}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Audio Recording Component */}
      {isRecordingAudio && realtimeService && (
        <RealtimeAudioCapture
          isCapturing={isRecordingAudio}
          onAudioData={(pcm16Buffer) => {
            // PCM16 audio data at 24kHz, ready to send
            realtimeService.sendAudioData(pcm16Buffer);
          }}
          onError={(error) => {
            console.error('Audio recording error:', error);
            setIsListening(false);
            setIsRecordingAudio(false);
            setIsProcessing(false);
          }}
        />
      )}

      {/* Audio Player Component */}
      <RealtimeAudioPlayer
        audioData={currentAudioToPlay}
        onPlaybackComplete={() => {
          console.log('Audio playback complete');
          setCurrentAudioToPlay(undefined);
        }}
      />

      {/* Realtime Transcription Display */}
      {isListening && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {connectionStatus === 'connected' ? '🟢 Connected' : 
               connectionStatus === 'connecting' ? '🟡 Connecting...' : '🔴 Disconnected'}
            </span>
            {isProcessing && <span className="text-sm text-gray-500">Processing...</span>}
          </div>
          {transcribedText && (
            <div className="text-gray-800">
              <p className="text-sm text-gray-500 mb-1">Transcription:</p>
              <p className="text-base">{transcribedText}</p>
            </div>
          )}
        </div>
      )}

      {/* Tips Popup */}
      <TipsPopup isOpen={showTips} onClose={() => setShowTips(false)} />
    </div>
  );

  // Render different pages
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'signin':
        return (
          <SignIn 
            onSignIn={handleSignIn}
            onSwitchToSignUp={() => setCurrentPage('signup')}
            onBack={() => setCurrentPage('main')}
          />
        );
      case 'signup':
        return (
          <SignUp 
            onSignUp={handleSignUp}
            onSwitchToSignIn={() => setCurrentPage('signin')}
            onBack={() => setCurrentPage('main')}
          />
        );
      case 'settings':
        return (
          <AccountSettings 
            user={user}
            onUpdateUser={setUser}
            onSignOut={handleSignOut}
            onBack={() => setCurrentPage('main')}
          />
        );
      default:
        return renderMainPage();
    }
  };

  const getBackgroundVariant = () => {
    if (currentPage === 'main') return 'main';
    if (currentPage === 'settings') return 'settings';
    return 'auth';
  };

  return (
    <AnimatedBackground 
      isListening={isListening || isProcessing} 
      variant={getBackgroundVariant()}
    >
      {renderCurrentPage()}
    </AnimatedBackground>
  );
}