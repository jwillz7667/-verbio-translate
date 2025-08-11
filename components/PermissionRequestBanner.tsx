'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Mic, X, AlertCircle, CheckCircle } from 'lucide-react';

interface PermissionRequestBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export function PermissionRequestBanner({
  isVisible,
  onDismiss,
  onPermissionGranted,
  onPermissionDenied
}: PermissionRequestBannerProps) {
  const [permissionState, setPermissionState] = useState<'prompt' | 'checking' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);

  const checkMicrophonePermission = async () => {
    try {
      setPermissionState('checking');
      setError(null);

      // Check if the browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access');
      }

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        } 
      });
      
      // Permission granted - clean up the stream
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionState('granted');
      onPermissionGranted();
      
      // Auto-dismiss after success
      setTimeout(() => {
        onDismiss();
      }, 2000);
      
    } catch (error) {
      console.error('Microphone permission error:', error);
      
      let errorMessage = 'Failed to access microphone';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          errorMessage = 'Microphone is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          errorMessage = 'Microphone settings not supported. Please try with a different microphone.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setPermissionState('denied');
      onPermissionDenied();
    }
  };

  const retryPermission = () => {
    setPermissionState('prompt');
    setError(null);
  };

  // Auto-check permission on mount if visible
  useEffect(() => {
    if (isVisible) {
      // Check current permission state
      navigator.permissions?.query({ name: 'microphone' as PermissionName })
        .then(result => {
          if (result.state === 'granted') {
            setPermissionState('granted');
            onPermissionGranted();
          } else if (result.state === 'denied') {
            setPermissionState('denied');
            setError('Microphone permission was previously denied. Please enable it in your browser settings.');
          }
        })
        .catch(() => {
          // Fallback if permissions API is not supported
          console.log('Permissions API not supported, will prompt for access');
        });
    }
  }, [isVisible, onPermissionGranted]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ 
                  scale: permissionState === 'checking' ? [1, 1.1, 1] : 1,
                  rotate: permissionState === 'checking' ? [0, 10, -10, 0] : 0
                }}
                transition={{ 
                  duration: 0.5, 
                  repeat: permissionState === 'checking' ? Infinity : 0 
                }}
              >
                {permissionState === 'granted' ? (
                  <CheckCircle className="h-6 w-6 text-green-200" />
                ) : permissionState === 'denied' ? (
                  <AlertCircle className="h-6 w-6 text-red-200" />
                ) : (
                  <Mic className="h-6 w-6 text-white" />
                )}
              </motion.div>
              
              <div className="flex-1">
                <h4 className="text-white text-sm font-medium">
                  {permissionState === 'granted' 
                    ? '✅ Microphone Access Granted!'
                    : permissionState === 'denied'
                    ? '❌ Microphone Access Required'
                    : permissionState === 'checking'
                    ? '🎤 Requesting Microphone Access...'
                    : '🎤 Enable Voice Features'
                  }
                </h4>
                <p className="text-white/80 text-xs">
                  {permissionState === 'granted' 
                    ? 'You can now use voice translation features!'
                    : permissionState === 'denied'
                    ? error || 'Please enable microphone access to use voice features'
                    : permissionState === 'checking'
                    ? 'Please allow microphone access when prompted...'
                    : 'Allow microphone access to enable voice translation and real-time speech recognition'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {permissionState === 'prompt' && (
                <Button
                  size="sm"
                  className="bg-white/20 border border-white/30 text-white hover:bg-white/30 text-xs px-3 py-1"
                  onClick={checkMicrophonePermission}
                >
                  Allow Access
                </Button>
              )}
              
              {permissionState === 'denied' && (
                <Button
                  size="sm"
                  className="bg-white/20 border border-white/30 text-white hover:bg-white/30 text-xs px-3 py-1"
                  onClick={retryPermission}
                >
                  Try Again
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10 p-1"
                onClick={onDismiss}
                title="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar for checking state */}
          {permissionState === 'checking' && (
            <motion.div 
              className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-white/40 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}