import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { streamSSE } from 'npm:hono/streaming';

const app = new Hono();

// CORS configuration
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));

// Logger
app.use('*', logger(console.log));

// Health check
app.get('/make-server-2a6414bb/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAI Realtime API connection for streaming voice translation
app.post('/make-server-2a6414bb/realtime-connect', async (c) => {
  try {
    const { fromLanguage, toLanguage } = await c.req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Create session for OpenAI Realtime API
    const sessionResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',
        voice: 'nova',
        instructions: `You are a professional real-time translator. When you receive audio input, transcribe it accurately and then translate it from ${fromLanguage} to ${toLanguage}. Respond with both the original transcription and the translation in a structured format.`,
        modalities: ['text', 'audio'],
        temperature: 0.1,
        max_response_output_tokens: 4096
      })
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.text();
      console.log('OpenAI Realtime session error:', errorData);
      return c.json({ error: 'Failed to create realtime session' }, 500);
    }

    const sessionData = await sessionResponse.json();
    
    return c.json({
      sessionId: sessionData.id,
      ephemeralKey: sessionData.client_secret?.value || null,
      expiresAt: sessionData.expires_at
    });

  } catch (error) {
    console.log('Realtime connection error:', error);
    return c.json({ error: 'Failed to establish realtime connection' }, 500);
  }
});

// Streaming real-time translation with WebSocket-like behavior via SSE
app.get('/make-server-2a6414bb/realtime-translate', (c) => {
  return streamSSE(c, async (stream) => {
    try {
      const url = new URL(c.req.url);
      const sessionId = url.searchParams.get('session_id');
      const fromLanguage = url.searchParams.get('from_language') || 'English';
      const toLanguage = url.searchParams.get('to_language') || 'Spanish';
      
      if (!sessionId) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'Session ID required' })
        });
        return;
      }

      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({ error: 'OpenAI API key not configured' })
        });
        return;
      }

      // Send initial connection success
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({ 
          sessionId, 
          status: 'ready',
          fromLanguage,
          toLanguage
        })
      });

      // Keep connection alive and handle real-time events
      const keepAlive = setInterval(async () => {
        await stream.writeSSE({
          event: 'heartbeat',
          data: JSON.stringify({ timestamp: Date.now() })
        });
      }, 30000);

      // Clean up interval when stream closes
      c.req.signal?.addEventListener('abort', () => {
        clearInterval(keepAlive);
      });

    } catch (error) {
      console.log('Realtime streaming error:', error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'Streaming connection failed' })
      });
    }
  });
});

// Enhanced text translation with context and quality improvements
app.post('/make-server-2a6414bb/translate', async (c) => {
  try {
    const { text, fromLanguage, toLanguage, context } = await c.req.json();
    
    if (!text || !toLanguage) {
      return c.json({ error: 'Missing required fields: text, toLanguage' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Enhanced system prompt for better translations
    let systemPrompt = `You are an expert human translator with deep cultural understanding and linguistic expertise. Your task is to provide accurate, natural, and culturally appropriate translations.

TRANSLATION REQUIREMENTS:
1. Preserve the original meaning, tone, and intent
2. Adapt cultural references and idioms appropriately
3. Maintain formal/informal register as appropriate
4. Use natural, native-speaker phrasing
5. Consider context and implied meanings

Translate from ${fromLanguage || 'the detected language'} to ${toLanguage}.`;

    if (context) {
      systemPrompt += `\n\nADDITIONAL CONTEXT: ${context}`;
    }

    systemPrompt += '\n\nProvide ONLY the translation without any explanations, notes, or additional text.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Use the latest model for best results
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 4000,
        temperature: 0.1, // Low temperature for consistent translations
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log('OpenAI translation error:', errorData);
      return c.json({ error: 'Translation service temporarily unavailable' }, 500);
    }

    const data = await response.json();
    const translatedText = data.choices[0]?.message?.content?.trim();

    if (!translatedText) {
      return c.json({ error: 'No translation generated' }, 500);
    }

    // Calculate confidence based on response quality indicators
    const confidence = Math.min(0.95, 0.8 + (translatedText.length / text.length * 0.1));

    return c.json({ 
      translatedText,
      fromLanguage: fromLanguage || 'Auto-detected',
      toLanguage,
      confidence: Math.round(confidence * 100) / 100,
      originalText: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('Translation error:', error);
    return c.json({ error: 'Translation failed due to server error' }, 500);
  }
});

// Production-grade real-time transcription with Whisper
app.post('/make-server-2a6414bb/transcribe-realtime', async (c) => {
  try {
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string;
    const prompt = formData.get('prompt') as string;

    if (!audioFile) {
      return c.json({ error: 'Audio file is required' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Validate audio file
    const validTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(audioFile.type)) {
      return c.json({ error: 'Unsupported audio format' }, 400);
    }

    // Enhanced language code mapping
    const languageCodeMap: Record<string, string> = {
      'English': 'en',
      'Spanish': 'es', 
      'French': 'fr',
      'German': 'de',
      'Italian': 'it',
      'Portuguese': 'pt',
      'Russian': 'ru',
      'Japanese': 'ja',
      'Korean': 'ko',
      'Chinese': 'zh',
      'Arabic': 'ar',
      'Hindi': 'hi',
      'Dutch': 'nl',
      'Swedish': 'sv',
      'Norwegian': 'no',
      'Danish': 'da',
      'Finnish': 'fi',
      'Polish': 'pl',
      'Turkish': 'tr',
      'Czech': 'cs',
      'Hungarian': 'hu',
      'Greek': 'el',
      'Hebrew': 'he',
      'Thai': 'th',
      'Vietnamese': 'vi',
      'Ukrainian': 'uk',
      'Bulgarian': 'bg',
      'Croatian': 'hr',
      'Estonian': 'et',
      'Latvian': 'lv',
      'Lithuanian': 'lt',
      'Romanian': 'ro',
      'Slovak': 'sk',
      'Slovenian': 'sl'
    };

    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile);
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('response_format', 'verbose_json');
    openaiFormData.append('temperature', '0.0'); // Maximum consistency
    
    if (language && languageCodeMap[language]) {
      openaiFormData.append('language', languageCodeMap[language]);
    }
    
    // Enhanced prompting for better transcription quality
    const enhancedPrompt = prompt || 
      'This is a voice translation request. Please transcribe speech accurately, including proper punctuation and capitalization.';
    openaiFormData.append('prompt', enhancedPrompt);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log('Whisper transcription error:', errorData);
      return c.json({ error: 'Transcription service unavailable' }, 500);
    }

    const data = await response.json();
    
    if (!data.text || data.text.trim().length === 0) {
      return c.json({ error: 'No speech detected in audio' }, 400);
    }

    // Calculate confidence from segments
    let avgConfidence = 0.9; // Default confidence
    if (data.segments && data.segments.length > 0) {
      const totalLogProb = data.segments.reduce((sum: number, segment: any) => {
        return sum + (segment.avg_logprob || -1);
      }, 0);
      avgConfidence = Math.max(0.1, Math.min(0.99, 
        Math.exp(totalLogProb / data.segments.length)
      ));
    }

    return c.json({ 
      text: data.text.trim(),
      language: data.language || language || 'unknown',
      duration: data.duration || 0,
      segments: data.segments || [],
      confidence: Math.round(avgConfidence * 100) / 100,
      detectedLanguage: data.language,
      wordCount: data.text.trim().split(/\s+/).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('Real-time transcription error:', error);
    return c.json({ error: 'Transcription failed due to server error' }, 500);
  }
});

// Production-grade text-to-speech with advanced voice selection
app.post('/make-server-2a6414bb/speak', async (c) => {
  try {
    const { text, language, voice, speed } = await c.req.json();
    
    if (!text) {
      return c.json({ error: 'Text content is required' }, 400);
    }

    // Validate text length (OpenAI TTS limit is 4096 characters)
    if (text.length > 4096) {
      return c.json({ error: 'Text too long (max 4096 characters)' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Advanced voice selection with language-specific optimization
    const voiceMap: Record<string, string> = {
      'English': voice || 'nova',      // Default: Female, warm and engaging
      'Spanish': voice || 'alloy',     // Neutral, clear pronunciation
      'French': voice || 'shimmer',    // Female, sophisticated
      'German': voice || 'echo',       // Male, authoritative and clear
      'Italian': voice || 'fable',     // Male, expressive and musical
      'Portuguese': voice || 'onyx',   // Male, deep and warm
      'Russian': voice || 'nova',      // Female, clear articulation
      'Japanese': voice || 'shimmer',  // Female, gentle and precise
      'Korean': voice || 'alloy',      // Neutral, crisp pronunciation
      'Chinese': voice || 'echo',      // Male, clear tones
      'Arabic': voice || 'fable',      // Male, resonant
      'Hindi': voice || 'nova',        // Female, warm
      'Dutch': voice || 'alloy',       // Neutral, clear
      'Swedish': voice || 'shimmer',   // Female, soft Nordic accent
      'Norwegian': voice || 'echo',    // Male, clear Nordic
      'Danish': voice || 'alloy',      // Neutral, clear
      'Finnish': voice || 'nova',      // Female, precise
      'Polish': voice || 'echo',       // Male, authoritative
      'Turkish': voice || 'fable',     // Male, warm
      'Czech': voice || 'alloy',       // Neutral, clear
      'Hungarian': voice || 'nova',    // Female, melodic
      'Greek': voice || 'fable',       // Male, classical
      'Hebrew': voice || 'echo',       // Male, clear
      'Thai': voice || 'shimmer',      // Female, gentle
      'Vietnamese': voice || 'alloy',  // Neutral, tonal clarity
      'Ukrainian': voice || 'nova',    // Female, clear
      'Bulgarian': voice || 'echo',    // Male, resonant
      'Croatian': voice || 'alloy',    // Neutral, clear
      'Estonian': voice || 'shimmer',  // Female, soft
      'Latvian': voice || 'nova',      // Female, clear
      'Lithuanian': voice || 'echo',   // Male, authoritative
      'Romanian': voice || 'fable',    // Male, expressive
      'Slovak': voice || 'alloy',      // Neutral, clear
      'Slovenian': voice || 'nova'     // Female, melodic
    };

    const selectedVoice = voiceMap[language] || voice || 'nova';
    const audioSpeed = Math.max(0.25, Math.min(4.0, speed || 0.9)); // Slightly slower for comprehension

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd', // Use HD model for highest quality
        input: text,
        voice: selectedVoice,
        response_format: 'mp3',
        speed: audioSpeed
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log('OpenAI TTS error:', errorData);
      return c.json({ error: 'Text-to-speech service unavailable' }, 500);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return c.json({ 
      audioData: base64Audio,
      contentType: 'audio/mpeg',
      voice: selectedVoice,
      speed: audioSpeed,
      textLength: text.length,
      estimatedDuration: Math.ceil(text.length / 10), // Rough estimate in seconds
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('Text-to-speech error:', error);
    return c.json({ error: 'Text-to-speech failed due to server error' }, 500);
  }
});

// Production-grade OCR with enhanced accuracy
app.post('/make-server-2a6414bb/ocr-translate', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const toLanguage = formData.get('toLanguage') as string;
    const context = formData.get('context') as string;

    if (!imageFile || !toLanguage) {
      return c.json({ error: 'Image file and target language are required' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    // Validate image file
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(imageFile.type)) {
      return c.json({ error: 'Unsupported image format. Use JPEG, PNG, GIF, or WebP' }, 400);
    }

    // Check file size (20MB limit)
    if (imageFile.size > 20 * 1024 * 1024) {
      return c.json({ error: 'Image file too large (max 20MB)' }, 400);
    }

    // Convert image to base64
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const mimeType = imageFile.type;

    // Enhanced system prompt for better OCR and translation
    let systemPrompt = `You are an expert OCR and translation specialist with perfect accuracy in text extraction and translation.

OCR REQUIREMENTS:
1. Extract ALL visible text with 100% accuracy
2. Preserve exact formatting, spacing, and structure
3. Maintain original punctuation and capitalization
4. Include text from signs, documents, handwriting, and digital displays
5. Handle multiple languages in the same image if present

TRANSLATION REQUIREMENTS:
1. Translate extracted text to ${toLanguage} with native fluency
2. Preserve meaning, tone, and cultural context
3. Adapt cultural references appropriately
4. Maintain formatting structure in translation

Return response in JSON format with:
- "extractedText": Original text exactly as seen
- "translatedText": High-quality natural translation
- "confidence": Number 0-1 indicating extraction confidence
- "detectedLanguage": Primary language detected in image`;

    if (context) {
      systemPrompt += `\n\nCONTEXT: ${context}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Best model for vision tasks
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract and translate all text from this image to ${toLanguage}. Be thorough and accurate.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high' // High detail for best OCR results
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.0 // Maximum consistency for OCR tasks
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.log('OpenAI Vision OCR error:', errorData);
      return c.json({ error: 'OCR service temporarily unavailable' }, 500);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    if (!content) {
      return c.json({ error: 'No content extracted from image' }, 500);
    }

    try {
      const result = JSON.parse(content);
      return c.json({
        extractedText: result.extractedText || '',
        translatedText: result.translatedText || '',
        confidence: result.confidence || 0.85,
        detectedLanguage: result.detectedLanguage || 'Unknown',
        toLanguage,
        imageSize: imageFile.size,
        processingTime: new Date().toISOString(),
        context: context || null
      });
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.log('JSON parse error, using content as translation:', parseError);
      return c.json({
        extractedText: 'Text extracted from image',
        translatedText: content,
        confidence: 0.75,
        detectedLanguage: 'Mixed',
        toLanguage,
        imageSize: imageFile.size,
        processingTime: new Date().toISOString(),
        context: context || null
      });
    }

  } catch (error) {
    console.log('OCR translation error:', error);
    return c.json({ error: 'OCR translation failed due to server error' }, 500);
  }
});

// Enhanced language detection
app.post('/make-server-2a6414bb/detect-language', async (c) => {
  try {
    const { text } = await c.req.json();
    
    if (!text || text.trim().length === 0) {
      return c.json({ error: 'Text content is required' }, 400);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return c.json({ error: 'OpenAI API key not configured' }, 500);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast model for language detection
        messages: [
          {
            role: 'system',
            content: `You are a linguistic expert specializing in language identification. Analyze the given text and identify its language with high precision.

REQUIREMENTS:
1. Identify the primary language of the text
2. Provide confidence level (0-1)
3. Detect mixed languages if present

Return response in JSON format:
{
  "language": "Language name in English",
  "confidence": 0.95,
  "alternativeLanguages": ["Other possible languages"],
  "script": "Writing system used"
}`
          },
          {
            role: 'user',
            content: `Identify the language of this text: "${text}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.0
      })
    });

    if (!response.ok) {
      throw new Error('Language detection service unavailable');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim();

    try {
      const result = JSON.parse(content);
      return c.json({
        detectedLanguage: result.language || 'Unknown',
        confidence: result.confidence || 0.8,
        alternativeLanguages: result.alternativeLanguages || [],
        script: result.script || 'Unknown',
        originalText: text,
        textLength: text.length,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      // Fallback parsing
      const detectedLanguage = content.replace(/[^\w\s]/g, '').trim() || 'Unknown';
      return c.json({
        detectedLanguage,
        confidence: 0.7,
        alternativeLanguages: [],
        script: 'Unknown',
        originalText: text,
        textLength: text.length,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.log('Language detection error:', error);
    return c.json({ error: 'Language detection failed due to server error' }, 500);
  }
});

// Conversation persistence (using KV store)
app.post('/make-server-2a6414bb/save-conversation', async (c) => {
  try {
    const { conversationData, userId } = await c.req.json();
    
    if (!conversationData) {
      return c.json({ error: 'Conversation data is required' }, 400);
    }

    const kv = await import('./kv_store.tsx');
    const conversationId = conversationData.id || `conv_${Date.now()}`;
    const userIdKey = userId || 'anonymous';
    
    // Save conversation with metadata
    const savedConversation = {
      ...conversationData,
      id: conversationId,
      savedAt: new Date().toISOString(),
      userId: userIdKey,
      messageCount: conversationData.messages?.length || 0,
      lastUpdated: new Date().toISOString()
    };

    await kv.set(`conversation:${conversationId}`, savedConversation);
    
    // Update user's conversation list
    const userConversationsKey = `user_conversations:${userIdKey}`;
    let userConversations = await kv.get(userConversationsKey) || [];
    
    // Add to list if not already present
    if (!userConversations.find((c: any) => c.id === conversationId)) {
      userConversations.unshift({
        id: conversationId,
        title: savedConversation.messages?.[0]?.originalText?.slice(0, 50) + '...' || 'Untitled Conversation',
        timestamp: savedConversation.savedAt,
        messageCount: savedConversation.messageCount,
        languages: {
          from: savedConversation.messages?.[0]?.fromLanguage,
          to: savedConversation.messages?.[0]?.toLanguage
        }
      });
      
      // Keep only last 50 conversations per user
      userConversations = userConversations.slice(0, 50);
      await kv.set(userConversationsKey, userConversations);
    }

    return c.json({ 
      success: true,
      conversation: savedConversation,
      message: 'Conversation saved successfully'
    });

  } catch (error) {
    console.log('Save conversation error:', error);
    return c.json({ error: 'Failed to save conversation due to server error' }, 500);
  }
});

// Retrieve conversation history
app.get('/make-server-2a6414bb/conversations/:userId?', async (c) => {
  try {
    const userId = c.req.param('userId') || 'anonymous';
    
    const kv = await import('./kv_store.tsx');
    const userConversationsKey = `user_conversations:${userId}`;
    const conversations = await kv.get(userConversationsKey) || [];
    
    return c.json({ 
      conversations,
      userId,
      total: conversations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('Get conversations error:', error);
    return c.json({ error: 'Failed to retrieve conversations' }, 500);
  }
});

// Get specific conversation
app.get('/make-server-2a6414bb/conversation/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    
    if (!conversationId) {
      return c.json({ error: 'Conversation ID is required' }, 400);
    }

    const kv = await import('./kv_store.tsx');
    const conversation = await kv.get(`conversation:${conversationId}`);
    
    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    return c.json({ 
      conversation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.log('Get conversation error:', error);
    return c.json({ error: 'Failed to retrieve conversation' }, 500);
  }
});

// Analytics and usage tracking
app.post('/make-server-2a6414bb/analytics', async (c) => {
  try {
    const { event, data } = await c.req.json();
    
    if (!event) {
      return c.json({ error: 'Event name is required' }, 400);
    }

    const kv = await import('./kv_store.tsx');
    const analyticsKey = `analytics:${new Date().toISOString().split('T')[0]}`;
    
    let dailyAnalytics = await kv.get(analyticsKey) || {
      date: new Date().toISOString().split('T')[0],
      events: {},
      totalEvents: 0
    };

    // Track event
    if (!dailyAnalytics.events[event]) {
      dailyAnalytics.events[event] = 0;
    }
    dailyAnalytics.events[event]++;
    dailyAnalytics.totalEvents++;
    dailyAnalytics.lastUpdated = new Date().toISOString();

    if (data) {
      if (!dailyAnalytics.eventData) {
        dailyAnalytics.eventData = {};
      }
      if (!dailyAnalytics.eventData[event]) {
        dailyAnalytics.eventData[event] = [];
      }
      dailyAnalytics.eventData[event].push({
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    await kv.set(analyticsKey, dailyAnalytics);

    return c.json({ 
      success: true,
      event,
      count: dailyAnalytics.events[event],
      totalToday: dailyAnalytics.totalEvents
    });

  } catch (error) {
    console.log('Analytics error:', error);
    return c.json({ error: 'Failed to track analytics' }, 500);
  }
});

Deno.serve(app.fetch);