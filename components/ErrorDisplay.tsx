'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { AlertCircle, X } from 'lucide-react';

interface ErrorDisplayProps {
  speechError: string | null;
  onDismiss: () => void;
  onFixMicrophone?: () => void;
}

export function ErrorDisplay({
  speechError,
  onDismiss,
  onFixMicrophone
}: ErrorDisplayProps) {
  if (!speechError) return null;

  const isPermissionError = speechError.toLowerCase().includes('permission') || 
                           speechError.toLowerCase().includes('microphone');

  return (
    <AnimatePresence>
      <motion.div
        className="fixed top-4 right-4 z-50 max-w-sm"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Voice Input Error
              </h4>
              <p className="text-sm text-red-700 mb-2">{speechError}</p>
              {isPermissionError && onFixMicrophone && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white border-red-300 text-red-700 hover:bg-red-50"
                  onClick={onFixMicrophone}
                >
                  🔧 Fix Microphone
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 ml-2 self-start"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}