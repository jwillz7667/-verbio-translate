import OpenAI from 'openai';
import { TranslationResult } from '../types';

export interface AudioConfig {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
}

export interface TranscriptionConfig {
  model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' | 'whisper-1';
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export class OpenAIAudioService {
  private openai: OpenAI | null = null;
  private apiKey: string;
  private isInitialized = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.initialize();
  }

  private initialize(): void {
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
    }
  }

  /**
   * Use Chat Completions API with audio input and output (gpt-4o-audio-preview)
   */
  async chatWithAudio(
    prompt: string | { text?: string; audioData?: string; audioFormat?: string },
    options: {
      model?: string;
      voice?: AudioConfig['voice'];
      format?: AudioConfig['format'];
      temperature?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<{
    text: string;
    audioData?: string;
    audioFormat?: string;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-audio-preview',
      voice = 'alloy',
      format = 'wav',
      temperature = 0.7,
      systemPrompt
    } = options;

    try {
      const messages: any[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Build user message based on input type
      if (typeof prompt === 'string') {
        messages.push({ role: 'user', content: prompt });
      } else {
        const content: any[] = [];
        
        if (prompt.text) {
          content.push({ type: 'text', text: prompt.text });
        }
        
        if (prompt.audioData) {
          content.push({
            type: 'input_audio',
            input_audio: {
              data: prompt.audioData,
              format: prompt.audioFormat || 'wav'
            }
          });
        }
        
        messages.push({ role: 'user', content });
      }

      const response = await this.openai.chat.completions.create({
        model,
        modalities: ['text', 'audio'],
        audio: { voice, format },
        messages,
        temperature,
        store: true // Store for debugging/analysis
      });

      const choice = response.choices[0];
      const result: any = {
        text: choice.message.content || ''
      };

      if (choice.message.audio) {
        result.audioData = choice.message.audio.data;
        result.audioFormat = format;
      }

      return result;
    } catch (error) {
      console.error('Chat with audio error:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio using the latest models
   */
  async transcribeAudio(
    audioData: Blob | File | ArrayBuffer,
    config: TranscriptionConfig = {}
  ): Promise<{
    text: string;
    language?: string;
    duration?: number;
    segments?: any[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-transcribe',
      language,
      prompt,
      temperature = 0,
      responseFormat = 'verbose_json'
    } = config;

    try {
      // Convert ArrayBuffer to File if needed
      let audioFile: File;
      if (audioData instanceof ArrayBuffer) {
        audioFile = new File([audioData], 'audio.wav', { type: 'audio/wav' });
      } else if (audioData instanceof Blob) {
        audioFile = new File([audioData], 'audio.wav', { type: audioData.type });
      } else {
        audioFile = audioData;
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model,
        language,
        prompt,
        temperature,
        response_format: responseFormat
      });

      if (responseFormat === 'verbose_json' && typeof transcription === 'object') {
        return {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          segments: transcription.segments
        };
      }

      return {
        text: typeof transcription === 'string' ? transcription : transcription.text
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text using latest TTS models
   */
  async textToSpeech(
    text: string,
    config: AudioConfig & { model?: string } = {}
  ): Promise<ArrayBuffer> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-mini-tts',
      voice = 'alloy',
      format = 'mp3',
      speed = 1.0
    } = config;

    try {
      const response = await this.openai.audio.speech.create({
        model,
        voice,
        input: text,
        response_format: format,
        speed
      });

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  /**
   * Translate audio from one language to another using Chat Completions
   */
  async translateAudioToAudio(
    audioData: string,
    fromLanguage: string,
    toLanguage: string,
    options: {
      model?: string;
      voice?: AudioConfig['voice'];
      format?: AudioConfig['format'];
    } = {}
  ): Promise<{
    originalText: string;
    translatedText: string;
    translatedAudio?: string;
    confidence: number;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-audio-preview',
      voice = 'alloy',
      format = 'wav'
    } = options;

    try {
      const systemPrompt = `You are a professional translator. Listen to the audio in ${fromLanguage} and provide a natural translation in ${toLanguage}. 
      First transcribe what you hear, then provide the translation. Maintain the speaker's tone and intent.`;

      const response = await this.chatWithAudio(
        {
          text: `Please transcribe and translate this audio from ${fromLanguage} to ${toLanguage}`,
          audioData,
          audioFormat: format
        },
        {
          model,
          voice,
          format,
          systemPrompt
        }
      );

      // Parse the response to extract transcription and translation
      const textParts = response.text.split('\n').filter(line => line.trim());
      const originalText = textParts[0] || '';
      const translatedText = textParts[1] || textParts[0] || '';

      return {
        originalText,
        translatedText,
        translatedAudio: response.audioData,
        confidence: 0.95
      };
    } catch (error) {
      console.error('Audio translation error:', error);
      throw error;
    }
  }

  /**
   * Stream transcription for real-time processing
   */
  async* streamTranscription(
    audioStream: ReadableStream<Uint8Array>,
    config: TranscriptionConfig = {}
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-transcribe',
      language,
      prompt
    } = config;

    try {
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      
      // Collect audio chunks and transcribe periodically
      let accumulatedSize = 0;
      const chunkSizeThreshold = 32768; // 32KB chunks

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process remaining audio
          if (chunks.length > 0) {
            const audioBlob = new Blob(chunks, { type: 'audio/wav' });
            const result = await this.transcribeAudio(audioBlob, { model, language, prompt });
            yield result.text;
          }
          break;
        }

        chunks.push(value);
        accumulatedSize += value.length;

        // Process accumulated audio when threshold reached
        if (accumulatedSize >= chunkSizeThreshold) {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          const result = await this.transcribeAudio(audioBlob, { model, language, prompt });
          yield result.text;
          
          // Clear processed chunks
          chunks.length = 0;
          accumulatedSize = 0;
        }
      }
    } catch (error) {
      console.error('Stream transcription error:', error);
      throw error;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.openai !== null;
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return {
      chat: ['gpt-4o-audio-preview', 'gpt-4o', 'gpt-4o-mini'],
      transcription: ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe', 'whisper-1'],
      tts: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    };
  }
}