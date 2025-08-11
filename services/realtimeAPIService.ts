import { EventEmitter } from 'events';

export interface RealtimeConfig {
  apiKey: string;
  model?: string;
  modalities?: ('text' | 'audio')[];
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  instructions?: string;
  temperature?: number;
  maxResponseOutputTokens?: number | 'inf';
  tools?: Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  inputAudioTranscription?: {
    model: 'whisper-1';
  };
  turnDetection?: {
    type: 'server_vad' | 'semantic_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    create_response?: boolean;
  };
}

export interface RealtimeSession {
  id: string;
  object: 'realtime.session';
  model: string;
  modalities: ('text' | 'audio')[];
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  expires_at: number;
  tools: Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  tool_choice: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
  temperature: number;
  max_response_output_tokens: number | 'inf';
  instructions?: string;
  input_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  output_audio_format?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  input_audio_transcription?: {
    model: 'whisper-1';
  };
  turn_detection?: {
    type: 'server_vad' | 'semantic_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    create_response?: boolean;
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

// Server Event Types
interface ServerEvent {
  type: string;
  [key: string]: unknown;
}

interface SessionEvent extends ServerEvent {
  session: RealtimeSession;
}

interface ConversationEvent extends ServerEvent {
  conversation: {
    id: string;
    [key: string]: unknown;
  };
}

interface ItemEvent extends ServerEvent {
  item: {
    type: string;
    role?: string;
    [key: string]: unknown;
  };
}

interface TranscriptionEvent extends ServerEvent {
  item_id: string;
  transcript: string;
  language?: string;
  confidence?: number;
}

interface AudioDeltaEvent extends ServerEvent {
  delta?: string;
  item_id: string;
  output_index: number;
  content_index?: number;
}

interface FunctionCallEvent extends ServerEvent {
  arguments: string;
  name: string;
  call_id: string;
  item_id: string;
}

interface ErrorEvent extends ServerEvent {
  error: {
    message?: string;
    code?: string;
    [key: string]: unknown;
  };
}

interface RateLimitsEvent extends ServerEvent {
  rate_limits: unknown[];
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
      modalities: ['text', 'audio'],
      voice: 'alloy',
      temperature: 0.8,
      maxResponseOutputTokens: 4096,
      inputAudioFormat: 'pcm16',
      outputAudioFormat: 'pcm16',
      toolChoice: 'auto',
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
      // IMPORTANT: Connect to WebSocket proxy, NOT directly to OpenAI
      // The proxy handles authentication with OpenAI
      console.log('=== WEBSOCKET CONNECTION DEBUG ===');
      console.log('Using WebSocket proxy for authentication');
      
      // Determine the WebSocket proxy URL based on environment
      let proxyUrl: string;
      
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        console.log('Current hostname:', hostname);
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Development environment
          proxyUrl = 'ws://localhost:3001';
          console.log('Using development proxy:', proxyUrl);
        } else if (hostname === 'verbio.app' || hostname.includes('verbio.app')) {
          // Production environment on verbio.app
          proxyUrl = 'wss://ws.verbio.app';
          console.log('Using production proxy:', proxyUrl);
        } else {
          // Fallback for other environments (staging, preview deployments)
          proxyUrl = `wss://${hostname}/ws-proxy`;
          console.log('Using fallback proxy:', proxyUrl);
        }
      } else {
        // Server-side or fallback
        proxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL || 'ws://localhost:3001';
        console.log('Using server-side proxy:', proxyUrl);
      }
      
      const wsUrl = `${proxyUrl}?model=${this.config.model}`;
      
      console.log('Final WebSocket URL:', wsUrl);
      console.log('NOT including API key in URL - proxy handles auth');
      console.log('=================================');
      
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
        modalities: this.config.modalities || ['text', 'audio'],
        voice: this.config.voice,
        instructions: this.config.instructions || 'You are a helpful voice assistant that helps with real-time translation between languages. When translating, preserve the tone and context of the original message.',
        temperature: this.config.temperature,
        max_response_output_tokens: this.config.maxResponseOutputTokens,
        tools: this.config.tools || this.getDefaultTools(),
        tool_choice: this.config.toolChoice || 'auto',
        input_audio_format: this.config.inputAudioFormat || 'pcm16',
        output_audio_format: this.config.outputAudioFormat || 'pcm16',
        input_audio_transcription: this.config.inputAudioTranscription || {
          model: 'whisper-1'
        },
        turn_detection: this.config.turnDetection || {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
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

  private handleServerEvent(event: ServerEvent): void {
    console.log('Server event:', event.type);

    // Handle proxy-specific events
    if (event.type?.startsWith('proxy.')) {
      switch (event.type) {
        case 'proxy.connected':
          console.log('Proxy connected to OpenAI');
          break;
        case 'proxy.error':
          console.error('Proxy error:', event.error);
          this.emit('error', new Error(String(event.error)));
          break;
        case 'proxy.disconnected':
          console.log('Proxy disconnected:', event.reason);
          break;
      }
      return;
    }

    switch (event.type) {
      // Session events
      case 'session.created':
      case 'session.updated':
        const sessionEvent = event as SessionEvent;
        this.session = sessionEvent.session;
        this.emit(event.type, sessionEvent.session);
        break;

      // Conversation events
      case 'conversation.created':
        const convEvent = event as ConversationEvent;
        this.currentConversationId = convEvent.conversation.id;
        this.emit('conversation.created', convEvent.conversation);
        break;

      case 'conversation.item.created':
        const itemEvent = event as ItemEvent;
        this.emit('conversation.item.created', itemEvent.item);
        if (itemEvent.item.type === 'message') {
          this.emit('message.created', itemEvent.item);
        }
        break;

      case 'conversation.item.deleted':
        this.emit('conversation.item.deleted', event);
        break;

      case 'conversation.item.truncated':
        this.emit('conversation.item.truncated', event);
        break;

      // Input audio buffer events
      case 'input_audio_buffer.committed':
        this.emit('input_audio_buffer.committed', event);
        break;

      case 'input_audio_buffer.cleared':
        this.emit('input_audio_buffer.cleared', event);
        break;

      case 'input_audio_buffer.speech_started':
        this.emit('speech.started', event);
        this.emit('input_audio_buffer.speech_started', event);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit('speech.stopped', event);
        this.emit('input_audio_buffer.speech_stopped', event);
        break;

      // Transcription events
      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscription(event as TranscriptionEvent);
        break;

      case 'conversation.item.input_audio_transcription.failed':
        this.emit('transcription.failed', event);
        break;

      // Response events
      case 'response.created':
        this.emit('response.created', event.response);
        this.emit('response.started', event.response);
        break;

      case 'response.done':
        this.emit('response.done', event.response);
        break;

      case 'response.output_item.added':
      case 'response.output_item.done':
        const outputItemEvent = event as ItemEvent;
        this.emit(event.type, outputItemEvent.item);
        if (event.type === 'response.output_item.added' && outputItemEvent.item.type === 'message') {
          this.emit('response.message', outputItemEvent.item);
        }
        break;

      case 'response.content_part.added':
        this.emit('response.content_part.added', event);
        break;

      case 'response.content_part.done':
        this.emit('response.content_part.done', event);
        break;

      // Text streaming events
      case 'response.text.delta':
        this.emit('response.text.delta', event);
        break;

      case 'response.text.done':
        this.emit('response.text.done', event);
        break;

      // Audio streaming events
      case 'response.audio_transcript.delta':
        this.emit('transcript.delta', {
          delta: event.delta,
          itemId: event.item_id,
          outputIndex: event.output_index,
          contentIndex: event.content_index
        });
        this.emit('response.audio_transcript.delta', event);
        break;

      case 'response.audio_transcript.done':
        this.emit('transcript.done', {
          transcript: event.transcript,
          itemId: event.item_id,
          outputIndex: event.output_index,
          contentIndex: event.content_index
        });
        this.emit('response.audio_transcript.done', event);
        break;

      case 'response.audio.delta':
        this.handleAudioDelta(event as AudioDeltaEvent);
        break;

      case 'response.audio.done':
        this.emit('audio.done', {
          itemId: event.item_id,
          outputIndex: event.output_index,
          contentIndex: event.content_index
        });
        this.emit('response.audio.done', event);
        break;

      // Function call events
      case 'response.function_call_arguments.delta':
        this.emit('function.arguments.delta', event);
        this.emit('response.function_call_arguments.delta', event);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCall(event as FunctionCallEvent);
        this.emit('response.function_call_arguments.done', event);
        break;

      // Rate limit events
      case 'rate_limits.updated':
        const rateLimitsEvent = event as RateLimitsEvent;
        this.emit('rate_limits.updated', rateLimitsEvent.rate_limits);
        break;

      // Error event
      case 'error':
        const errorEvent = event as ErrorEvent;
        console.error('Server error:', errorEvent.error);
        this.emit('error', new Error(errorEvent.error.message || errorEvent.error.code || 'Unknown error'));
        break;

      default:
        console.log('Unhandled event type:', event.type);
        this.emit(event.type, event);
    }
  }

  private handleTranscription(event: TranscriptionEvent): void {
    const transcript: AudioTranscript = {
      id: event.item_id,
      transcript: event.transcript,
      language: event.language,
      confidence: event.confidence
    };
    this.emit('transcription.completed', transcript);
  }

  private handleAudioDelta(event: AudioDeltaEvent): void {
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

  private handleFunctionCall(event: FunctionCallEvent): void {
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

  // Client event methods - Input Audio Buffer
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

  // Conversation Item Management
  public createConversationItem(item: {
    type: 'message' | 'function_call' | 'function_call_output';
    role?: 'user' | 'assistant' | 'system';
    content?: Array<{ type: string; text?: string; audio?: string }>;
    call_id?: string;
    name?: string;
    arguments?: string;
    output?: string;
  }): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'conversation.item.create',
      item
    });
  }

  public deleteConversationItem(itemId: string): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'conversation.item.delete',
      item_id: itemId
    });
  }

  public truncateConversation(itemId: string, contentIndex: number, audioEndMs: number): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'conversation.item.truncate',
      item_id: itemId,
      content_index: contentIndex,
      audio_end_ms: audioEndMs
    });
  }

  // Response Management
  public createResponse(response?: {
    modalities?: ('text' | 'audio')[];
    instructions?: string;
    voice?: string;
    output_audio_format?: string;
    tools?: Array<{ type: string; name: string; description: string; parameters: Record<string, unknown> }>;
    tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; name: string };
    temperature?: number;
    max_output_tokens?: number | 'inf';
  }): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'response.create',
      response
    });
  }

  public async translateText(text: string, fromLanguage: string, toLanguage: string, context?: string): Promise<{
    translatedText?: string;
    response?: unknown;
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to Realtime API');
    }

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

      const handleResponse = (response: unknown) => {
        clearTimeout(timeout);
        this.off('response.done', handleResponse);
        resolve({ response });
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

  // Function call result submission
  public submitFunctionCallResult(callId: string, output: unknown): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output)
      }
    });
  }

  public sendMessage(message: Record<string, unknown>): void {
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

  public updateSession(updates: Partial<Omit<RealtimeSession, 'id' | 'object' | 'expires_at'>>): void {
    if (!this.isConnected || !this.ws) return;

    this.sendMessage({
      type: 'session.update',
      session: updates
    });
  }
}