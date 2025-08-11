'use client';

import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeftRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectorProps {
  fromLanguage: string;
  toLanguage: string;
  onFromLanguageChange: (language: string) => void;
  onToLanguageChange: (language: string) => void;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
];

export function LanguageSelector({
  fromLanguage,
  toLanguage,
  onFromLanguageChange,
  onToLanguageChange
}: LanguageSelectorProps) {
  const fromLang = languages.find(lang => lang.name === fromLanguage);
  const toLang = languages.find(lang => lang.name === toLanguage);

  const handleSwapLanguages = () => {
    const temp = fromLanguage;
    onFromLanguageChange(toLanguage);
    onToLanguageChange(temp);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* From Language Flag with Dropdown */}
      <motion.div
        className="group"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex flex-col items-center space-y-2">
          <Select value={fromLanguage} onValueChange={onFromLanguageChange}>
            <SelectTrigger className="w-12 h-12 bg-white/25 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg group-hover:bg-white/35 transition-all duration-300 p-0 border-0 flex items-center justify-center">
              <SelectValue>
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-3xl leading-none">{fromLang?.flag}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-md border-white/30 rounded-xl max-h-60 overflow-y-auto">
              {languages.map((language) => (
                <SelectItem 
                  key={language.code} 
                  value={language.name}
                  className="hover:bg-purple-100/50 focus:bg-purple-100/50 rounded-lg mb-1 last:mb-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl leading-none">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors duration-200">
            {fromLanguage}
          </span>
        </div>
      </motion.div>

      {/* Swap Button */}
      <motion.div
        whileHover={{ scale: 1.1, rotate: 180 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwapLanguages}
          className="h-12 w-12 rounded-full bg-white/30 hover:bg-white/40 text-white border border-white/40 shadow-lg backdrop-blur-md"
        >
          <ArrowLeftRight className="h-5 w-5" />
        </Button>
      </motion.div>

      {/* To Language Flag with Dropdown */}
      <motion.div
        className="group"
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex flex-col items-center space-y-2">
          <Select value={toLanguage} onValueChange={onToLanguageChange}>
            <SelectTrigger className="w-12 h-12 bg-white/25 backdrop-blur-md rounded-2xl border border-white/30 shadow-lg group-hover:bg-white/35 transition-all duration-300 p-0 border-0 flex items-center justify-center">
              <SelectValue>
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-3xl leading-none">{toLang?.flag}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-md border-white/30 rounded-xl max-h-60 overflow-y-auto">
              {languages.map((language) => (
                <SelectItem 
                  key={language.code} 
                  value={language.name}
                  className="hover:bg-purple-100/50 focus:bg-purple-100/50 rounded-lg mb-1 last:mb-0"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl leading-none">{language.flag}</span>
                    <span className="font-medium">{language.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-white/70 text-xs font-medium group-hover:text-white transition-colors duration-200">
            {toLanguage}
          </span>
        </div>
      </motion.div>
    </div>
  );
}