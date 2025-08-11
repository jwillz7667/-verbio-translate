import { TranslationResult, OCRResult } from '../types';

export class TranslationService {
  private static async getApiCredentials() {
    const { projectId, publicAnonKey } = await import('../utils/supabase/info');
    return { projectId, publicAnonKey };
  }

  static async translateText(
    text: string, 
    fromLang: string, 
    toLang: string, 
    context?: string
  ): Promise<TranslationResult> {
    const startTime = Date.now();
    
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          fromLanguage: fromLang,
          toLanguage: toLang,
          context: context || `Real-time voice translation from ${fromLang} to ${toLang}`
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Translation API error:', response.status, errorData);
        throw new Error(`Translation failed with status ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;
      
      if (!data.translatedText) {
        throw new Error('No translation received from API');
      }

      return {
        translatedText: data.translatedText,
        confidence: data.confidence || 0.9,
        detectedLanguage: data.fromLanguage,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Translation error:', error);
      
      // Return a meaningful error message instead of crashing
      return {
        translatedText: `Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        confidence: 0,
        processingTime
      };
    }
  }

  static async detectLanguage(text: string): Promise<string> {
    try {
      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/detect-language`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error('Language detection failed');
      }

      const data = await response.json();
      return data.detectedLanguage || 'Unknown';
      
    } catch (error) {
      console.error('Language detection error:', error);
      return 'Unknown';
    }
  }

  static async translateImage(file: File, toLanguage: string, context?: string): Promise<OCRResult> {
    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('Image file too large (max 20MB)');
      }

      const { projectId, publicAnonKey } = await this.getApiCredentials();
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('toLanguage', toLanguage);
      formData.append('context', context || `Translate any text found in this image to ${toLanguage}. Maintain formatting and structure.`);
      
      console.log('Processing image for OCR and translation...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-2a6414bb/ocr-translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR API error:', response.status, errorText);
        throw new Error(`OCR failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('OCR result:', data);
      
      return {
        extractedText: data.extractedText || 'Text from image',
        translatedText: data.translatedText || 'No translation available',
        confidence: data.confidence || 0.8,
        detectedLanguage: data.detectedLanguage || 'Detected',
        toLanguage
      };
      
    } catch (error) {
      console.error('Image OCR error:', error);
      throw error;
    }
  }
}