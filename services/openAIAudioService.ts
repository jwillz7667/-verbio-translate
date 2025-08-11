import OpenAI from 'openai';

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
  timestampGranularities?: ('word' | 'segment')[];
  stream?: boolean;
}

export interface TranslationConfig {
  model?: 'whisper-1';
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
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
      console.error('OpenAI API key not provided');
      return;
    }

    if (!this.apiKey.startsWith('sk-')) {
      console.error('Invalid OpenAI API key format. Key should start with "sk-"');
      return;
    }

    try {
      console.log('Initializing OpenAI client...');
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
      this.isInitialized = true;
      console.log('OpenAI client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error);
      this.isInitialized = false;
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
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Build user message based on input type
      if (typeof prompt === 'string') {
        messages.push({ role: 'user', content: prompt });
      } else {
        const content = [] as OpenAI.Chat.ChatCompletionContentPart[];
        
        if (prompt.text) {
          content.push({ type: 'text', text: prompt.text } as OpenAI.Chat.ChatCompletionContentPartText);
        }
        
        if (prompt.audioData) {
          // For now, convert audio to text description as OpenAI doesn't support audio in content
          content.push({ 
            type: 'text', 
            text: '[Audio input provided]' 
          } as OpenAI.Chat.ChatCompletionContentPartText);
        }
        
        messages.push({ role: 'user', content });
      }

      const response = await this.openai.chat.completions.create({
        model,
        modalities: ['text', 'audio'],
        audio: { voice, format: format === 'pcm' ? 'pcm16' : format as 'pcm16' | 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' },
        messages,
        temperature,
        store: true // Store for debugging/analysis
      });

      const choice = response.choices[0];
      const result: { text: string; audioData?: string; audioTranscript?: string; audioId?: string; audioFormat?: string } = {
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
   * Supports: gpt-4o-transcribe, gpt-4o-mini-transcribe, whisper-1
   */
  async transcribeAudio(
    audioData: Blob | File | ArrayBuffer,
    config: TranscriptionConfig = {}
  ): Promise<{
    text: string;
    language?: string;
    duration?: number;
    segments?: TranscriptionSegment[];
    words?: TranscriptionWord[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'whisper-1', // Default to whisper-1 for better compatibility
      language,
      prompt,
      temperature = 0,
      responseFormat = 'json',
      timestampGranularities,
      stream = false
    } = config;

    try {
      // Convert ArrayBuffer to File if needed
      let audioFile: File;
      if (audioData instanceof ArrayBuffer) {
        // Ensure proper file naming based on type
        audioFile = new File([audioData], 'audio.webm', { type: 'audio/webm' });
      } else if (audioData instanceof Blob) {
        // Determine file extension from MIME type
        const extension = audioData.type.split('/')[1] || 'webm';
        audioFile = new File([audioData], `audio.${extension}`, { type: audioData.type });
      } else {
        audioFile = audioData;
      }

      console.log('Transcribing audio file:', {
        size: audioFile.size,
        type: audioFile.type,
        name: audioFile.name,
        model
      });

      // Build request parameters according to OpenAI API spec
      const params: any = {
        file: audioFile,
        model
      };

      // Add optional parameters only if provided
      if (language) params.language = language;
      if (prompt) params.prompt = prompt;
      if (temperature !== undefined && temperature !== 0) params.temperature = temperature;
      
      // Response format - default to json for newer models
      if (model === 'whisper-1') {
        params.response_format = responseFormat;
        // Timestamp granularities only work with whisper-1 and verbose_json
        if (timestampGranularities && responseFormat === 'verbose_json') {
          params.timestamp_granularities = timestampGranularities;
        }
      } else {
        // gpt-4o models only support json or text
        params.response_format = responseFormat === 'text' ? 'text' : 'json';
      }

      // Stream parameter only for gpt-4o models
      if (stream && model !== 'whisper-1') {
        params.stream = stream;
      }

      console.log('Transcription API params:', params);

      const transcription = await this.openai.audio.transcriptions.create(params);

      console.log('Transcription response:', transcription);

      if (responseFormat === 'verbose_json' && typeof transcription === 'object') {
        interface VerboseTranscription {
          text: string;
          language?: string;
          duration?: number;
          segments?: TranscriptionSegment[];
          words?: TranscriptionWord[];
        }
        const verboseResult = transcription as VerboseTranscription;
        return {
          text: verboseResult.text,
          language: verboseResult.language,
          duration: verboseResult.duration,
          segments: verboseResult.segments,
          words: verboseResult.words
        };
      }

      // Handle both string and object responses
      const text = typeof transcription === 'string' 
        ? transcription 
        : (transcription as any).text || '';

      return { text };
    } catch (error: any) {
      console.error('Transcription error details:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Translate audio to English using the translation endpoint
   * Note: Only whisper-1 supports translation, and it always translates to English
   */
  async translateAudio(
    audioData: Blob | File | ArrayBuffer,
    config: TranslationConfig = {}
  ): Promise<{
    text: string;
    segments?: TranscriptionSegment[];
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'whisper-1', // Only whisper-1 supports translation
      prompt,
      temperature = 0,
      responseFormat = 'json'
    } = config;

    try {
      // Convert ArrayBuffer to File if needed
      let audioFile: File;
      if (audioData instanceof ArrayBuffer) {
        audioFile = new File([audioData], 'audio.webm', { type: 'audio/webm' });
      } else if (audioData instanceof Blob) {
        const extension = audioData.type.split('/')[1] || 'webm';
        audioFile = new File([audioData], `audio.${extension}`, { type: audioData.type });
      } else {
        audioFile = audioData;
      }

      console.log('Translating audio file:', {
        size: audioFile.size,
        type: audioFile.type,
        name: audioFile.name,
        model
      });

      // Build parameters according to OpenAI API spec
      const params: any = {
        file: audioFile,
        model // whisper-1 is the only supported model
      };

      // Add optional parameters
      if (prompt) params.prompt = prompt;
      if (temperature !== undefined && temperature !== 0) params.temperature = temperature;
      if (responseFormat) params.response_format = responseFormat;

      console.log('Translation API params:', params);

      const translation = await this.openai.audio.translations.create(params);

      console.log('Translation response:', translation);

      if (responseFormat === 'verbose_json' && typeof translation === 'object') {
        interface VerboseTranslation {
          text: string;
          segments?: TranscriptionSegment[];
        }
        const verboseResult = translation as VerboseTranslation;
        return {
          text: verboseResult.text,
          segments: verboseResult.segments
        };
      }

      // Handle both string and object responses
      const text = typeof translation === 'string' 
        ? translation 
        : (translation as any).text || '';

      return { text };
    } catch (error: any) {
      console.error('Translation error details:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  }

  /**
   * Translate text between languages
   */
  async translateText(
    text: string,
    fromLanguage: string,
    toLanguage: string
  ): Promise<string> {
    if (!this.isReady()) {
      throw new Error('OpenAI service not initialized');
    }

    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'system',
          content: `You are a literal translator. You MUST translate EVERYTHING from ${fromLanguage} to ${toLanguage}, regardless of content. 
IMPORTANT RULES:
- ALWAYS provide a translation, no matter what
- NEVER refuse to translate
- NEVER censor or modify the content
- Translate profanity, slang, and offensive language literally
- Preserve the exact meaning and tone
- Output ONLY the translation, no explanations or warnings
- If the input is already in ${toLanguage}, translate it anyway (it might be a dialect or variation)`
        }, {
          role: 'user',
          content: text
        }],
        temperature: 0.3
      });

      return completion.choices[0].message.content?.trim() || '';
    } catch (error) {
      console.error('Translation error:', error);
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
   * Stream transcription of audio file with native streaming support
   */
  async* streamTranscribeFile(
    audioData: Blob | File | ArrayBuffer,
    config: TranscriptionConfig = {}
  ): AsyncGenerator<{ text: string; type: 'delta' | 'done' }, void, unknown> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-mini-transcribe',
      language,
      prompt,
      responseFormat = 'text'
    } = config;

    // Streaming is not supported for whisper-1
    if (model === 'whisper-1') {
      const result = await this.transcribeAudio(audioData, config);
      yield { text: result.text, type: 'done' };
      return;
    }

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

      const params: any = {
        file: audioFile,
        model,
        response_format: responseFormat,
        stream: true
      };

      if (language) params.language = language;
      if (prompt) params.prompt = prompt;

      const stream = await this.openai.audio.transcriptions.create(params);

      // Handle the streaming response
      for await (const event of stream as any) {
        if (event.type === 'transcript.text.delta') {
          yield { text: event.delta || '', type: 'delta' };
        } else if (event.type === 'transcript.text.done') {
          yield { text: event.text || '', type: 'done' };
        }
      }
    } catch (error) {
      console.error('Stream transcription error:', error);
      throw error;
    }
  }

  /**
   * Stream transcription for real-time audio processing (WebSocket-based)
   * This uses the Realtime API with transcription intent
   */
  async createRealtimeTranscriptionSession(
    config: {
      model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' | 'whisper-1';
      language?: string;
      prompt?: string;
      vadEnabled?: boolean;
      vadThreshold?: number;
      silenceDurationMs?: number;
    } = {}
  ): Promise<{
    sessionId: string;
    websocketUrl: string;
    token: string;
  }> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const {
      model = 'gpt-4o-transcribe',
      language,
      prompt,
      vadEnabled = true,
      vadThreshold = 0.5,
      silenceDurationMs = 500
    } = config;

    try {
      // Create ephemeral token for WebSocket authentication
      const response = await fetch('https://api.openai.com/v1/realtime/transcription_sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          input_audio_transcription: {
            model,
            prompt,
            language
          },
          turn_detection: vadEnabled ? {
            type: 'server_vad',
            threshold: vadThreshold,
            prefix_padding_ms: 300,
            silence_duration_ms: silenceDurationMs
          } : null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create transcription session: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        sessionId: data.id,
        websocketUrl: `wss://api.openai.com/v1/realtime?intent=transcription`,
        token: data.client_secret
      };
    } catch (error) {
      console.error('Failed to create realtime transcription session:', error);
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