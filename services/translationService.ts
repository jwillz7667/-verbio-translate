import { TranslationResult, OCRResult } from '../types';
import { RealtimeAPIService, RealtimeConfig } from './realtimeAPIService';
import { AudioProcessor } from './audioProcessor';

export class TranslationService {
  private static realtimeService: RealtimeAPIService | null = null;
  private static audioProcessor: AudioProcessor | null = null;
  private static isInitialized = false;
  private static apiKey: string | null = null;

  private static async getApiCredentials() {
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    return { projectId, publicAnonKey };
  }

  static async initialize(apiKey?: string): Promise<void> {
    if (this.isInitialized && this.realtimeService) {
      console.log('Translation service already initialized');
      return;
    }

    try {
      // Use provided API key or get from environment
      this.apiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
      
      if (!this.apiKey) {
        console.warn('OpenAI API key not provided, realtime features will be limited');
        return;
      }

      const config: RealtimeConfig = {
        apiKey: this.apiKey,
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        temperature: 0.7,
        maxResponseOutputTokens: 4096
      };

      this.realtimeService = new RealtimeAPIService(config);
      this.audioProcessor = new AudioProcessor();

      // Set up event listeners
      this.setupRealtimeEventListeners();

      // Connect to the WebSocket
      await this.realtimeService.connect();
      
      this.isInitialized = true;
      console.log('Translation service initialized with OpenAI Realtime API');
    } catch (error) {
      console.error('Failed to initialize translation service:', error);
      // Fall back to standard API if realtime fails
      this.realtimeService = null;
      this.audioProcessor = null;
      this.isInitialized = false;
    }
  }

  private static setupRealtimeEventListeners(): void {
    if (!this.realtimeService) return;

    this.realtimeService.on('transcription.completed', (transcript) => {
      console.log('Transcription completed:', transcript);
      // Emit to UI components through event system
      window.dispatchEvent(new CustomEvent('transcription', { detail: transcript }));
    });

    this.realtimeService.on('translation.result', (result) => {
      console.log('Translation result:', result);
      window.dispatchEvent(new CustomEvent('translation', { detail: result }));
    });

    this.realtimeService.on('audio.delta', (data) => {
      // Play audio chunks as they arrive
      if (this.audioProcessor) {
        this.audioProcessor.playAudio(data.audio);
      }
    });

    this.realtimeService.on('error', (error) => {
      console.error('Realtime API error:', error);
      window.dispatchEvent(new CustomEvent('translation-error', { detail: error }));
    });

    this.realtimeService.on('disconnected', () => {
      console.log('Realtime API disconnected');
      window.dispatchEvent(new CustomEvent('realtime-disconnected'));
    });

    this.realtimeService.on('reconnect.failed', () => {
      console.error('Failed to reconnect to Realtime API');
      window.dispatchEvent(new CustomEvent('realtime-reconnect-failed'));
    });
  }

  static async translateText(
    text: string, 
    fromLang: string, 
    toLang: string, 
    context?: string
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    
    try {
      // Try to use Realtime API first if available
      if (this.realtimeService && this.realtimeService.isReady()) {
        console.log('Using OpenAI Realtime API for translation');
        
        const result = await this.realtimeService.translateText(text, fromLang, toLang, context);
        const processingTime = Date.now() - startTime;
        
        return {
          translatedText: result.translatedText || text,
          confidence: 0.95,
          detectedLanguage: fromLang,
          processingTime
        };
      }

      // Fall back to Supabase API if Realtime API is not available
      console.log('Falling back to Supabase API for translation');
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          fromLanguage: fromLang,
          toLanguage: toLang,
          context: context || `Real-time voice translation from ${fromLang} to ${toLang}`
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Translation API error:', response.status, errorData);
        throw new Error(`Translation failed with status ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      if (!data.translatedText) {
        throw new Error('No translation received from API');
      }

      return {
        translatedText: data.translatedText,
        confidence: data.confidence || 0.9,
        detectedLanguage: data.fromLanguage,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Translation error:', error);
      
      // Return a meaningful error message instead of crashing
      return {
        translatedText: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        confidence: 0,
        processingTime
      };
    }
  }

  static async startVoiceTranslation(
    fromLanguage: string,
    toLanguage: string,
    onTranscription?: (text: string) => void,
    onTranslation?: (text: string) => void
  ): Promise<void> {
    if (!this.audioProcessor) {
      this.audioProcessor = new AudioProcessor();
    }

    if (!this.realtimeService || !this.realtimeService.isReady()) {
      await this.initialize();
    }

    if (!this.realtimeService || !this.realtimeService.isReady()) {
      throw new Error('Realtime API not available');
    }

    // Update session with translation instructions
    this.realtimeService.updateSession({
      instructions: `You are a real-time voice translator. Listen to audio in ${fromLanguage} and translate it to ${toLanguage}. Provide natural, conversational translations that preserve the speaker's intent and tone.`
    });

    // Set up transcription and translation callbacks
    if (onTranscription) {
      this.realtimeService.on('transcription.completed', (transcript) => {
        onTranscription(transcript.transcript);
      });
    }

    if (onTranslation) {
      this.realtimeService.on('response.done', (response) => {
        // Extract translated text from response
        if (response.output && response.output[0]) {
          onTranslation(response.output[0].content[0].text);
        }
      });
    }

    // Start audio recording and streaming
    await this.audioProcessor.startRecording((audioData) => {
      if (this.realtimeService) {
        this.realtimeService.sendAudioData(audioData);
      }
    });
  }

  static async stopVoiceTranslation(): Promise<void> {
    if (this.audioProcessor) {
      this.audioProcessor.stopRecording();
    }

    if (this.realtimeService) {
      this.realtimeService.commitAudioBuffer();
    }
  }

  static async playTranslatedAudio(text: string, language: string): Promise<void> {
    if (!this.realtimeService || !this.realtimeService.isReady()) {
      // Fall back to TTS API if realtime not available
      console.log('Using fallback TTS');
      return;
    }

    // Request audio generation through Realtime API
    const message = {
      type: 'response.create',
      response: {
        modalities: ['audio'],
        instructions: `Speak the following text in ${language} with natural intonation: "${text}"`
      }
    };

    this.realtimeService.sendMessage(message);
  }

  static async detectLanguage(text: string): Promise<string> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/detect-language`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Language detection failed');
      }

      const data = await response.json();
      return data.detectedLanguage || 'Unknown';
      
    } catch (error) {
      console.error('Language detection error:', error);
      return 'Unknown';
    }
  }

  static async translateImage(file: File, toLanguage: string, context?: string): Promise<OCRResult> {
    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('Image file too large (max 20MB)');
      }

      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('toLanguage', toLanguage);
      formData.append('context', context || `Translate any text found in this image to ${toLanguage}. Maintain formatting and structure.`);
      
      console.log('Processing image for OCR and translation...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/ocr-translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API error:', response.status, errorText);
        throw new Error(`OCR failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('OCR result:', data);
      
      return {
        extractedText: data.extractedText || 'Text from image',
        translatedText: data.translatedText || 'No translation available',
        confidence: data.confidence || 0.8,
        detectedLanguage: data.detectedLanguage || 'Detected',
        toLanguage
      };
      
    } catch (error) {
      console.error('Image OCR error:', error);
      throw error;
    }
  }
}