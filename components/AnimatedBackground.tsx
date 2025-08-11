'use client';

import React from 'react';
import { motion } from 'motion/react';

interface AnimatedBackgroundProps {
  children: React.ReactNode;
  isListening?: boolean;
  variant?: 'main' | 'auth' | 'settings';
}

export function AnimatedBackground({ 
  children, 
  isListening = false, 
  variant = 'main' 
}: AnimatedBackgroundProps) {
  const getBackgroundColors = () => {
    switch (variant) {
      case 'auth':
        return {
          base: 'from-slate-900 via-purple-900 to-slate-900',
          intense: 'from-purple-900 via-pink-900 to-blue-900'
        };
      case 'settings':
        return {
          base: 'from-slate-800 via-slate-900 to-purple-900',
          intense: 'from-purple-800 via-pink-800 to-blue-800'
        };
      default:
        return {
          base: 'from-slate-900 via-purple-900 to-slate-900',
          intense: 'from-purple-900 via-pink-900 to-blue-900'
        };
    }
  };

  const colors = getBackgroundColors();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base Background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${colors.base}`}
        animate={{
          background: isListening 
            ? [
                `linear-gradient(to bottom right, ${colors.intense.split(' ').join(', ')})`,
                `linear-gradient(135deg, ${colors.intense.split(' ').join(', ')})`,
                `linear-gradient(225deg, ${colors.intense.split(' ').join(', ')})`,
                `linear-gradient(to bottom right, ${colors.intense.split(' ').join(', ')})`
              ]
            : `linear-gradient(to bottom right, ${colors.base.split(' ').join(', ')})`
        }}
        transition={{
          duration: isListening ? 4 : 2,
          repeat: isListening ? Infinity : 0,
          ease: "easeInOut"
        }}
      />

      {/* Animated Orbs */}
      <div className="absolute inset-0">
        {/* Large Background Orb */}
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(236,72,153,0.2) 50%, transparent 70%)',
            filter: 'blur(40px)',
            top: '20%',
            left: '10%',
          }}
          animate={{
            x: isListening ? [0, 50, -30, 0] : [0, 20, 0],
            y: isListening ? [0, -30, 20, 0] : [0, -10, 0],
            scale: isListening ? [1, 1.2, 0.9, 1] : [1, 1.05, 1],
            opacity: isListening ? [0.3, 0.6, 0.4, 0.3] : [0.2, 0.3, 0.2]
          }}
          transition={{
            duration: isListening ? 6 : 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Medium Background Orb */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(59,130,246,0.3) 50%, transparent 70%)',
            filter: 'blur(30px)',
            top: '60%',
            right: '15%',
          }}
          animate={{
            x: isListening ? [0, -40, 25, 0] : [0, -15, 0],
            y: isListening ? [0, 25, -15, 0] : [0, 10, 0],
            scale: isListening ? [1, 0.8, 1.1, 1] : [1, 0.95, 1],
            opacity: isListening ? [0.4, 0.7, 0.5, 0.4] : [0.3, 0.4, 0.3]
          }}
          transition={{
            duration: isListening ? 5 : 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Small Background Orb */}
        <motion.div
          className="absolute w-32 h-32 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(168,85,247,0.4) 50%, transparent 70%)',
            filter: 'blur(20px)',
            top: '10%',
            right: '30%',
          }}
          animate={{
            x: isListening ? [0, 30, -20, 0] : [0, 10, 0],
            y: isListening ? [0, -20, 30, 0] : [0, 5, 0],
            scale: isListening ? [1, 1.3, 0.7, 1] : [1, 1.1, 1],
            opacity: isListening ? [0.5, 0.8, 0.6, 0.5] : [0.4, 0.5, 0.4]
          }}
          transition={{
            duration: isListening ? 4 : 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Floating Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: `rgba(${
                i % 3 === 0 ? '168,85,247' : 
                i % 3 === 1 ? '236,72,153' : 
                '59,130,246'
              }, 0.6)`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: isListening ? [0.3, 0.8, 0.3] : [0.2, 0.5, 0.2],
              scale: isListening ? [1, 1.5, 1] : [1, 1.2, 1]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
    </div>
  );
}