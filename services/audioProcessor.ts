export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | AudioWorkletNode | null = null;
  private isRecording = false;
  private audioQueue: Float32Array[] = [];
  private playbackQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private sampleRate = 24000; // OpenAI Realtime API expects 24kHz
  private onAudioData: ((data: ArrayBuffer) => void) | null = null;
  private vadThreshold = 0.01;
  private silenceDetectionMs = 500;
  private lastSoundTime = 0;
  private audioWorkletReady = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAudioContext();
    }
  }

  private async initializeAudioContext(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });

      // Try to use AudioWorklet for better performance
      if (this.audioContext.audioWorklet) {
        try {
          await this.registerAudioWorklet();
          this.audioWorkletReady = true;
        } catch (error) {
          console.warn('AudioWorklet not available, falling back to ScriptProcessor:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw error;
    }
  }

  private async registerAudioWorklet(): Promise<void> {
    if (!this.audioContext) return;

    const processorCode = `
      class AudioCaptureProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 2048;
          this.buffer = [];
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input && input[0]) {
            const samples = input[0];
            this.buffer.push(...samples);
            
            while (this.buffer.length >= this.bufferSize) {
              const chunk = this.buffer.splice(0, this.bufferSize);
              this.port.postMessage({
                type: 'audio',
                data: new Float32Array(chunk)
              });
            }
          }
          return true;
        }
      }

      registerProcessor('audio-capture-processor', AudioCaptureProcessor);
    `;

    const blob = new Blob([processorCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this.audioContext.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
  }

  async startRecording(onAudioData: (data: ArrayBuffer) => void): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.onAudioData = onAudioData;

    try {
      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!this.audioContext) {
        await this.initializeAudioContext();
      }

      if (!this.audioContext) {
        throw new Error('Failed to initialize audio context');
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

      if (this.audioWorkletReady) {
        await this.setupAudioWorklet();
      } else {
        this.setupScriptProcessor();
      }

      this.isRecording = true;
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.cleanup();
      throw error;
    }
  }

  private async setupAudioWorklet(): Promise<void> {
    if (!this.audioContext || !this.source) return;

    try {
      const workletNode = new AudioWorkletNode(this.audioContext, 'audio-capture-processor');
      
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio' && this.onAudioData) {
          const pcmData = this.convertToPCM16(event.data.data);
          this.onAudioData(pcmData);
          this.detectVoiceActivity(event.data.data);
        }
      };

      this.source.connect(workletNode);
      this.processor = workletNode;
    } catch (error) {
      console.error('Failed to setup AudioWorklet:', error);
      this.setupScriptProcessor();
    }
  }

  private setupScriptProcessor(): void {
    if (!this.audioContext || !this.source) return;

    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isRecording) return;

      const inputData = event.inputBuffer.getChannelData(0);
      const pcmData = this.convertToPCM16(inputData);
      
      if (this.onAudioData) {
        this.onAudioData(pcmData);
      }

      this.detectVoiceActivity(inputData);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(i * 2, int16, true); // Little-endian
    }
    
    return buffer;
  }

  private detectVoiceActivity(samples: Float32Array): boolean {
    // Calculate RMS (Root Mean Square) for volume detection
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);

    const hasSound = rms > this.vadThreshold;
    
    if (hasSound) {
      this.lastSoundTime = Date.now();
      return true;
    }

    const silenceDuration = Date.now() - this.lastSoundTime;
    return silenceDuration < this.silenceDetectionMs;
  }

  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.processor) {
      if (this.processor instanceof AudioWorkletNode) {
        this.processor.disconnect();
        this.processor.port.close();
      } else {
        this.processor.disconnect();
      }
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('Recording stopped');
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      await this.initializeAudioContext();
    }

    if (!this.audioContext) {
      throw new Error('Failed to initialize audio context');
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Add to playback queue
    this.playbackQueue.push(audioData);

    if (!this.isPlaying) {
      this.processPlaybackQueue();
    }
  }

  private async processPlaybackQueue(): Promise<void> {
    if (this.playbackQueue.length === 0 || !this.audioContext) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    const audioData = this.playbackQueue.shift()!;
    
    try {
      // Convert PCM16 to Float32 for Web Audio API
      const float32Data = this.convertFromPCM16(audioData);
      
      // Create audio buffer
      const audioBuffer = this.audioContext.createBuffer(
        1, // mono
        float32Data.length,
        this.sampleRate
      );
      
      audioBuffer.getChannelData(0).set(float32Data);

      // Create and play buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => {
        this.processPlaybackQueue();
      };
      
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      this.processPlaybackQueue();
    }
  }

  private convertFromPCM16(buffer: ArrayBuffer): Float32Array {
    const view = new DataView(buffer);
    const float32Array = new Float32Array(buffer.byteLength / 2);
    
    for (let i = 0; i < float32Array.length; i++) {
      const int16 = view.getInt16(i * 2, true); // Little-endian
      float32Array[i] = int16 / (int16 < 0 ? 0x8000 : 0x7FFF);
    }
    
    return float32Array;
  }

  async playAudioStream(audioStream: ReadableStream<ArrayBuffer>): Promise<void> {
    const reader = audioStream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        await this.playAudio(value);
      }
    } catch (error) {
      console.error('Error playing audio stream:', error);
    } finally {
      reader.releaseLock();
    }
  }

  clearPlaybackQueue(): void {
    this.playbackQueue = [];
  }

  getPlaybackQueueLength(): number {
    return this.playbackQueue.length;
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  private cleanup(): void {
    this.stopRecording();
    this.clearPlaybackQueue();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.audioWorkletReady = false;
  }

  dispose(): void {
    this.cleanup();
  }

  setVADThreshold(threshold: number): void {
    this.vadThreshold = Math.max(0, Math.min(1, threshold));
  }

  setSilenceDetectionMs(ms: number): void {
    this.silenceDetectionMs = Math.max(0, ms);
  }

  async exportRecording(): Promise<Blob> {
    if (this.audioQueue.length === 0) {
      throw new Error('No audio data to export');
    }

    const totalLength = this.audioQueue.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedData = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of this.audioQueue) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = this.createWAVBlob(combinedData);
    return wavBlob;
  }

  private createWAVBlob(float32Array: Float32Array): Blob {
    const length = float32Array.length * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, length - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, float32Array.length * 2, true);

    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}