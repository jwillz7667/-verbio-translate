'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface SpeechRecognitionProps {
  isListening: boolean;
  language: string;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

// Extended SpeechRecognition interface
interface ExtendedSpeechRecognition extends SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;
}

// Language code mapping for Web Speech API
const SPEECH_LANGUAGE_CODES: Record<string, string> = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT',
  'Russian': 'ru-RU',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Chinese': 'zh-CN',
  'Arabic': 'ar-SA',
  'Hindi': 'hi-IN',
  'Dutch': 'nl-NL',
  'Swedish': 'sv-SE',
  'Norwegian': 'no-NO',
  'Danish': 'da-DK',
  'Finnish': 'fi-FI',
  'Polish': 'pl-PL',
  'Turkish': 'tr-TR',
  'Czech': 'cs-CZ',
  'Hungarian': 'hu-HU',
  'Greek': 'el-GR',
  'Hebrew': 'he-IL',
  'Thai': 'th-TH',
  'Vietnamese': 'vi-VN',
  'Ukrainian': 'uk-UA',
  'Bulgarian': 'bg-BG',
  'Croatian': 'hr-HR',
  'Estonian': 'et-EE',
  'Latvian': 'lv-LV',
  'Lithuanian': 'lt-LT',
  'Romanian': 'ro-RO',
  'Slovak': 'sk-SK',
  'Slovenian': 'sl-SI'
};

export function SpeechRecognition({
  isListening,
  language,
  onResult,
  onError,
  onStart,
  onEnd,
  continuous = true,
  interimResults = true,
  maxAlternatives = 5
}: SpeechRecognitionProps) {
  const recognitionRef = useRef<ExtendedSpeechRecognition | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const lastResultRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const permissionCheckingRef = useRef<boolean>(false);

  // Enhanced microphone permission checking
  const checkMicrophonePermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (permissionCheckingRef.current) {
        console.log('Permission check already in progress');
        return false;
      }

      permissionCheckingRef.current = true;
      console.log('Checking microphone permissions...');

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not available');
        onError('Microphone access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
        setPermissionStatus('denied');
        return false;
      }

      // Check permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('Current microphone permission status:', permission.state);
          setPermissionStatus(permission.state);
          
          if (permission.state === 'denied') {
            onError('Microphone access is denied. Please click the microphone icon in your browser address bar and allow access, then try again.');
            return false;
          }
          
          if (permission.state === 'granted') {
            console.log('Microphone permission already granted');
            return true;
          }
        } catch (permError) {
          console.log('Could not query permission status:', permError);
          // Continue with getUserMedia as fallback
        }
      }

      // Test microphone access
      try {
        console.log('Testing microphone access...');
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        console.log('Microphone access granted successfully');
        setPermissionStatus('granted');
        
        // Clean up test stream
        testStream.getTracks().forEach(track => track.stop());
        return true;
        
      } catch (error: any) {
        console.error('Microphone access error:', error);
        
        let errorMessage = 'Microphone access failed. ';
        
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone access when prompted by your browser, or click the microphone icon in the address bar to enable access.';
          setPermissionStatus('denied');
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
          setPermissionStatus('denied');
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Microphone is being used by another application. Please close other apps using the microphone and try again.';
          setPermissionStatus('denied');
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Microphone settings are not supported. Please try with a different microphone.';
          setPermissionStatus('denied');
        } else if (error.name === 'SecurityError') {
          errorMessage += 'Secure connection (HTTPS) is required for microphone access.';
          setPermissionStatus('denied');
        } else {
          errorMessage += `${error.message || 'Unknown error'}. Please check your microphone settings and try again.`;
          setPermissionStatus('denied');
        }
        
        onError(errorMessage);
        return false;
      }
      
    } catch (error) {
      console.error('Permission check failed:', error);
      onError('Failed to check microphone permissions. Please ensure your browser supports voice input.');
      setPermissionStatus('denied');
      return false;
    } finally {
      permissionCheckingRef.current = false;
    }
  }, [onError]);

  // Check browser support and initialize
  useEffect(() => {
    const checkSupport = () => {
      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition ||
        (window as any).mozSpeechRecognition ||
        (window as any).msSpeechRecognition;

      if (!SpeechRecognition) {
        console.log('Speech recognition not supported in this browser');
        onError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari for voice input.');
        setIsSupported(false);
        return false;
      }

      // Check for secure context requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.log('Speech recognition requires HTTPS');
        onError('Voice input requires a secure connection (HTTPS). Please use HTTPS for voice features.');
        setIsSupported(false);
        return false;
      }

      setIsSupported(true);
      return true;
    };

    if (checkSupport()) {
      initializeSpeechRecognition();
    }
  }, []); // Only run once on mount

  const initializeSpeechRecognition = useCallback(() => {
    try {
      if (recognitionRef.current || isInitialized) return;

      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        onError('Speech recognition not available');
        return;
      }

      console.log('Initializing speech recognition...');
      
      const recognition = new SpeechRecognition() as ExtendedSpeechRecognition;
      
      // Enhanced configuration
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;
      recognition.lang = SPEECH_LANGUAGE_CODES[language] || 'en-US';
      
      // Advanced settings if available
      if ('grammars' in recognition) {
        // Grammar could be added here for better recognition
      }
      
      console.log('Speech recognition configured:', {
        language: recognition.lang,
        continuous: recognition.continuous,
        interimResults: recognition.interimResults,
        maxAlternatives: recognition.maxAlternatives
      });

      // Enhanced event handlers
      recognition.onstart = () => {
        console.log('Speech recognition started successfully');
        startTimeRef.current = Date.now();
        setIsInitialized(true);
        lastResultRef.current = '';
        setPermissionStatus('granted');
        onStart();
      };

      recognition.onresult = (event) => {
        try {
          console.log('Speech recognition result event:', event);
          
          let interimTranscript = '';
          let finalTranscript = '';
          
          // Process all results
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript.trim();
            
            console.log(`Result ${i}:`, {
              transcript,
              confidence: result[0].confidence,
              isFinal: result.isFinal
            });

            if (result.isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript + ' ';
            }
          }

          // Send interim results
          if (interimTranscript && interimResults) {
            const cleanInterim = interimTranscript.trim();
            if (cleanInterim !== lastResultRef.current) {
              console.log('Interim result:', cleanInterim);
              onResult(cleanInterim, false);
              lastResultRef.current = cleanInterim;
            }
          }

          // Send final results
          if (finalTranscript) {
            const cleanFinal = finalTranscript.trim();
            console.log('Final result:', cleanFinal);
            onResult(cleanFinal, true);
            lastResultRef.current = '';
          }

          // Reset inactivity timeout on new results
          resetInactivityTimeout();

        } catch (error) {
          console.error('Error processing speech results:', error);
          onError('Error processing speech recognition results');
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error event:', event);
        
        let errorMessage = 'Speech recognition error occurred. ';
        const errorType = event.error || 'unknown';
        
        console.log('Error type:', errorType);
        
        switch (errorType) {
          case 'no-speech':
            console.log('No speech detected, will attempt restart');
            // Don't treat no-speech as a critical error, just restart
            setTimeout(() => {
              if (isListening && permissionStatus === 'granted') {
                console.log('Restarting recognition after no-speech error');
                restartRecognition();
              }
            }, 1000);
            return; // Don't call onError for no-speech
            
          case 'audio-capture':
            errorMessage += 'Microphone not accessible. Please check your microphone connection and settings.';
            setPermissionStatus('denied');
            break;
            
          case 'not-allowed':
            errorMessage += 'Microphone permission denied. Please allow microphone access in your browser settings and try again.';
            setPermissionStatus('denied');
            break;
            
          case 'network':
            errorMessage += 'Network error occurred. Please check your internet connection and try again.';
            break;
            
          case 'service-not-allowed':
            errorMessage += 'Speech recognition service not allowed. Please enable voice services in your browser.';
            setPermissionStatus('denied');
            break;
            
          case 'bad-grammar':
            errorMessage += 'Speech recognition configuration error. Please try again.';
            break;
            
          case 'language-not-supported':
            errorMessage += `Language '${language}' is not supported for speech recognition. Please select a different language.`;
            break;
            
          case 'aborted':
            console.log('Speech recognition was aborted');
            return; // Don't show error for intentional abort
            
          default:
            errorMessage += `Unknown error occurred (${errorType}). Please try again.`;
        }
        
        console.error('Speech recognition error details:', errorMessage);
        onError(errorMessage);
        setIsInitialized(false);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        const duration = Date.now() - startTimeRef.current;
        console.log('Recognition session duration:', duration + 'ms');
        
        setIsInitialized(false);
        onEnd();
        
        // Auto-restart if still listening and permission is granted
        if (isListening && duration > 100 && permissionStatus === 'granted') {
          console.log('Auto-restarting speech recognition...');
          setTimeout(() => {
            if (isListening && permissionStatus === 'granted') {
              restartRecognition();
            }
          }, 500);
        }
      };

      recognition.onnomatch = (event) => {
        console.log('No recognition match found:', event);
        // Don't treat as error, just continue listening
      };

      recognition.onspeechstart = () => {
        console.log('Speech input detected and processing started');
        // Clear timeout on speech start
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      recognition.onspeechend = () => {
        console.log('Speech input ended');
        // Set timeout to stop if no more speech
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current && isInitialized) {
            console.log('Stopping recognition due to speech end timeout');
            stopRecognition();
          }
        }, 2000);
      };

      recognition.onaudiostart = () => {
        console.log('Audio capturing started');
      };

      recognition.onaudioend = () => {
        console.log('Audio capturing ended');
      };

      recognition.onsoundstart = () => {
        console.log('Sound detected');
      };

      recognition.onsoundend = () => {
        console.log('Sound ended');
      };

      recognitionRef.current = recognition;
      console.log('Speech recognition initialized successfully');

    } catch (error) {
      console.error('Failed to initialize speech recognition:', error);
      onError('Failed to initialize speech recognition. Please try again.');
      setIsInitialized(false);
    }
  }, [language, continuous, interimResults, maxAlternatives, onStart, onResult, onError, onEnd, isListening, permissionStatus]);

  // Reset inactivity timeout
  const resetInactivityTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set new timeout for 10 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      console.log('Speech recognition inactivity timeout');
      if (recognitionRef.current && isListening) {
        stopRecognition();
      }
    }, 10000);
  }, [isListening]);

  // Start recognition with permission check
  const startRecognition = useCallback(async () => {
    try {
      if (!isSupported) {
        onError('Speech recognition is not supported in your browser');
        return;
      }

      console.log('Starting speech recognition with permission check...');
      
      // Check microphone permissions first
      const hasPermission = await checkMicrophonePermissions();
      if (!hasPermission) {
        console.log('Microphone permission denied, cannot start recognition');
        return;
      }

      if (!recognitionRef.current) {
        console.log('Recognition not initialized, initializing now...');
        initializeSpeechRecognition();
        // Wait a bit for initialization
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      if (!recognitionRef.current) {
        onError('Failed to initialize speech recognition');
        return;
      }

      if (isInitialized) {
        console.log('Recognition already running');
        return;
      }

      console.log('Starting speech recognition...');
      
      // Update language if changed
      const languageCode = SPEECH_LANGUAGE_CODES[language] || 'en-US';
      if (recognitionRef.current.lang !== languageCode) {
        console.log('Updating language from', recognitionRef.current.lang, 'to', languageCode);
        recognitionRef.current.lang = languageCode;
      }

      recognitionRef.current.start();
      resetInactivityTimeout();
      
    } catch (error: any) {
      console.error('Failed to start speech recognition:', error);
      
      if (error?.message?.includes('already started')) {
        console.log('Recognition already started, continuing...');
        return;
      }
      
      // Handle specific start errors
      let errorMessage = 'Failed to start speech recognition. ';
      if (error?.name === 'InvalidStateError') {
        errorMessage += 'Speech recognition is already running. Please try again in a moment.';
      } else if (error?.name === 'NotAllowedError') {
        errorMessage += 'Microphone permission denied. Please allow microphone access and try again.';
        setPermissionStatus('denied');
      } else {
        errorMessage += 'Please check your microphone settings and try again.';
      }
      
      onError(errorMessage);
      setIsInitialized(false);
    }
  }, [isSupported, isInitialized, language, onError, initializeSpeechRecognition, resetInactivityTimeout, checkMicrophonePermissions]);

  // Stop recognition
  const stopRecognition = useCallback(() => {
    try {
      console.log('Stopping speech recognition...');
      
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (recognitionRef.current && isInitialized) {
        try {
          recognitionRef.current.stop();
          console.log('Speech recognition stop requested');
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }

      setIsInitialized(false);
      lastResultRef.current = '';
      
    } catch (error) {
      console.error('Error in stopRecognition:', error);
    }
  }, [isInitialized]);

  // Restart recognition (for continuous listening)
  const restartRecognition = useCallback(() => {
    if (!isListening || !isSupported || permissionStatus !== 'granted') return;
    
    console.log('Restarting speech recognition...');
    
    // Clear any existing restart timeout
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    // Stop current recognition
    if (recognitionRef.current && isInitialized) {
      recognitionRef.current.stop();
    }
    
    // Restart after a short delay
    restartTimeoutRef.current = setTimeout(() => {
      if (isListening && isSupported && permissionStatus === 'granted') {
        startRecognition();
      }
    }, 500);
  }, [isListening, isSupported, isInitialized, startRecognition, permissionStatus]);

  // Handle listening state changes
  useEffect(() => {
    if (isListening && !isInitialized) {
      startRecognition();
    } else if (!isListening && isInitialized) {
      stopRecognition();
    }
  }, [isListening, isInitialized, startRecognition, stopRecognition]);

  // Handle language changes
  useEffect(() => {
    if (isInitialized && recognitionRef.current) {
      const newLanguageCode = SPEECH_LANGUAGE_CODES[language] || 'en-US';
      if (recognitionRef.current.lang !== newLanguageCode) {
        console.log('Language changed, restarting recognition with new language:', newLanguageCode);
        restartRecognition();
      }
    }
  }, [language, isInitialized, restartRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('SpeechRecognition component unmounting, cleaning up...');
      
      // Clear all timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      // Stop recognition
      if (recognitionRef.current && isInitialized) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition on cleanup:', error);
        }
      }
    };
  }, [isInitialized]);

  // This component doesn't render anything
  return null;
}