'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { User as UserIcon, HelpCircle, MessageCircle, Settings } from 'lucide-react';
import { User } from '../types';

interface HeaderBarProps {
  conversationMode: boolean;
  onToggleConversationMode: () => void;
  onShowMicrophoneGuide: () => void;
  onShowTips: () => void;
  onUserClick: () => void;
  user: User | null;
}

export function HeaderBar({
  conversationMode,
  onToggleConversationMode,
  onShowMicrophoneGuide,
  onShowTips,
  onUserClick
}: HeaderBarProps) {
  return (
    <motion.header 
      className="flex items-center justify-between p-6"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
    >
      <div className="flex items-center space-x-3">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`text-white/80 hover:text-white ${conversationMode ? 'bg-white/20' : ''}`}
            onClick={onToggleConversationMode}
            title="Toggle conversation mode"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:text-white"
            onClick={onShowMicrophoneGuide}
            title="Microphone settings and permissions"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:text-white"
            onClick={onShowTips}
            title="Tips and help"
          >
            <HelpCircle className="h-6 w-6" />
          </Button>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white/80 hover:text-white"
            onClick={onUserClick}
            title="Account settings"
          >
            <UserIcon className="h-6 w-6" />
          </Button>
        </motion.div>
      </div>
    </motion.header>
  );
}