# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice Translation Application using OpenAI Realtime API for real-time voice transcription and translation. The app connects to OpenAI's WebSocket API for bidirectional audio streaming, enabling seamless voice-to-voice translation with minimal latency.

## Core Architecture

### OpenAI API Integration - Multiple Approaches

#### 1. Realtime API (Lowest Latency)
- **WebSocket Connection**: Persistent connection to `wss://api.openai.com/v1/realtime`
- **Model**: `gpt-4o-realtime-preview-2024-12-17`
- **Audio Format**: PCM 16-bit, 24kHz sample rate
- **Streaming**: Bidirectional audio streaming with server VAD
- **Use Case**: Real-time conversations, voice agents

#### 2. Chat Completions API with Audio (Balanced)
- **Model**: `gpt-4o-audio-preview`
- **Modalities**: Text and audio input/output
- **Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Use Case**: Audio-based applications with function calling

#### 3. Specialized Audio APIs
- **Transcription**: `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`, `whisper-1`
- **Text-to-Speech**: `gpt-4o-mini-tts`, `tts-1`, `tts-1-hd`
- **Use Case**: Specific audio processing tasks

### Key Services

**RealtimeAPIService** (`/services/realtimeAPIService.ts`)
- Manages WebSocket connection lifecycle
- Handles audio streaming and buffering
- Processes server events and responses
- Implements automatic reconnection with exponential backoff

**OpenAIAudioService** (`/services/openAIAudioService.ts`)
- Chat Completions API with audio support
- Transcription with latest models
- Text-to-speech generation
- Audio-to-audio translation
- Stream transcription support

**AudioProcessor** (`/services/audioProcessor.ts`)
- Converts browser audio to PCM format
- Handles audio chunking and buffering
- Manages playback queue for responses
- Implements audio worklet for low-latency processing

**TranslationService** (`/services/translationService.ts`)
- Intelligent API selection (Realtime vs Chat Completions)
- Manages conversation context
- Handles language detection and switching
- Fallback support for reliability

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## API Configuration

### Environment Variables Required
```
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_OPENAI_REALTIME_URL=wss://api.openai.com/v1/realtime
```

### WebSocket Events Flow
1. **Connection**: Establish WebSocket with authentication
2. **Session Configuration**: Set voice, language, and model parameters
3. **Audio Stream Start**: Begin capturing and sending audio
4. **Server Processing**: Receive transcription and translation
5. **Audio Response**: Stream translated audio back to user
6. **Conversation Management**: Maintain context across turns

## Implementation Patterns

### Audio Streaming
- Use Web Audio API with AudioWorklet for processing
- Implement circular buffer for smooth playback
- Handle network jitter with adaptive buffering
- Support both push-to-talk and continuous modes

### Error Handling
- Automatic reconnection on connection loss
- Graceful degradation when API unavailable
- User-friendly error messages
- Comprehensive logging for debugging

### State Management
- Realtime session state in AppContext
- Audio state managed separately for performance
- WebSocket connection state with status indicators
- Conversation history with optimistic updates

## Key Components

**VoiceInput** (`/components/VoiceInput.tsx`)
- Handles microphone permissions and audio capture
- Displays visual feedback during recording
- Manages push-to-talk and voice activation

**RealtimeTranscription** (`/components/RealtimeTranscription.tsx`)
- Shows live transcription as user speaks
- Displays translation in real-time
- Handles partial and final results

**AudioPlayer** (`/components/AudioPlayer.tsx`)
- Manages translated audio playback
- Provides playback controls
- Handles audio queue management

## Testing Requirements

- Test WebSocket connection stability
- Verify audio quality at different network speeds
- Test language switching during conversation
- Ensure proper cleanup on component unmount
- Test reconnection scenarios
- Verify memory management for long sessions

## Performance Considerations

- Minimize audio processing latency (<100ms)
- Implement efficient audio buffering
- Use Web Workers for heavy processing
- Optimize React re-renders during streaming
- Implement proper cleanup to prevent memory leaks

## Security Notes

- Never expose API keys in client code
- Implement rate limiting for API calls
- Validate and sanitize all user inputs
- Use secure WebSocket connections only
- Implement proper session management