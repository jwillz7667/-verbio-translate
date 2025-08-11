/**
 * Audio format converter for OpenAI Realtime API
 * Converts browser audio to PCM16 format at 24kHz
 */

export class AudioConverter {
  private audioContext: AudioContext;
  private targetSampleRate = 24000; // OpenAI requires 24kHz

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  /**
   * Convert audio Blob to PCM16 ArrayBuffer
   * @param audioBlob - Audio blob from MediaRecorder
   * @returns PCM16 audio data as ArrayBuffer
   */
  async convertBlobToPCM16(audioBlob: Blob): Promise<ArrayBuffer> {
    try {
      // Convert Blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Get the audio data from the first channel (mono)
      const channelData = audioBuffer.getChannelData(0);
      
      // Resample to 24kHz if needed
      const resampledData = this.resample(channelData, audioBuffer.sampleRate, this.targetSampleRate);
      
      // Convert Float32Array to PCM16 (Int16Array)
      const pcm16Data = this.float32ToPCM16(resampledData);
      
      return pcm16Data.buffer as ArrayBuffer;
    } catch (error) {
      console.error('Error converting audio:', error);
      throw new Error('Failed to convert audio to PCM16 format');
    }
  }

  /**
   * Convert streaming audio chunks to PCM16
   * @param audioChunk - Raw audio data chunk
   * @returns PCM16 audio data as ArrayBuffer
   */
  async convertChunkToPCM16(audioChunk: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      // For streaming, we might get raw PCM data already
      // Check if it needs conversion
      const dataView = new DataView(audioChunk);
      
      // If it's already PCM16 at 24kHz, return as-is
      // Otherwise, convert it
      if (this.isPCM16Format(dataView)) {
        return audioChunk;
      }
      
      // Convert to PCM16
      const float32Data = new Float32Array(audioChunk);
      const pcm16Data = this.float32ToPCM16(float32Data);
      
      return pcm16Data.buffer as ArrayBuffer;
    } catch (error) {
      console.error('Error converting audio chunk:', error);
      throw new Error('Failed to convert audio chunk to PCM16 format');
    }
  }

  /**
   * Resample audio data to target sample rate
   */
  private resample(data: Float32Array, fromSampleRate: number, toSampleRate: number): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return data;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const index = i * ratio;
      const indexFloor = Math.floor(index);
      const indexCeil = Math.min(indexFloor + 1, data.length - 1);
      const fraction = index - indexFloor;

      // Linear interpolation
      result[i] = data[indexFloor] * (1 - fraction) + data[indexCeil] * fraction;
    }

    return result;
  }

  /**
   * Convert Float32Array to PCM16 (Int16Array)
   */
  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp the float value between -1 and 1
      let sample = Math.max(-1, Math.min(1, float32Array[i]));
      
      // Convert to 16-bit PCM
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return pcm16;
  }

  /**
   * Check if data is already in PCM16 format
   */
  private isPCM16Format(dataView: DataView): boolean {
    // Simple heuristic: check if values are in Int16 range
    if (dataView.byteLength < 2) return false;
    
    const firstSample = dataView.getInt16(0, true);
    return firstSample >= -32768 && firstSample <= 32767;
  }

  /**
   * Convert PCM16 ArrayBuffer to base64 string for transmission
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string back to ArrayBuffer
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

// Singleton instance
let audioConverterInstance: AudioConverter | null = null;

export function getAudioConverter(): AudioConverter {
  if (!audioConverterInstance) {
    audioConverterInstance = new AudioConverter();
  }
  return audioConverterInstance;
}