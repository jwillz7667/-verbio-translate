'use client';

import { useEffect, useRef } from 'react';

interface RealtimeAudioPlayerProps {
  audioData?: ArrayBuffer;
  onPlaybackComplete?: () => void;
}

export function RealtimeAudioPlayer({ audioData, onPlaybackComplete }: RealtimeAudioPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (audioData && audioData.byteLength > 0) {
      playAudio(audioData);
    }
  }, [audioData]);

  const playAudio = async (pcm16Data: ArrayBuffer) => {
    if (isPlayingRef.current) return;
    
    try {
      isPlayingRef.current = true;

      // Create or reuse audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }

      const audioContext = audioContextRef.current;
      
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Convert PCM16 to Float32
      const pcm16 = new Int16Array(pcm16Data);
      const float32 = new Float32Array(pcm16.length);
      
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      // Play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        isPlayingRef.current = false;
        onPlaybackComplete?.();
      };
      
      source.start();
      console.log('Playing audio response:', pcm16.length, 'samples');
    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlayingRef.current = false;
    }
  };

  return null; // This component doesn't render anything
}