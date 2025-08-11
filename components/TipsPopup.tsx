import React from 'react';
import { Button } from './ui/button';
import { X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TipsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TipsPopup({ isOpen, onClose }: TipsPopupProps) {
  const tips = [
    { 
      icon: '🗣️', 
      title: 'Speak Clearly', 
      description: 'Speak at a normal pace and volume for best translation accuracy',
      color: 'from-blue-400 to-purple-500' 
    },
    { 
      icon: '🤫', 
      title: 'Reduce Background Noise', 
      description: 'Find a quiet environment to improve voice recognition',
      color: 'from-purple-400 to-pink-500' 
    },
    { 
      icon: '🎯', 
      title: 'Select Correct Languages', 
      description: 'Ensure you have selected the right source and target languages',
      color: 'from-pink-400 to-red-500' 
    },
    { 
      icon: '⚡', 
      title: 'Short Phrases Work Best', 
      description: 'Break down long sentences into shorter phrases for better results',
      color: 'from-green-400 to-blue-500' 
    },
    { 
      icon: '🎤', 
      title: 'Hold Device Close', 
      description: 'Keep your device 6-12 inches from your mouth when speaking',
      color: 'from-orange-400 to-pink-500' 
    },
    { 
      icon: '🔄', 
      title: 'Use Swap Feature', 
      description: 'Quickly swap languages using the arrow button in the middle',
      color: 'from-teal-400 to-purple-500' 
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Popup */}
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl z-50 max-h-[80vh] overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Tips for Better Translation</h2>
                  <p className="text-sm text-gray-600">Get the most out of Verbio</p>
                </div>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Tips Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {tips.map((tip, index) => (
                  <motion.div
                    key={index}
                    className="group p-4 rounded-2xl bg-gradient-to-r from-white/40 to-white/20 border border-white/30 hover:from-white/60 hover:to-white/40 transition-all duration-300"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ 
                      scale: 1.02,
                      y: -2,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <div className="flex items-start space-x-4">
                      <motion.div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tip.color} flex items-center justify-center text-white shadow-lg`}
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="text-xl">{tip.icon}</span>
                      </motion.div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{tip.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{tip.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/20">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-2xl shadow-lg"
                >
                  Got it, thanks!
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}