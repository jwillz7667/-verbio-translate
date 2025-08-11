'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText } from 'lucide-react';

interface LoadingOverlaysProps {
  extractingText: boolean;
}

export function LoadingOverlays({ extractingText }: LoadingOverlaysProps) {
  return (
    <AnimatePresence>
      {extractingText && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-center max-w-sm mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FileText className="h-12 w-12 text-purple-500 mx-auto mb-4" />
            </motion.div>
            <h3 className="text-lg mb-2 font-medium">🔍 Analyzing Image</h3>
            <p className="text-gray-600 text-sm">Extracting and translating text...</p>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-2 bg-purple-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}