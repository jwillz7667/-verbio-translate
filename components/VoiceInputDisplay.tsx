'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Mic, X } from 'lucide-react';

interface VoiceInputDisplayProps {
  isListening: boolean;
  isVoiceInput: boolean;
  speechRecognitionText: string;
  onStop: () => void;
}

export function VoiceInputDisplay({
  isListening,
  speechRecognitionText,
  onStop
}: VoiceInputDisplayProps) {
  return (
    <motion.div 
      className="w-full max-w-2xl mb-8"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ 
        duration: 0.5,
        type: "spring",
        stiffness: 100
      }}
    >
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center space-x-3"
          >
            <Mic className="h-6 w-6 text-red-400" />
            <span className="text-white/90 font-medium">
              {isListening ? '🎤 Listening...' : '🔴 Recording...'}
            </span>
          </motion.div>
        </div>
        
        {speechRecognitionText ? (
          <motion.div
            className="bg-white/15 rounded-2xl p-4 border-l-4 border-blue-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-white text-lg italic leading-relaxed">
              &ldquo;{speechRecognitionText}&rdquo;
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-4"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-white/70">
              🗣️ Speak clearly for real-time recognition...
            </p>
          </motion.div>
        )}
        
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            size="sm"
            className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            onClick={onStop}
          >
            <X className="h-4 w-4 mr-2" />
            Stop Recording
          </Button>
        </div>
      </div>
    </motion.div>
  );
}