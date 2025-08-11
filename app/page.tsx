'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ListeningOrb } from '../components/ListeningOrb';
import { LanguageSelector } from '../components/LanguageSelector';
import { PushToTalkButton } from '../components/PushToTalkButton';
import { TipsPopup } from '../components/TipsPopup';
import { TranslationResult } from '../components/TranslationResult';
import { VerbioLogo } from '../components/VerbioLogo';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { SignIn } from '../components/SignIn';
import { SignUp } from '../components/SignUp';
import { AccountSettings } from '../components/AccountSettings';
import { OpenAIAudioService } from '../services/openAIAudioService';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, User as UserIcon, Mic, Camera, Keyboard, HelpCircle, MessageCircle, Languages } from 'lucide-react';
import Link from 'next/link';
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

const LANGUAGE_CODES: { [key: string]: string } = {
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Chinese': 'zh',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Russian': 'ru',
  'Arabic': 'ar',
  'Hindi': 'hi'
};

const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState<Page>('main');
  const [isListening, setIsListening] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('English');
  const [toLanguage, setToLanguage] = useState('Spanish');
  const [showTips, setShowTips] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentConversation, setCurrentConversation] = useState<ConversationData | null>(null);
  
  // Debug: Log conversation changes
  useEffect(() => {
    console.log('=== Conversation State Changed ===');
    console.log('Current conversation:', currentConversation);
    if (currentConversation) {
      console.log('Messages count:', currentConversation.messages.length);
      console.log('Is active:', currentConversation.isActive);
      console.log('Is processing:', currentConversation.isProcessing);
    }
  }, [currentConversation]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationMode, setConversationMode] = useState(true); // Start in conversation mode by default
  const [transcribedText, setTranscribedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Audio-related refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioServiceRef = useRef<OpenAIAudioService | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Initialize OpenAI Audio Service
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    console.log('=== Initializing OpenAI Audio Service ===');
    console.log('API Key available:', !!apiKey);
    console.log('API Key length:', apiKey?.length);
    
    if (apiKey) {
      audioServiceRef.current = new OpenAIAudioService(apiKey);
      console.log('Audio service created');
      console.log('Audio service ready:', audioServiceRef.current.isReady());
    } else {
      console.error('OpenAI API key not found in environment variables');
      setError('OpenAI API key not configured. Please check your .env.local file.');
    }
  }, []);

  // Cleanup on unmount - stop all media streams
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up media streams');
      
      // Stop any active recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error('Error stopping MediaRecorder on unmount:', e);
        }
      }
      
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log(`Cleaning up ${track.kind} track on unmount`);
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Stop any playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Start audio recording
  const startRecording = async () => {
    console.log('=== startRecording called ===');
    try {
      setError(null);
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      streamRef.current = stream; // Store stream reference
      
      // Try to use the best available format for recording
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      console.log('Using MIME type for recording:', mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Total chunks collected:', audioChunksRef.current.length);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('=== MediaRecorder onstop event fired ===');
        console.log('Final chunks count:', audioChunksRef.current.length);
        // Clean up the recorder reference
        if (mediaRecorderRef.current === mediaRecorder) {
          mediaRecorderRef.current = null;
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        const errorEvent = event as ErrorEvent;
        setError('Recording error: ' + errorEvent.error?.message);
        setIsListening(false);
      };

      // Start recording with timeslice to ensure data is available
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms for immediate availability
      console.log('MediaRecorder started with 100ms timeslice');
      console.log('MediaRecorder state after start:', mediaRecorder.state);
      setIsListening(true);
      setTranscribedText('');
      setError(null);
      
      // Add state change listener for debugging
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder onstart event fired');
        console.log('Recording is now active');
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  // Stop audio recording and immediately process
  const stopRecording = async () => {
    console.log('=== stopRecording called ===');
    console.log('MediaRecorder exists:', !!mediaRecorderRef.current);
    console.log('MediaRecorder state:', mediaRecorderRef.current?.state);
    console.log('Audio chunks collected:', audioChunksRef.current.length);
    
    // Immediately update UI state
    setIsListening(false);
    
    // Stop all audio tracks FIRST to turn off the recording indicator
    if (streamRef.current) {
      console.log('Stopping audio stream tracks...');
      streamRef.current.getTracks().forEach(track => {
        console.log(`Stopping ${track.kind} track, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        track.stop(); // Stop the track completely
      });
      // Clear the stream reference immediately
      streamRef.current = null;
    }
    
    // Then stop the MediaRecorder if it's recording
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
        console.log('Stopping MediaRecorder...');
        try {
          // Request any pending data
          mediaRecorderRef.current.requestData();
          // Stop the recorder
          mediaRecorderRef.current.stop();
          console.log('MediaRecorder.stop() called successfully');
        } catch (error) {
          console.error('Error stopping MediaRecorder:', error);
        }
      } else {
        console.log('MediaRecorder already stopped, state:', mediaRecorderRef.current.state);
      }
      
      // Clear the reference
      mediaRecorderRef.current = null;
    }
    
    // Wait a tiny bit for the last data to be collected
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Process any collected audio
    if (audioChunksRef.current.length > 0) {
      console.log('Processing collected audio chunks...');
      const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log('Total audio size to process:', totalSize, 'bytes');
      
      if (totalSize > 0) {
        // Create a blob with webm format
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created, size:', audioBlob.size, 'bytes');
        
        // Convert blob to File object with proper extension for OpenAI API
        const audioFile = new File([audioBlob], 'recording.webm', { 
          type: 'audio/webm',
          lastModified: Date.now()
        });
        console.log('Audio file created:', audioFile.name, 'size:', audioFile.size);
        
        // Clear chunks
        audioChunksRef.current = [];
        
        // Process the audio
        processTranslation(audioFile);
      } else {
        console.log('Audio chunks exist but have no data');
        setError('Recording was too short. Please try again.');
      }
    } else {
      console.log('No audio data collected');
      setError('No audio was recorded. Please try again.');
    }
  };

  // Process translation pipeline
  const processTranslation = async (audioFile: File | Blob) => {
    console.log('=== processTranslation called ===');
    console.log('Audio file size:', audioFile.size, 'bytes');
    console.log('Audio file type:', audioFile.type);
    console.log('Is File?:', audioFile instanceof File);
    console.log('File name:', audioFile instanceof File ? audioFile.name : 'N/A');
    console.log('Audio service available:', !!audioServiceRef.current);
    console.log('Audio service ready:', audioServiceRef.current?.isReady());
    
    if (!audioServiceRef.current) {
      console.error('Translation service not initialized');
      setError('Translation service not initialized. Please refresh the page.');
      return;
    }

    if (!audioServiceRef.current.isReady()) {
      console.error('Audio service not ready');
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      console.error('API key check:', apiKey ? `Present (length: ${apiKey.length})` : 'Missing');
      setError('Audio service not ready. Please check your OpenAI API key in .env.local');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const fromLangCode = LANGUAGE_CODES[fromLanguage] || 'en';

      // Step 1: Transcribe audio in source language
      console.log(`Transcribing audio in ${fromLanguage} (${fromLangCode})...`);
      const transcription = await audioServiceRef.current.transcribeAudio(audioFile, {
        model: 'whisper-1',
        language: fromLangCode,
        prompt: `Transcribe this ${fromLanguage} audio exactly as spoken, including all words, slang, and colloquialisms. Capture everything accurately.`,
        temperature: 0,
        responseFormat: 'json'
      });

      if (!transcription.text) {
        throw new Error('No transcription received');
      }

      setTranscribedText(transcription.text);
      console.log('Transcription:', transcription.text);

      // Step 2: Translate text using the service method
      console.log(`Translating from ${fromLanguage} to ${toLanguage}...`);
      
      const translatedText = await audioServiceRef.current.translateText(
        transcription.text,
        fromLanguage,
        toLanguage
      );
      console.log('Translation:', translatedText);

      // Step 3: Generate speech in target language
      console.log(`Generating speech in ${toLanguage}...`);
      const voice = TTS_VOICES[Math.floor(Math.random() * TTS_VOICES.length)];
      console.log('Using voice:', voice);
      
      const translatedAudio = await audioServiceRef.current.textToSpeech(translatedText, {
        model: 'tts-1',
        voice,
        format: 'mp3',
        speed: 1.0
      });
      
      console.log('Generated audio size:', translatedAudio.byteLength, 'bytes');
      if (translatedAudio.byteLength === 0) {
        throw new Error('Generated audio is empty');
      }

      // Create conversation message
      const message: ConversationMessage = {
        id: Date.now().toString(),
        originalText: transcription.text,
        translatedText: translatedText,
        fromLanguage,
        toLanguage,
        inputType: 'voice',
        confidence: 0.95,
        timestamp: new Date(),
        speaker: 'user'
      };

      console.log('Created conversation message:', message);

      // Update conversation
      setCurrentConversation(prev => {
        const newConversation = !prev ? {
          id: Date.now().toString(),
          messages: [message],
          isActive: true,
          isProcessing: false,
          startedAt: new Date(),
          lastActivityAt: new Date()
        } : {
          ...prev,
          messages: [...prev.messages, message],
          isProcessing: false,
          lastActivityAt: new Date()
        };
        
        console.log('Updated conversation:', newConversation);
        console.log('Total messages:', newConversation.messages.length);
        return newConversation;
      });

      // Play translated audio
      await playTranslatedAudio(translatedAudio);

      // Auto-swap languages for next translation in conversation mode
      if (conversationMode) {
        console.log('Auto-swapping languages for next translation');
        const tempFromLang = fromLanguage;
        setFromLanguage(toLanguage);
        setToLanguage(tempFromLang);
        console.log(`Languages swapped: ${toLanguage} -> ${tempFromLang}`);
      }

    } catch (err) {
      console.error('Translation error:', err);
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play translated audio
  const playTranslatedAudio = async (audioData: ArrayBuffer) => {
    console.log('=== Playing translated audio ===');
    console.log('Audio data size:', audioData.byteLength, 'bytes');
    
    try {
      setIsPlayingAudio(true);
      
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Audio URL created:', audioUrl);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      // Add more event listeners for debugging
      audio.onloadeddata = () => {
        console.log('Audio loaded, duration:', audio.duration);
      };
      
      audio.onplay = () => {
        console.log('Audio started playing');
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setError('Audio playback failed');
      };
      
      audio.onended = () => {
        console.log('Audio playback ended');
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
      console.log('Audio play() called successfully');
      
      // Set volume to ensure it's audible
      audio.volume = 1.0;
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play translated audio');
      setIsPlayingAudio(false);
    }
  };

  // Handle text translation
  const handleTextTranslation = async (text: string) => {
    if (!text.trim() || !audioServiceRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Translate text
      const translationResponse = await audioServiceRef.current.chatWithAudio(
        `Translate the following text from ${fromLanguage} to ${toLanguage}. 
         Provide ONLY the translation: "${text}"`,
        {
          model: 'gpt-4o',
          temperature: 0.3
        }
      );

      const translatedText = translationResponse.text.trim();

      // Generate speech
      const voice = TTS_VOICES[Math.floor(Math.random() * TTS_VOICES.length)];
      const translatedAudio = await audioServiceRef.current.textToSpeech(translatedText, {
        model: 'tts-1',
        voice,
        format: 'mp3',
        speed: 1.0
      });

      // Create message
      const message: ConversationMessage = {
        id: Date.now().toString(),
        originalText: text,
        translatedText: translatedText,
        fromLanguage,
        toLanguage,
        inputType: 'text',
        timestamp: new Date(),
        speaker: 'user'
      };

      // Update conversation
      setCurrentConversation(prev => {
        if (!prev) {
          return {
            id: Date.now().toString(),
            messages: [message],
            isActive: true,
            isProcessing: false,
            startedAt: new Date(),
            lastActivityAt: new Date()
          };
        }
        return {
          ...prev,
          messages: [...prev.messages, message],
          isProcessing: false,
          lastActivityAt: new Date()
        };
      });

      // Play audio
      await playTranslatedAudio(translatedAudio);

    } catch (err) {
      console.error('Text translation error:', err);
      setError(err instanceof Error ? err.message : 'Text translation failed');
    } finally {
      setIsProcessing(false);
    }
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

  const handleClearConversation = () => {
    setCurrentConversation(null);
    setIsProcessing(false);
    setTranscribedText('');
    setError(null);
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
      
      // Retry translation
      if (lastMessage.inputType === 'text') {
        handleTextTranslation(lastMessage.originalText);
      }
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


  // Reset mouse tracking when page changes
  useEffect(() => {
    if (currentPage !== 'main') {
      x.set(0);
      y.set(0);
    }
  }, [currentPage, x, y]);

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
          {/* Conversation Translation Page Link */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link href="/conversation">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
                title="Conversational Translation"
              >
                <Languages className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </Link>
          </motion.div>

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
        <div className="w-full flex-shrink-0 mb-4">
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
          <ListeningOrb isListening={isListening || isProcessing} />
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

        {/* Push-to-Talk Audio Controls - Mobile Responsive */}
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
          <PushToTalkButton
            onStartRecording={() => {
              console.log('Push-to-talk: Starting recording');
              audioChunksRef.current = [];
              startRecording();
            }}
            onStopRecording={() => {
              console.log('Push-to-talk: Stopping and sending');
              stopRecording();
            }}
            isProcessing={isProcessing}
          />
        </motion.div>

        {/* Status Display */}
        {(isProcessing || transcribedText || error) && (
          <motion.div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 max-w-md w-full mx-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {error && (
              <div className="text-red-600 mb-2">
                <p className="text-sm font-medium">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing translation...</span>
                <span className="text-sm text-gray-500 animate-pulse">⏳</span>
              </div>
            )}
            {transcribedText && !isProcessing && (
              <div className="text-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700">
                    {fromLanguage} → {toLanguage}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-1">Transcription:</p>
                <p className="text-base">{transcribedText}</p>
              </div>
            )}
            {isPlayingAudio && (
              <div className="text-green-600 mt-2">
                <p className="text-sm">🔊 Playing {toLanguage} translation...</p>
              </div>
            )}
          </motion.div>
        )}
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