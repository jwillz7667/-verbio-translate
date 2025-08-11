'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OpenAIAudioService } from '../services/openAIAudioService';

interface ConversationEntry {
  id: string;
  speaker: 'user1' | 'user2';
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  translatedLanguage: string;
  originalAudio?: Blob;
  translatedAudio?: ArrayBuffer;
  timestamp: Date;
}

interface LanguagePair {
  user1Lang: string;
  user2Lang: string;
  user1Voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  user2Voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

const LANGUAGE_PAIRS: { [key: string]: LanguagePair } = {
  'en-es': { user1Lang: 'en', user2Lang: 'es', user1Voice: 'nova', user2Voice: 'shimmer' },
  'en-fr': { user1Lang: 'en', user2Lang: 'fr', user1Voice: 'nova', user2Voice: 'fable' },
  'en-de': { user1Lang: 'en', user2Lang: 'de', user1Voice: 'nova', user2Voice: 'echo' },
  'en-it': { user1Lang: 'en', user2Lang: 'it', user1Voice: 'nova', user2Voice: 'alloy' },
  'en-pt': { user1Lang: 'en', user2Lang: 'pt', user1Voice: 'nova', user2Voice: 'onyx' },
  'en-zh': { user1Lang: 'en', user2Lang: 'zh', user1Voice: 'nova', user2Voice: 'shimmer' },
  'en-ja': { user1Lang: 'en', user2Lang: 'ja', user1Voice: 'nova', user2Voice: 'echo' },
  'en-ko': { user1Lang: 'en', user2Lang: 'ko', user1Voice: 'nova', user2Voice: 'fable' },
};

export const ConversationalTranslation: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<string>('en-es');
  const [currentSpeaker, setCurrentSpeaker] = useState<'user1' | 'user2'>('user1');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioServiceRef = useRef<OpenAIAudioService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null) as React.MutableRefObject<AudioContext | null>;
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize services
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      audioServiceRef.current = new OpenAIAudioService(apiKey);
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudioConversation(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioConversation = async (audioBlob: Blob) => {
    if (!audioServiceRef.current) {
      setError('Audio service not initialized');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const langPair = LANGUAGE_PAIRS[selectedPair];
      const sourceLanguage = currentSpeaker === 'user1' ? langPair.user1Lang : langPair.user2Lang;
      const targetLanguage = currentSpeaker === 'user1' ? langPair.user2Lang : langPair.user1Lang;
      const targetVoice = currentSpeaker === 'user1' ? langPair.user2Voice : langPair.user1Voice;

      // Step 1: Transcribe the audio in the source language
      console.log(`Transcribing audio in ${sourceLanguage}...`);
      const transcription = await audioServiceRef.current.transcribeAudio(audioBlob, {
        model: 'whisper-1', // Use whisper-1 for better compatibility
        language: sourceLanguage,
        prompt: `Transcribe this ${sourceLanguage} audio accurately.`,
        temperature: 0,
        responseFormat: 'json'
      });

      if (!transcription.text) {
        throw new Error('No transcription received');
      }

      console.log('Transcription:', transcription.text);

      // Step 2: Translate the text using Chat Completions
      console.log(`Translating from ${sourceLanguage} to ${targetLanguage}...`);
      const translationResponse = await audioServiceRef.current.chatWithAudio(
        `Translate the following text from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguage)}. 
         Only provide the translation, nothing else: "${transcription.text}"`,
        {
          model: 'gpt-4o',
          temperature: 0.3
        }
      );

      const translatedText = translationResponse.text.trim();
      console.log('Translation:', translatedText);

      // Step 3: Generate speech in the target language
      console.log(`Generating speech in ${targetLanguage}...`);
      const translatedAudio = await audioServiceRef.current.textToSpeech(translatedText, {
        model: 'tts-1',
        voice: targetVoice,
        format: 'mp3',
        speed: 1.0
      });

      // Add to conversation history
      const entry: ConversationEntry = {
        id: Date.now().toString(),
        speaker: currentSpeaker,
        originalText: transcription.text,
        translatedText: translatedText,
        originalLanguage: sourceLanguage,
        translatedLanguage: targetLanguage,
        originalAudio: audioBlob,
        translatedAudio: translatedAudio,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, entry]);

      // Auto-play the translated audio
      await playTranslatedAudio(translatedAudio);

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  };

  const playTranslatedAudio = async (audioData: ArrayBuffer) => {
    try {
      setIsPlaying(true);
      
      // Convert ArrayBuffer to Blob and create URL
      const audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play translated audio');
      setIsPlaying(false);
    }
  };

  const playAudio = async (audioData: ArrayBuffer | Blob | undefined) => {
    if (!audioData) return;

    try {
      setIsPlaying(true);
      
      let audioBlob: Blob;
      if (audioData instanceof ArrayBuffer) {
        audioBlob = new Blob([audioData], { type: 'audio/mp3' });
      } else {
        audioBlob = audioData;
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Error playing audio:', err);
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };
    return languages[code] || code;
  };

  const switchSpeaker = () => {
    setCurrentSpeaker(prev => prev === 'user1' ? 'user2' : 'user1');
  };

  const clearConversation = () => {
    setConversation([]);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Conversational Translation</h2>
      
      {/* Language Pair Selection */}
      <div className="mb-6 flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700">Language Pair:</label>
        <select
          value={selectedPair}
          onChange={(e) => setSelectedPair(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="en-es">English ↔ Spanish</option>
          <option value="en-fr">English ↔ French</option>
          <option value="en-de">English ↔ German</option>
          <option value="en-it">English ↔ Italian</option>
          <option value="en-pt">English ↔ Portuguese</option>
          <option value="en-zh">English ↔ Chinese</option>
          <option value="en-ja">English ↔ Japanese</option>
          <option value="en-ko">English ↔ Korean</option>
        </select>
        
        <button
          onClick={clearConversation}
          className="ml-auto px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Clear Conversation
        </button>
      </div>

      {/* Current Speaker Indicator */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Speaker:</p>
            <p className="text-lg font-semibold text-blue-900">
              {currentSpeaker === 'user1' ? 'User 1' : 'User 2'} 
              ({getLanguageName(LANGUAGE_PAIRS[selectedPair][currentSpeaker === 'user1' ? 'user1Lang' : 'user2Lang'])})
            </p>
          </div>
          <button
            onClick={switchSpeaker}
            disabled={isRecording || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Switch Speaker
          </button>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || isPlaying}
          className={`px-8 py-4 rounded-full font-medium text-white transition-all transform hover:scale-105 ${
            isRecording 
              ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
              : 'bg-green-600 hover:bg-green-700'
          } ${(isProcessing || isPlaying) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
        </button>
      </div>

      {/* Status Indicators */}
      {(isProcessing || isPlaying) && (
        <div className="mb-6 text-center">
          {isProcessing && (
            <p className="text-blue-600 animate-pulse">Processing translation...</p>
          )}
          {isPlaying && (
            <p className="text-green-600">Playing translated audio...</p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Conversation History */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Conversation History</h3>
        {conversation.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No conversation yet. Start recording to begin.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversation.map((entry) => (
              <div
                key={entry.id}
                className={`p-4 rounded-lg ${
                  entry.speaker === 'user1' 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm">
                    {entry.speaker === 'user1' ? 'User 1' : 'User 2'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      Original ({getLanguageName(entry.originalLanguage)}):
                    </p>
                    <p className="text-gray-800">{entry.originalText}</p>
                    {entry.originalAudio && (
                      <button
                        onClick={() => playAudio(entry.originalAudio)}
                        disabled={isPlaying}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        ▶ Play Original
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-600 mb-1">
                      Translation ({getLanguageName(entry.translatedLanguage)}):
                    </p>
                    <p className="text-gray-800">{entry.translatedText}</p>
                    {entry.translatedAudio && (
                      <button
                        onClick={() => playAudio(entry.translatedAudio)}
                        disabled={isPlaying}
                        className="mt-2 text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                      >
                        ▶ Play Translation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">How to use:</h4>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Select your language pair</li>
          <li>Choose which user is speaking (User 1 or User 2)</li>
          <li>Click &quot;Start Recording&quot; and speak in your language</li>
          <li>Click &quot;Stop Recording&quot; when done</li>
          <li>The app will transcribe, translate, and play the translation</li>
          <li>Switch speakers for the other person to respond</li>
        </ol>
      </div>
    </div>
  );
};