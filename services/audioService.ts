import { AudioData } from '../types';

export class AudioService {
  private static async getApiCredentials() {
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    return { projectId, publicAnonKey };
  }

  static async playTranslatedText(
    text: string, 
    language: string, 
    voice?: string, 
    speed?: number
  ): Promise<void> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/speak`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.slice(0, 4000), // Ensure within limits
          language,
          voice,
          speed: speed || 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`TTS failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.audioData) {
        throw new Error('No audio data received from TTS service');
      }

      // Create and play audio with better error handling
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioData}`);
      
      // Set up audio event handlers
      audio.oncanplaythrough = () => {
        console.log('Audio ready to play');
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        throw new Error('Audio playback failed');
      };
      
      audio.onended = () => {
        console.log('Audio playback completed');
      };

      await audio.play();

    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw error;
    }
  }

  static async transcribeAudio(audioData: AudioData): Promise<{
    text: string;
    language: string;
    confidence: number;
    duration?: number;
  }> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const formData = new FormData();
      formData.append('audio', audioData.audioBlob, 'recording.webm');
      formData.append('language', audioData.language);
      if (audioData.prompt) {
        formData.append('prompt', audioData.prompt);
      }
      
      console.log('Sending audio to transcription service...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/transcribe-realtime`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription API error:', response.status, errorText);
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcription result:', data);
      
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('No speech detected in recording');
      }

      return {
        text: data.text.trim(),
        language: data.language || audioData.language || 'Unknown',
        confidence: data.confidence || 0.8,
        duration: data.duration || 0
      };
      
    } catch (error) {
      console.error('Audio transcription error:', error);
      throw error;
    }
  }
}