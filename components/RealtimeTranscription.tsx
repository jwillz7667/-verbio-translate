import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useRealtimeTranslation } from '../hooks/useRealtimeTranslation';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';

interface RealtimeTranscriptionProps {
  fromLanguage: string;
  toLanguage: string;
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
  autoStart?: boolean;
  className?: string;
}

export function RealtimeTranscription({
  fromLanguage,
  toLanguage,
  onTranscription,
  onTranslation,
  autoStart = false,
  className = ''
}: RealtimeTranscriptionProps) {
  const {
    isConnected,
    isRecording,
    isProcessing,
    currentTranscription,
    currentTranslation,
    error,
    connectionStatus,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    requestMicrophonePermission,
    canRecord
  } = useRealtimeTranslation({
    autoConnect: autoStart,
    onTranscription,
    onTranslation
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    if (autoStart && isConnected && hasPermission) {
      startRecording(fromLanguage, toLanguage);
    }
  }, [autoStart, isConnected, hasPermission, fromLanguage, toLanguage, startRecording]);

  const handleStartRecording = async () => {
    if (!hasPermission) {
      const granted = await requestMicrophonePermission();
      setHasPermission(granted);
      if (!granted) return;
    }

    if (!isConnected) {
      setIsInitializing(true);
      await connect();
      setIsInitializing(false);
    }

    await startRecording(fromLanguage, toLanguage);
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleToggleConnection = async () => {
    if (isConnected) {
      disconnect();
    } else {
      setIsInitializing(true);
      await connect();
      setIsInitializing(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
            {getConnectionStatusIcon()}
            <span className="text-sm font-medium">
              {connectionStatus === 'connected' ? 'Connected to OpenAI' : 
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'error' ? 'Connection Error' : 'Disconnected'}
            </span>
          </span>
        </div>
        <Button
          variant={isConnected ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggleConnection}
          disabled={isInitializing || connectionStatus === 'connecting'}
        >
          {isInitializing || connectionStatus === 'connecting' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            'Disconnect'
          ) : (
            'Connect'
          )}
        </Button>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Controls */}
      <Card className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Microphone Button */}
          <motion.button
            className={`relative p-8 rounded-full transition-all ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : canRecord
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={!canRecord && !isRecording}
            whileHover={canRecord || isRecording ? { scale: 1.05 } : {}}
            whileTap={canRecord || isRecording ? { scale: 0.95 } : {}}
          >
            {isRecording ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
            
            {/* Recording Animation */}
            {isRecording && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
          </motion.button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRecording ? 'Recording... Click to stop' : 
               canRecord ? 'Click to start recording' : 
               isConnected ? 'Preparing...' : 'Connect to start'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {fromLanguage} → {toLanguage}
            </p>
          </div>
        </div>
      </Card>

      {/* Transcription Display */}
      <AnimatePresence>
        {(currentTranscription || isProcessing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Original ({fromLanguage})
                  </h3>
                  {isProcessing && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                </div>
                <p className="text-base">
                  {currentTranscription || (
                    <span className="text-gray-400 italic">Listening...</span>
                  )}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation Display */}
      <AnimatePresence>
        {currentTranslation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Translation ({toLanguage})
                  </h3>
                  <Volume2 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-base text-blue-900 dark:text-blue-100">
                  {currentTranslation}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicators */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-2">
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-blue-500 rounded-full"
                animate={{
                  height: ['16px', '24px', '16px'],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Processing audio...
          </span>
        </div>
      )}
    </div>
  );
}