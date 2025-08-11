'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Mic, MicOff, AlertCircle, CheckCircle, RefreshCw, X } from 'lucide-react';
import { checkMicrophonePermission, requestMicrophonePermission, getMicrophoneInstructions, isSecureContext } from '../utils/microphonePermissions';

interface MicrophonePermissionGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export function MicrophonePermissionGuide({ 
  isOpen, 
  onClose, 
  onPermissionGranted 
}: MicrophonePermissionGuideProps) {
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'checking'>('unknown');
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check permission status on mount and when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  const checkPermission = async () => {
    setPermissionStatus('checking');
    setErrorMessage(null);

    // First check if we're in a secure context
    if (!isSecureContext()) {
      setPermissionStatus('denied');
      setErrorMessage('Microphone access requires a secure connection (HTTPS or localhost)');
      return;
    }

    try {
      const result = await checkMicrophonePermission();
      setPermissionStatus(result.granted ? 'granted' : 'denied');
      
      if (!result.granted && result.error) {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setPermissionStatus('denied');
      setErrorMessage('Unable to check microphone permission');
    }
  };

  const requestPermission = async () => {
    setIsRequesting(true);
    setErrorMessage(null);

    try {
      const result = await requestMicrophonePermission();
      
      if (result.granted) {
        setPermissionStatus('granted');
        onPermissionGranted?.();
        // Auto-close after successful permission grant
        setTimeout(onClose, 1500);
      } else {
        setPermissionStatus('denied');
        setErrorMessage(result.error || 'Permission request failed');
      }
    } catch (error) {
      setPermissionStatus('denied');
      setErrorMessage('Failed to request microphone permission');
    } finally {
      setIsRequesting(false);
    }
  };

  const getBrowserInstructions = () => {
    return getMicrophoneInstructions();
  };

  const getStatusIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'denied':
        return <MicOff className="h-12 w-12 text-red-500" />;
      case 'checking':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <RefreshCw className="h-12 w-12 text-blue-500" />
        </motion.div>;
      default:
        return <Mic className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          title: 'Microphone Access Granted! 🎉',
          message: 'You can now use voice features in Verbio.',
          color: 'text-green-600'
        };
      case 'denied':
        return {
          title: 'Microphone Access Needed',
          message: errorMessage || 'Microphone permission is required for voice translation.',
          color: 'text-red-600'
        };
      case 'checking':
        return {
          title: 'Checking Microphone Access...',
          message: 'Please wait while we check your microphone permissions.',
          color: 'text-blue-600'
        };
      default:
        return {
          title: 'Enable Microphone Access',
          message: 'Verbio needs microphone access for voice translation features.',
          color: 'text-gray-600'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/30 rounded-lg shadow-xl">
            <div className="text-center p-6 pb-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <motion.div 
                className="flex justify-center mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {getStatusIcon()}
              </motion.div>
              
              <h2 className={`text-xl font-medium ${getStatusMessage().color}`}>
                {getStatusMessage().title}
              </h2>
              
              <p className="text-gray-600 text-sm mt-2">
                {getStatusMessage().message}
              </p>
            </div>

            <div className="p-6 pt-0 space-y-4">
              {permissionStatus === 'denied' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Request Permission Button */}
                  <Button
                    onClick={requestPermission}
                    disabled={isRequesting}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    {isRequesting ? (
                      <motion.div className="flex items-center space-x-2">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </motion.div>
                        <span>Requesting Permission...</span>
                      </motion.div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Mic className="h-4 w-4" />
                        <span>Allow Microphone Access</span>
                      </div>
                    )}
                  </Button>

                  {/* Manual Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-2">
                          Manual Setup Instructions:
                        </h4>
                        <ol className="text-sm text-blue-700 space-y-1">
                          {getBrowserInstructions().map((instruction, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-blue-500 font-medium min-w-[1rem]">
                                {index + 1}.
                              </span>
                              <span>{instruction}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Refresh Button */}
                  <Button
                    variant="outline"
                    onClick={checkPermission}
                    className="w-full border-gray-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Permission Again
                  </Button>
                </motion.div>
              )}

              {permissionStatus === 'granted' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <p className="text-green-600 text-sm mb-4">
                    ✅ Perfect! You can now use all voice features.
                  </p>
                  <Button onClick={onClose} className="bg-green-600 hover:bg-green-700 text-white">
                    Start Using Voice Features
                  </Button>
                </motion.div>
              )}

              {permissionStatus === 'checking' && (
                <div className="text-center py-8">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-blue-600 text-sm"
                  >
                    Checking microphone access...
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}