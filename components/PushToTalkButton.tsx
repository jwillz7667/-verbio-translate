'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PushToTalkButtonProps {
  onStartRecording: () => void;
  onStopRecording: () => void;
  isProcessing?: boolean;
}

export function PushToTalkButton({ onStartRecording, onStopRecording, isProcessing = false }: PushToTalkButtonProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);

  // Handle mouse/touch down - start recording
  const handleStart = useCallback(() => {
    if (isProcessing || isRecordingRef.current) return;
    
    console.log('=== PUSH-TO-TALK: START ===');
    setIsPressed(true);
    isRecordingRef.current = true;
    onStartRecording();
  }, [isProcessing, onStartRecording]);

  // Handle mouse/touch up - stop recording and send
  const handleStop = useCallback(() => {
    if (!isRecordingRef.current) return;
    
    console.log('=== PUSH-TO-TALK: STOP ===');
    setIsPressed(false);
    isRecordingRef.current = false;
    onStopRecording();
  }, [onStopRecording]);

  // Set up event listeners for mouse and touch events
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleStart();
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      handleStop();
    };

    const handleMouseLeave = () => {
      // Stop if mouse leaves while pressed
      if (isRecordingRef.current) {
        console.log('Mouse left button area, stopping...');
        handleStop();
      }
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      handleStart();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      handleStop();
    };

    // Global mouseup to catch releases outside button
    const handleGlobalMouseUp = () => {
      if (isRecordingRef.current) {
        console.log('Global mouse up, stopping...');
        handleStop();
      }
    };

    // Add event listeners
    button.addEventListener('mousedown', handleMouseDown);
    button.addEventListener('mouseup', handleMouseUp);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('touchstart', handleTouchStart);
    button.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);

    // Cleanup
    return () => {
      button.removeEventListener('mousedown', handleMouseDown);
      button.removeEventListener('mouseup', handleMouseUp);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('touchstart', handleTouchStart);
      button.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [handleStart, handleStop]);

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Push-to-Talk Button */}
      <div className="relative">
        <motion.div
          ref={buttonRef}
          className="relative"
          animate={{
            scale: isPressed ? 0.95 : 1,
          }}
          transition={{
            duration: 0.1,
            type: "spring",
            stiffness: 400,
            damping: 25
          }}
        >
          <Button
            size="lg"
            disabled={isProcessing}
            className={`
              relative rounded-full w-32 h-32 border-4 transition-all duration-200 
              select-none touch-none cursor-pointer
              ${isPressed 
                ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-400 shadow-2xl shadow-red-500/50' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-blue-400 shadow-xl'
              }
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
              text-white
            `}
            style={{ 
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none'
            }}
          >
            <AnimatePresence mode="wait">
              {isPressed ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <Mic className="h-12 w-12 mb-1" />
                  <span className="text-xs font-semibold">RECORDING</span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center"
                >
                  <MicOff className="h-12 w-12 mb-1" />
                  <span className="text-xs font-semibold">HOLD TO TALK</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Pulse Effect when Recording */}
          <AnimatePresence>
            {isPressed && !isProcessing && (
              <>
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full bg-red-500/30"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ 
                      scale: [1, 1.5 + i * 0.2, 2 + i * 0.3], 
                      opacity: [0.5, 0.2, 0] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.2
                    }}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Recording Indicator */}
        <AnimatePresence>
          {isPressed && (
            <motion.div
              className="absolute -top-2 -right-2 bg-red-600 rounded-full w-4 h-4"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              exit={{ scale: 0 }}
              transition={{ 
                scale: {
                  duration: 0.8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      <motion.div 
        className="text-center select-none"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-white/90 font-medium text-lg">
          {isProcessing ? (
            <span className="animate-pulse">Processing translation...</span>
          ) : isPressed ? (
            <span className="text-red-300 animate-pulse">🔴 Recording - Release to send</span>
          ) : (
            'Hold button to speak'
          )}
        </p>
        <p className="text-white/60 text-sm mt-1">
          Like a walkie-talkie - press and hold while speaking
        </p>
      </motion.div>

      {/* Visual Feedback */}
      <AnimatePresence>
        {isPressed && (
          <motion.div
            className="flex justify-center items-end space-x-1 h-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-gradient-to-t from-red-500 to-red-300 rounded-full"
                animate={{
                  height: [4, Math.random() * 40 + 10, 4],
                }}
                transition={{
                  duration: 0.3 + Math.random() * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}