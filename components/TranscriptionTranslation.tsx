'use client';

import React, { useState, useRef } from 'react';
import { OpenAIAudioService } from '../services/openAIAudioService';

type TranscriptionMode = 'transcribe' | 'translate' | 'stream';
type ModelType = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';

interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{ word: string; start: number; end: number }>;
}

export const TranscriptionTranslation: React.FC = () => {
  const [mode, setMode] = useState<TranscriptionMode>('transcribe');
  const [model, setModel] = useState<ModelType>('whisper-1');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [streamedText, setStreamedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeTimestamps, setIncludeTimestamps] = useState(false);
  const [prompt, setPrompt] = useState<string>('');
  const [language, setLanguage] = useState<string>('');
  
  const audioServiceRef = useRef<OpenAIAudioService | null>(null);

  // Initialize audio service
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (apiKey) {
      audioServiceRef.current = new OpenAIAudioService(apiKey);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setStreamedText('');
    }
  };

  const processAudio = async () => {
    if (!file || !audioServiceRef.current) {
      setError('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setStreamedText('');

    try {
      if (mode === 'transcribe') {
        // Standard transcription
        const config = {
          model,
          responseFormat: (includeTimestamps && model === 'whisper-1' ? 'verbose_json' : 'json') as 'json' | 'verbose_json',
          temperature: 0,
          prompt: prompt || undefined,
          language: language || undefined,
          timestampGranularities: (includeTimestamps && model === 'whisper-1' ? ['word', 'segment'] : undefined) as ('word' | 'segment')[] | undefined
        };


        const transcriptionResult = await audioServiceRef.current.transcribeAudio(file, config);
        setResult(transcriptionResult);
        
      } else if (mode === 'translate') {
        // Translation to English
        const config = {
          model: 'whisper-1' as const,
          responseFormat: 'json' as const,
          temperature: 0,
          prompt: prompt || undefined
        };

        const translationResult = await audioServiceRef.current.translateAudio(file, config);
        setResult({ text: translationResult.text });
        
      } else if (mode === 'stream') {
        // Streaming transcription
        if (model === 'whisper-1') {
          setError('Streaming is not supported for whisper-1 model');
          return;
        }

        const config = {
          model,
          responseFormat: 'text' as const,
          prompt: prompt || undefined,
          language: language || undefined
        };

        let fullText = '';
        const stream = audioServiceRef.current.streamTranscribeFile(file, config);
        
        for await (const event of stream) {
          if (event.type === 'delta') {
            fullText += event.text;
            setStreamedText(fullText);
          } else if (event.type === 'done') {
            setResult({ text: event.text });
          }
        }
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${minutes}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Speech to Text - Transcription & Translation</h2>
      
      {/* Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
        <div className="flex gap-4">
          <button
            onClick={() => setMode('transcribe')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              mode === 'transcribe' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Transcribe
          </button>
          <button
            onClick={() => setMode('translate')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              mode === 'translate' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Translate to English
          </button>
          <button
            onClick={() => setMode('stream')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              mode === 'stream' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Stream Transcription
          </button>
        </div>
      </div>

      {/* Model Selection */}
      {mode !== 'translate' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="whisper-1">Whisper-1 (Recommended, Supports All Features)</option>
            <option value="gpt-4o-transcribe">GPT-4o Transcribe (New, Limited Features)</option>
            <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe (Fast, Limited Features)</option>
          </select>
        </div>
      )}

      {/* Language Input */}
      {mode === 'transcribe' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language (optional, e.g., en, es, fr, de, zh)
          </label>
          <input
            type="text"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="Auto-detect if empty"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Prompt Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prompt (optional - helps improve accuracy)
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., 'The transcript is about OpenAI and GPT models...'"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
        />
      </div>

      {/* Timestamp Option */}
      {mode === 'transcribe' && model === 'whisper-1' && (
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeTimestamps}
              onChange={(e) => setIncludeTimestamps(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Include word-level timestamps (Whisper-1 only)
            </span>
          </label>
        </div>
      )}

      {/* File Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Audio File (mp3, mp4, mpeg, mpga, m4a, wav, webm - max 25MB)
        </label>
        <input
          type="file"
          accept="audio/*,.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Process Button */}
      <button
        onClick={processAudio}
        disabled={!file || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          !file || isProcessing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isProcessing ? 'Processing...' : `${mode === 'translate' ? 'Translate' : 'Transcribe'} Audio`}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Streaming Result */}
      {mode === 'stream' && streamedText && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Streaming Transcription:</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{streamedText}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              {mode === 'translate' ? 'Translation' : 'Transcription'} Result:
            </h3>
            <p className="text-gray-800 whitespace-pre-wrap">{result.text}</p>
          </div>

          {result.language && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Detected Language:</strong> {result.language}
              </p>
            </div>
          )}

          {result.duration && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Duration:</strong> {result.duration.toFixed(2)} seconds
              </p>
            </div>
          )}

          {result.words && result.words.length > 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="text-md font-semibold text-gray-900 mb-2">Word Timestamps:</h4>
              <div className="max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {result.words.map((word, index) => (
                    <span key={index} className="inline-block mr-2 text-sm">
                      <span className="font-medium">{word.word}</span>
                      <span className="text-gray-500 ml-1">
                        [{formatTimestamp(word.start)} - {formatTimestamp(word.end)}]
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};