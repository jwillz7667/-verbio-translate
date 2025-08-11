import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Search, Clock, Languages, Star, Trash2, Copy, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Translation {
  id: string;
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  timestamp: Date;
  isFavorite: boolean;
  type: 'voice' | 'text';
}

interface TranslationHistoryProps {
  translations: Translation[];
  onDeleteTranslation: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function TranslationHistory({ 
  translations, 
  onDeleteTranslation, 
  onToggleFavorite 
}: TranslationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'voice' | 'text' | 'favorites'>('all');

  // Mock data if no translations provided
  const mockTranslations: Translation[] = [
    {
      id: '1',
      originalText: 'Hello, how are you?',
      translatedText: 'Hola, ¿cómo estás?',
      fromLanguage: 'English',
      toLanguage: 'Spanish',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isFavorite: true,
      type: 'voice'
    },
    {
      id: '2',
      originalText: 'Where is the nearest restaurant?',
      translatedText: 'Où est le restaurant le plus proche?',
      fromLanguage: 'English',
      toLanguage: 'French',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isFavorite: false,
      type: 'text'
    },
    {
      id: '3',
      originalText: 'Thank you very much',
      translatedText: 'Vielen Dank',
      fromLanguage: 'English',
      toLanguage: 'German',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isFavorite: true,
      type: 'voice'
    },
    {
      id: '4',
      originalText: 'Good morning',
      translatedText: 'おはようございます',
      fromLanguage: 'English',
      toLanguage: 'Japanese',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      isFavorite: false,
      type: 'text'
    }
  ];

  const displayTranslations = translations.length > 0 ? translations : mockTranslations;

  const filteredTranslations = displayTranslations.filter(translation => {
    const matchesSearch = 
      translation.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.fromLanguage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.toLanguage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = 
      filterType === 'all' ||
      (filterType === 'favorites' && translation.isFavorite) ||
      (filterType === 'voice' && translation.type === 'voice') ||
      (filterType === 'text' && translation.type === 'text');

    return matchesSearch && matchesFilter;
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const speakText = (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'Spanish' ? 'es-ES' : 
                      language === 'French' ? 'fr-FR' :
                      language === 'German' ? 'de-DE' :
                      language === 'Japanese' ? 'ja-JP' : 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Translation History</h2>
          <p className="text-white/70 mt-1">
            {filteredTranslations.length} translation{filteredTranslations.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
          <Input
            placeholder="Search translations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-2xl h-12 focus:bg-white/25 focus:border-white/50"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: 'All', icon: Languages },
            { key: 'favorites', label: 'Favorites', icon: Star },
            { key: 'voice', label: 'Voice', icon: Volume2 },
            { key: 'text', label: 'Text', icon: Clock }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={filterType === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(key as any)}
              className={`
                whitespace-nowrap rounded-full
                ${filterType === key 
                  ? 'bg-white/30 text-white border-white/50' 
                  : 'bg-white/10 text-white/80 border-white/30 hover:bg-white/20'
                }
              `}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Translations List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredTranslations.map((translation, index) => (
            <motion.div
              key={translation.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="bg-white/20 backdrop-blur-md border-white/30 hover:bg-white/25 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant="secondary" 
                        className={`
                          ${translation.type === 'voice' 
                            ? 'bg-purple-500/20 text-purple-200 border-purple-500/30' 
                            : 'bg-blue-500/20 text-blue-200 border-blue-500/30'
                          }
                        `}
                      >
                        {translation.type === 'voice' ? (
                          <Volume2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {translation.type}
                      </Badge>
                      <span className="text-white/60 text-sm">
                        {formatTimeAgo(translation.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFavorite(translation.id)}
                        className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/20"
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            translation.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''
                          }`} 
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteTranslation(translation.id)}
                        className="h-8 w-8 text-white/60 hover:text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Original Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm font-medium">
                        {translation.fromLanguage}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(translation.originalText)}
                          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speakText(translation.originalText, translation.fromLanguage)}
                          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-white bg-white/10 rounded-xl p-3 border border-white/20">
                      {translation.originalText}
                    </p>
                  </div>

                  {/* Translation Arrow */}
                  <div className="flex justify-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Languages className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  {/* Translated Text */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-sm font-medium">
                        {translation.toLanguage}
                      </span>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(translation.translatedText)}
                          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speakText(translation.translatedText, translation.toLanguage)}
                          className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/20"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-white bg-white/10 rounded-xl p-3 border border-white/20">
                      {translation.translatedText}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTranslations.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Languages className="h-16 w-16 text-white/30 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white/70 mb-2">
            No translations found
          </h3>
          <p className="text-white/50">
            {searchQuery 
              ? 'Try adjusting your search or filters' 
              : 'Start translating to see your history here'
            }
          </p>
        </motion.div>
      )}
    </div>
  );
}