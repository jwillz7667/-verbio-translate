'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Mic, Camera, Keyboard } from 'lucide-react';

interface BottomInputProps {
  placeholder: string;
  disabled: boolean;
  isVoiceInput: boolean;
  isListening: boolean;
  isProcessing: boolean;
  extractingText: boolean;
  onTextSubmit: (text: string) => void;
  onVoiceInput: () => void;
  onImageUpload: () => void;
  onKeyboardFocus: () => void;
}

export function BottomInput({
  placeholder,
  disabled,
  isVoiceInput,
  isListening,
  isProcessing,
  extractingText,
  onTextSubmit,
  onVoiceInput,
  onImageUpload,
  onKeyboardFocus
}: BottomInputProps) {
  return (
    <motion.div 
      className="p-6"
      initial={{ opacity: 0, y: 50 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: (isVoiceInput || isListening) ? 0.95 : 1
      }}
      transition={{ 
        duration: 0.8, 
        delay: 1,
        type: "spring",
        stiffness: 80
      }}
    >
      <motion.div 
        className="relative"
        whileHover={{ scale: 1.01 }}
        whileFocus={{ scale: 1.02 }}
      >
        <Input 
          placeholder={placeholder}
          className="w-full bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/70 rounded-3xl py-6 px-6 pr-16 transition-all duration-300 focus:bg-white/25 focus:border-white/50"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim() && !isProcessing) {
              onTextSubmit(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex space-x-2">
          {/* Voice Input Button */}
          <motion.div whileHover={{ scale: 1.2, rotate: 5 }} whileTap={{ scale: 0.9 }}>
            <Button 
              size="icon" 
              variant="ghost" 
              className={`h-8 w-8 hover:text-white disabled:opacity-50 transition-colors duration-200 ${
                (isVoiceInput || isListening) ? 'text-red-400 bg-red-400/20' : 'text-white/70'
              }`}
              disabled={isProcessing || extractingText}
              onClick={onVoiceInput}
              title={(isVoiceInput || isListening) ? "Stop recording" : "Start voice input"}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Image Upload Button */}
          <motion.div whileHover={{ scale: 1.2, rotate: 5 }} whileTap={{ scale: 0.9 }}>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white/70 hover:text-white disabled:opacity-50"
              disabled={isProcessing || extractingText}
              onClick={onImageUpload}
              title="Upload image to translate text"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </motion.div>

          {/* Keyboard Focus Button */}
          <motion.div whileHover={{ scale: 1.2, rotate: 5 }} whileTap={{ scale: 0.9 }}>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-white/70 hover:text-white disabled:opacity-50"
              disabled={isProcessing || extractingText}
              onClick={onKeyboardFocus}
              title="Focus text input"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}