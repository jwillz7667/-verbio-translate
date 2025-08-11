'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { gsap } from 'gsap';

interface ListeningOrbProps {
  isListening: boolean;
}

export function ListeningOrb({ isListening }: ListeningOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const innerOrbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current || !innerOrbRef.current) return;

    const orb = orbRef.current;
    const innerOrb = innerOrbRef.current;

    if (isListening) {
      // Listening animation
      gsap.to(orb, {
        scale: 1.1,
        duration: 0.8,
        ease: "power2.out"
      });

      gsap.to(innerOrb, {
        scale: [1, 1.2, 0.9, 1],
        rotation: 360,
        duration: 2,
        repeat: -1,
        ease: "power2.inOut"
      });

      // Pulsing glow effect
      gsap.to(orb, {
        boxShadow: [
          "0 0 40px rgba(168,85,247,0.6), 0 0 80px rgba(236,72,153,0.4), 0 0 120px rgba(59,130,246,0.2)",
          "0 0 60px rgba(236,72,153,0.8), 0 0 120px rgba(59,130,246,0.6), 0 0 180px rgba(168,85,247,0.4)",
          "0 0 40px rgba(168,85,247,0.6), 0 0 80px rgba(236,72,153,0.4), 0 0 120px rgba(59,130,246,0.2)"
        ],
        duration: 1.5,
        repeat: -1,
        ease: "power2.inOut"
      });

    } else {
      // Reset to idle state
      gsap.to(orb, {
        scale: 1,
        duration: 0.8,
        ease: "power2.out"
      });

      gsap.to(innerOrb, {
        scale: 1,
        rotation: 0,
        duration: 1,
        ease: "power2.out"
      });

      gsap.to(orb, {
        boxShadow: "0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(236,72,153,0.2), 0 0 90px rgba(59,130,246,0.1)",
        duration: 1,
        ease: "power2.out"
      });
    }

    // Cleanup
    return () => {
      gsap.killTweensOf([orb, innerOrb]);
    };
  }, [isListening]);

  return (
    <div className="flex items-center justify-center">
      <motion.div
        ref={orbRef}
        className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full cursor-pointer"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), rgba(168,85,247,0.4), rgba(236,72,153,0.6), rgba(59,130,246,0.8))',
          boxShadow: '0 0 30px rgba(168,85,247,0.3), 0 0 60px rgba(236,72,153,0.2), 0 0 90px rgba(59,130,246,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
      >
        {/* Inner rotating orb - Mobile Responsive */}
        <motion.div
          ref={innerOrbRef}
          className="absolute inset-3 sm:inset-4 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, rgba(168,85,247,0.8), rgba(236,72,153,0.6), rgba(59,130,246,0.8), rgba(168,85,247,0.8))',
            filter: 'blur(1px)',
          }}
        />

        {/* Center highlight - Mobile Responsive */}
        <div 
          className="absolute inset-8 sm:inset-10 lg:inset-12 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          }}
        />

        {/* Surface reflections - Mobile Responsive */}
        <div 
          className="absolute top-4 left-8 sm:top-6 sm:left-10 lg:top-8 lg:left-12 w-12 h-6 sm:w-14 sm:h-7 lg:w-16 lg:h-8 rounded-full opacity-60"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.6), transparent)',
            filter: 'blur(2px)',
          }}
        />
        
        <div 
          className="absolute bottom-8 right-12 sm:bottom-10 sm:right-14 lg:bottom-12 lg:right-16 w-8 h-4 sm:w-10 sm:h-5 lg:w-12 lg:h-6 rounded-full opacity-40"
          style={{
            background: 'linear-gradient(325deg, rgba(255,255,255,0.4), transparent)',
            filter: 'blur(1px)',
          }}
        />

        {/* Listening indicator waves - Mobile Responsive */}
        {isListening && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-white/30"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: [1, 1.3, 1.7],
                  opacity: [0.8, 0.4, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}

        {/* Ambient particles - Mobile Responsive */}
        {Array.from({ length: 4 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 sm:w-2 sm:h-2 bg-white/60 rounded-full"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: isListening ? [0.6, 1, 0.6] : [0.3, 0.6, 0.3],
              scale: isListening ? [1, 1.5, 1] : [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}