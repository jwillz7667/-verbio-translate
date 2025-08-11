import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';

interface AudioControlsProps {
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

export function AudioControls({ isListening, setIsListening }: AudioControlsProps) {
  const visualizerRef = useRef<HTMLDivElement>(null);
  const micButtonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (micButtonContainerRef.current) {
        if (isListening) {
          // Enhanced mic button pulsing with GSAP
          gsap.to(micButtonContainerRef.current, {
            boxShadow: "0 0 50px rgba(239, 68, 68, 0.8), 0 0 100px rgba(239, 68, 68, 0.4)",
            duration: 1,
            repeat: -1,
            yoyo: true,
            ease: "power2.inOut"
          });

          // Create dynamic audio bars
          if (visualizerRef.current?.children) {
            const bars = visualizerRef.current.children;
            Array.from(bars).forEach((bar, i) => {
              gsap.to(bar, {
                height: `random(10, 60)`,
                duration: `random(0.3, 0.8)`,
                repeat: -1,
                yoyo: true,
                ease: "power2.inOut",
                delay: i * 0.05
              });
            });
          }
        } else {
          gsap.to(micButtonContainerRef.current, {
            boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)",
            duration: 0.5,
            ease: "power2.out"
          });
        }
      }
    }, micButtonContainerRef);

    return () => ctx.revert();
  }, [isListening]);

  const handleMicClick = () => {
    const newState = !isListening;
    console.log('=== MICROPHONE CLICKED ===');
    console.log('Current isListening:', isListening);
    console.log('New state will be:', newState);
    console.log('========================');
    
    // Add visual feedback for button press
    if (micButtonContainerRef.current) {
      micButtonContainerRef.current.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (micButtonContainerRef.current) {
          micButtonContainerRef.current.style.transform = 'scale(1)';
        }
      }, 100);
    }
    
    // Call the parent function directly
    setIsListening(newState);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Enhanced Main Mic Control */}
      <motion.div
        whileHover={{ 
          scale: 1.08,
          y: -3,
        }}
        whileTap={{ 
          scale: 0.92,
          rotate: isListening ? -5 : 5
        }}
        transition={{ 
          duration: 0.2,
          type: "spring",
          stiffness: 300,
          damping: 20
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Motion div clicked - calling handleMicClick');
          handleMicClick();
        }}
        style={{ cursor: 'pointer' }}
      >
        <div 
          ref={micButtonContainerRef}
          className="rounded-full"
        >
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Button clicked - event triggered');
              handleMicClick();
            }}
            size="lg"
            disabled={false}
            className={`
              relative rounded-full w-28 h-28 border-3 transition-all duration-500 cursor-pointer
              ${isListening 
                ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 border-red-300' 
                : 'bg-gradient-to-br from-white/25 to-white/10 hover:from-white/35 hover:to-white/20 border-white/40'
              }
              backdrop-blur-md text-white shadow-2xl
              before:absolute before:inset-0 before:rounded-full before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-50
            `}
          >
            <AnimatePresence mode="wait">
              {isListening ? (
                <motion.div
                  key="listening"
                  initial={{ scale: 0, rotate: 180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, rotate: -180, opacity: 0 }}
                  transition={{ 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <MicOff className="h-20 w-20 size-20 drop-shadow-lg" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, rotate: 180, opacity: 0 }}
                  transition={{ 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                >
                  <Mic className="h-20 w-20 size-20 drop-shadow-lg" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Pulse Effects */}
            <AnimatePresence>
              {isListening && (
                <>
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400/40 to-red-600/20"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ 
                        scale: [1, 2 + i * 0.3, 3 + i * 0.5], 
                        opacity: [0.6, 0.2, 0] 
                      }}
                      exit={{ scale: 1, opacity: 0 }}
                      transition={{ 
                        duration: 1.5 + i * 0.2, 
                        repeat: Infinity, 
                        ease: "easeOut",
                        delay: i * 0.3
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </motion.div>

      {/* Enhanced Status Text */}
      <AnimatePresence mode="wait">
        <motion.div 
          className="text-center cursor-pointer"
          key={isListening ? 'listening' : 'idle'}
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.9 }}
          whileHover={{ 
            scale: 1.05,
            y: -2
          }}
          whileTap={{
            scale: 0.95
          }}
          onClick={handleMicClick}
          transition={{ 
            duration: 0.4,
            type: "spring",
            stiffness: 150
          }}
        >
          <motion.p 
            className="text-white/90 font-medium text-lg select-none"
            animate={{
              textShadow: isListening 
                ? ["0 0 10px rgba(239, 68, 68, 0.5)", "0 0 20px rgba(239, 68, 68, 0.8)", "0 0 10px rgba(239, 68, 68, 0.5)"]
                : "0 0 5px rgba(255, 255, 255, 0.3)"
            }}
            transition={{
              duration: 1.5,
              repeat: isListening ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            {isListening ? 'Listening... Tap to stop' : 'Tap to start speaking'}
          </motion.p>
          
          {/* Additional visual indicator */}
          {isListening && (
            <motion.div
              className="mt-2 text-xs text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                • Recording •
              </motion.span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Enhanced Audio Visualization */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            ref={visualizerRef}
            className="flex justify-center items-end space-x-1.5 h-20"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.8 }}
            whileHover={{ 
              scale: 1.05,
              y: -5
            }}
            transition={{ 
              duration: 0.5,
              type: "spring",
              stiffness: 120
            }}
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className={`
                  w-2 rounded-full bg-gradient-to-t 
                  ${i % 3 === 0 ? 'from-purple-400 to-pink-400' : 
                    i % 3 === 1 ? 'from-pink-400 to-red-400' : 
                    'from-blue-400 to-purple-400'}
                  shadow-lg cursor-pointer
                `}
                initial={{ height: 4 }}
                animate={{
                  height: [4, Math.random() * 50 + 20, 4],
                  opacity: [0.6, 1, 0.6],
                  boxShadow: [
                    "0 0 5px rgba(147, 51, 234, 0.3)",
                    "0 0 15px rgba(147, 51, 234, 0.8)",
                    "0 0 5px rgba(147, 51, 234, 0.3)"
                  ]
                }}
                whileHover={{ 
                  scale: 1.2,
                  height: Math.random() * 60 + 30
                }}
                transition={{
                  duration: 0.4 + Math.random() * 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.05
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Sound Waves */}
      {isListening && (
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-60 cursor-pointer"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${30 + Math.random() * 40}%`,
              }}
              animate={{
                x: [0, Math.random() * 120 - 60],
                y: [0, Math.random() * 120 - 60],
                scale: [0, 2, 0],
                opacity: [0, 0.8, 0],
              }}
              whileHover={{ 
                scale: 3,
                opacity: 1
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.4
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}