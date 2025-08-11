import { EventEmitter } from 'events';

export interface RealtimeConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  instructions?: string;
  temperature?: number;
  maxResponseOutputTokens?: number;
  tools?: Array<{
    type: string;
    name: string;
    description: string;
    parameters: any;
  }>;
}

export interface RealtimeSession {
  id: string;
  model: string;
  voice: string;
  expires_at: number;
  tools: any[];
  tool_choice: string;
  temperature: number;
  max_response_output_tokens: number | 'inf';
  instructions?: string;
  input_audio_format?: string;
  output_audio_format?: string;
  input_audio_transcription?: {
    model: string;
  };
  turn_detection?: {
    type: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
}

export interface AudioTranscript {
  id: string;
  transcript: string;
  language?: string;
  confidence?: number;
}

export interface TranslationRequest {
  text: string;
  fromLanguage: string;
  toLanguage: string;
  context?: string;
}

export class RealtimeAPIService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: RealtimeConfig;
  private session: RealtimeSession | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private isConnected = false;
  private audioBuffer: ArrayBuffer[] = [];
  private responseAudioBuffer: ArrayBuffer[] = [];
  private currentConversationId: string | null = null;
  private pendingTranslations = new Map<string, TranslationRequest>();

  constructor(config: RealtimeConfig) {
    super();
    this.config = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      temperature: 0.8,
      maxResponseOutputTokens: 4096,
      ...config
    };
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('Already connected or connecting');
      return;
    }

    this.isConnecting = true;

    try {
      // Determine the WebSocket proxy URL based on environment
      let proxyUrl: string;
      
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Development environment
          proxyUrl = 'ws://localhost:3001';
        } else if (hostname === 'verbio.app' || hostname.includes('verbio.app')) {
          // Production environment on verbio.app
          proxyUrl = 'wss://ws.verbio.app';
        } else {
          // Fallback for other environments (staging, preview deployments)
          proxyUrl = `wss://${hostname}/ws-proxy`;
        }
      } else {
        // Server-side or fallback
        proxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:3001';
      }
      
      const wsUrl = `${proxyUrl}?model=${this.config.model}`;
      
      console.log('Connecting to WebSocket proxy:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.disconnect();
          reject(new Error('Connection timeout'));
        }, 10000);

        this.once('session.created', () => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          reject(error);
        });
      });
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.emit('connected');
      this.configureSession();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.isConnected = false;
      this.isConnecting = false;
      this.emit('disconnected', event);
      
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };
  }

  private configureSession(): void {
    const sessionConfig = {
      type: 'session.update',
      session: {
        model: this.config.model,
        voice: this.config.voice,
        instructions: this.config.instructions || 'You are a helpful voice assistant that helps with real-time translation between languages. When translating, preserve the tone and context of the original message.',
        temperature: this.config.temperature,
        max_response_output_tokens: this.config.maxResponseOutputTokens,
        tools: this.config.tools || this.getDefaultTools(),
        tool_choice: 'auto',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };

    this.sendMessage(sessionConfig);
  }

  private getDefaultTools() {
    return [
      {
        type: 'function',
        name: 'translate_text',
        description: 'Translate text from one language to another',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to translate'
            },
            from_language: {
              type: 'string',
              description: 'The source language'
            },
            to_language: {
              type: 'string',
              description: 'The target language'
            }
          },
          required: ['text', 'from_language', 'to_language']
        }
      }
    ];
  }

  private handleServerEvent(event: any): void {
    console.log('Server event:', event.type);

    // Handle proxy-specific events
    if (event.type?.startsWith('proxy.')) {
      switch (event.type) {
        case 'proxy.connected':
          console.log('Proxy connected to OpenAI');
          break;
        case 'proxy.error':
          console.error('Proxy error:', event.error);
          this.emit('error', new Error(event.error));
          break;
        case 'proxy.disconnected':
          console.log('Proxy disconnected:', event.reason);
          break;
      }
      return;
    }

    switch (event.type) {
      case 'session.created':
        this.session = event.session;
        this.emit('session.created', event.session);
        break;

      case 'session.updated':
        this.session = event.session;
        this.emit('session.updated', event.session);
        break;

      case 'conversation.created':
        this.currentConversationId = event.conversation.id;
        this.emit('conversation.created', event.conversation);
        break;

      case 'input_audio_buffer.speech_started':
        this.emit('speech.started', event);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit('speech.stopped', event);
        break;

      case 'conversation.item.created':
        if (event.item.type === 'message') {
          this.emit('message.created', event.item);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscription(event);
        break;

      case 'response.created':
        this.emit('response.started', event.response);
        break;

      case 'response.output_item.added':
        if (event.item.type === 'message') {
          this.emit('response.message', event.item);
        }
        break;

      case 'response.audio_transcript.delta':
        this.emit('transcript.delta', {
          delta: event.delta,
          itemId: event.item_id,
          outputIndex: event.output_index
        });
        break;

      case 'response.audio_transcript.done':
        this.emit('transcript.done', {
          transcript: event.transcript,
          itemId: event.item_id,
          outputIndex: event.output_index
        });
        break;

      case 'response.audio.delta':
        this.handleAudioDelta(event);
        break;

      case 'response.audio.done':
        this.emit('audio.done', {
          itemId: event.item_id,
          outputIndex: event.output_index
        });
        break;

      case 'response.done':
        this.emit('response.done', event.response);
        break;

      case 'response.function_call_arguments.delta':
        this.emit('function.arguments.delta', event);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCall(event);
        break;

      case 'error':
        console.error('Server error:', event.error);
        this.emit('error', new Error(event.error.message));
        break;

      default:
        this.emit(event.type, event);
    }
  }

  private handleTranscription(event: any): void {
    const transcript: AudioTranscript = {
      id: event.item_id,
      transcript: event.transcript,
      language: event.language,
      confidence: event.confidence
    };
    this.emit('transcription.completed', transcript);
  }

  private handleAudioDelta(event: any): void {
    if (event.delta) {
      const audioData = this.base64ToArrayBuffer(event.delta);
      this.responseAudioBuffer.push(audioData);
      this.emit('audio.delta', {
        audio: audioData,
        itemId: event.item_id,
        outputIndex: event.output_index
      });
    }
  }

  private handleFunctionCall(event: any): void {
    try {
      const args = JSON.parse(event.arguments);
      if (event.name === 'translate_text') {
        this.emit('translation.result', {
          callId: event.call_id,
          itemId: event.item_id,
          translation: args
        });
      }
    } catch (error) {
      console.error('Error parsing function arguments:', error);
    }
  }

  public sendAudioData(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.warn('Not connected, buffering audio');
      this.audioBuffer.push(audioData);
      return;
    }

    const base64Audio = this.arrayBufferToBase64(audioData);
    this.sendMessage({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });
  }

  public commitAudioBuffer(): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'input_audio_buffer.commit'
    });
  }

  public clearAudioBuffer(): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'input_audio_buffer.clear'
    });
    this.audioBuffer = [];
  }

  public async translateText(text: string, fromLanguage: string, toLanguage: string, context?: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

    const requestId = `translate_${Date.now()}`;
    
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Translate the following text from ${fromLanguage} to ${toLanguage}. ${context ? `Context: ${context}. ` : ''}Text to translate: "${text}"`
          }
        ]
      }
    };

    this.sendMessage(message);
    
    this.sendMessage({
      type: 'response.create',
      response: {
        instructions: `Translate the text from ${fromLanguage} to ${toLanguage}. Respond with only the translated text, maintaining the original tone and context.`
      }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Translation timeout'));
      }, 10000);

      const handleResponse = (response: any) => {
        clearTimeout(timeout);
        this.off('response.done', handleResponse);
        resolve(response);
      };

      this.once('response.done', handleResponse);
    });
  }

  public cancelResponse(): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'response.cancel'
    });
  }

  public sendMessage(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready, message not sent:', message.type);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
      this.emit('error', error);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('reconnect.failed');
        }
      });
    }, delay);
  }

  public disconnect(): void {
    this.isConnected = false;
    this.isConnecting = false;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.session = null;
    this.audioBuffer = [];
    this.responseAudioBuffer = [];
    this.currentConversationId = null;
    this.pendingTranslations.clear();
  }

  public getResponseAudio(): ArrayBuffer[] {
    const audio = [...this.responseAudioBuffer];
    this.responseAudioBuffer = [];
    return audio;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public isReady(): boolean {
    return this.isConnected && this.session !== null;
  }

  public getSession(): RealtimeSession | null {
    return this.session;
  }

  public updateSession(updates: Partial<RealtimeSession>): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'session.update',
      session: updates
    });
  }
}