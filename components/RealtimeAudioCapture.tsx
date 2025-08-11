'use client';

import { useEffect, useRef } from 'react';

interface RealtimeAudioCaptureProps {
  isCapturing: boolean;
  onAudioData: (pcm16Data: ArrayBuffer) => void;
  onError: (error: string) => void;
}

export function RealtimeAudioCapture({ isCapturing, onAudioData, onError }: RealtimeAudioCaptureProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isCapturing) {
      startCapture();
    } else {
      stopCapture();
    }

    return () => {
      stopCapture();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCapturing]);

  const startCapture = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000, // OpenAI requires 24kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Create audio context at 24kHz
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 24000
      });

      // Create source from microphone
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Create processor to capture raw audio
      // Buffer size of 2048 samples = ~85ms at 24kHz
      processorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send PCM16 data
        onAudioData(pcm16.buffer);
      };

      // Connect the nodes
      sourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log('Started real-time audio capture at 24kHz PCM16');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      onError(`Failed to start audio capture: ${error}`);
    }
  };

  const stopCapture = () => {
    // Disconnect and cleanup
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('Stopped audio capture');
  };

  return null; // This component doesn't render anything
}