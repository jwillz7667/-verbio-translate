'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioRecorderProps {
  isRecording: boolean;
  onAudioData: (audioBlob: Blob) => void;
  onError: (error: string) => void;
  maxDuration?: number; // in milliseconds
  sampleRate?: number;
  audioBitsPerSecond?: number;
}

export function AudioRecorder({
  isRecording,
  onAudioData,
  onError,
  maxDuration = 30000, // 30 seconds default
  sampleRate = 48000, // High quality sample rate
  audioBitsPerSecond = 128000 // High quality bitrate
}: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // Enhanced microphone permissions check
  const checkMicrophonePermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        onError('Media devices not supported in this browser. Please use Chrome, Firefox, or Safari for voice features.');
        return false;
      }

      // Check for secure context
      if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost') {
        onError('Voice recording requires a secure connection (HTTPS). Please use HTTPS for voice features.');
        return false;
      }

      // Check current permission status
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('Current microphone permission:', permission.state);
          
          if (permission.state === 'denied') {
            onError('Microphone access is denied. Please click the microphone icon in your browser address bar and allow access, then try again.');
            return false;
          }
        } catch (permError) {
          console.log('Could not query permission status:', permError);
          // Continue with getUserMedia test as fallback
        }
      }

      // Test microphone access
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        console.log('Microphone permission test successful');
        testStream.getTracks().forEach(track => track.stop());
        return true;
        
      } catch (testError: any) {
        console.error('Microphone test failed:', testError);
        
        let errorMessage = 'Microphone access failed. ';
        if (testError.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone access when prompted, or click the microphone icon in your browser address bar to enable access.';
        } else if (testError.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else if (testError.name === 'NotReadableError') {
          errorMessage += 'Microphone is being used by another application. Please close other apps using the microphone and try again.';
        } else if (testError.name === 'OverconstrainedError') {
          errorMessage += 'Microphone settings not supported. Please try with a different microphone.';
        } else if (testError.name === 'SecurityError') {
          errorMessage += 'Secure connection (HTTPS) required for microphone access.';
        } else {
          errorMessage += `${testError.message || 'Unknown error'}. Please check your microphone settings.`;
        }
        
        onError(errorMessage);
        return false;
      }

    } catch (error) {
      console.error('Permission check failed:', error);
      onError('Failed to check microphone permissions. Please ensure your browser supports voice input.');
      return false;
    }
  }, [onError]);

  // Initialize audio recording with optimal settings
  const initializeRecording = useCallback(async () => {
    try {
      if (isInitialized || !isRecording) return;

      console.log('Initializing audio recording...');
      
      const hasPermission = await checkMicrophonePermissions();
      if (!hasPermission) {
        onError('Microphone permissions required for audio recording');
        return;
      }

      // Enhanced audio constraints for better quality
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: sampleRate,
          channelCount: 1, // Mono for speech recognition
          sampleSize: 16,
          // Advanced constraints for better quality
          ...(navigator.mediaDevices.getSupportedConstraints().latency && { latency: 0.01 }),
          ...(navigator.mediaDevices.getSupportedConstraints().googEchoCancellation && { 
            googEchoCancellation: true 
          }),
          ...(navigator.mediaDevices.getSupportedConstraints().googNoiseSuppression && { 
            googNoiseSuppression: true 
          }),
          ...(navigator.mediaDevices.getSupportedConstraints().googAutoGainControl && { 
            googAutoGainControl: true 
          })
        }
      };

      console.log('Requesting microphone access with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log('Microphone access granted, stream obtained');

      // Check if the stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available from microphone');
      }

      console.log('Audio tracks available:', audioTracks.length);
      console.log('Audio track settings:', audioTracks[0].getSettings());

      // Determine the best MIME type for recording
      let mimeType = 'audio/webm;codecs=opus';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm;codecs=pcm',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('Using MIME type:', mimeType);
          break;
        }
      }

      // Create MediaRecorder with optimized settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Enhanced event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, processing audio...');
        
        if (chunksRef.current.length === 0) {
          onError('No audio data recorded. Please try speaking louder or check your microphone.');
          return;
        }

        const audioBlob = new Blob(chunksRef.current, { 
          type: mimeType
        });
        
        console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (audioBlob.size < 1000) { // Less than 1KB is likely empty
          onError('Recording too short or silent. Please try again.');
          return;
        }

        onAudioData(audioBlob);
        chunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError('Audio recording failed due to technical error. Please try again.');
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
        setRecordingStartTime(Date.now());
      };

      mediaRecorder.onpause = () => {
        console.log('MediaRecorder paused');
      };

      mediaRecorder.onresume = () => {
        console.log('MediaRecorder resumed');
      };

      setIsInitialized(true);
      console.log('Audio recording initialized successfully');

    } catch (error) {
      console.error('Failed to initialize audio recording:', error);
      
      let errorMessage = 'Failed to access microphone. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Microphone is being used by another application.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Microphone settings are not supported.';
        } else if (error.name === 'SecurityError') {
          errorMessage += 'Secure connection required for microphone access.';
        } else {
          errorMessage += error.message;
        }
      }
      
      onError(errorMessage);
      setIsInitialized(false);
    }
  }, [isRecording, isInitialized, checkMicrophonePermissions, onError, onAudioData, sampleRate, audioBitsPerSecond]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'inactive') {
        console.log('MediaRecorder not ready or already recording');
        return;
      }

      console.log('Starting audio recording...');
      
      // Reset chunks
      chunksRef.current = [];
      
      // Start recording with data collection every 100ms for real-time processing
      mediaRecorderRef.current.start(100);
      
      // Set timeout for maximum recording duration
      if (maxDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          console.log('Recording timeout reached, stopping...');
          stopRecording();
        }, maxDuration);
      }

      console.log('Recording started successfully');

    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('Failed to start audio recording. Please try again.');
    }
  }, [maxDuration, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      console.log('Stopping audio recording...');

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        console.log('MediaRecorder stop requested');
      }

      // Stop and cleanup stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Audio track stopped:', track.kind);
        });
        streamRef.current = null;
      }

      setIsInitialized(false);
      setRecordingStartTime(null);
      
      console.log('Recording stopped and resources cleaned up');

    } catch (error) {
      console.error('Error stopping recording:', error);
      onError('Error stopping audio recording');
    }
  }, [onError]);

  // Handle recording state changes
  useEffect(() => {
    if (isRecording && !isInitialized) {
      initializeRecording();
    } else if (!isRecording && isInitialized) {
      stopRecording();
    }
  }, [isRecording, isInitialized, initializeRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('AudioRecorder unmounting, cleaning up...');
      
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Error stopping MediaRecorder on cleanup:', error);
        }
      }
      
      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.error('Error stopping track on cleanup:', error);
          }
        });
      }
    };
  }, []);

  // Monitor recording duration
  useEffect(() => {
    if (!isRecording || !recordingStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - recordingStartTime;
      if (elapsed >= maxDuration) {
        console.log('Maximum recording duration reached');
        stopRecording();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime, maxDuration, stopRecording]);

  // This component doesn't render anything visible
  return null;
}