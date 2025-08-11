# Voice Translation App with OpenAI Realtime API

A real-time voice translation application that uses OpenAI's Realtime API for seamless voice-to-voice translation with minimal latency.

## Features

- **Real-time Voice Translation**: Instant translation using OpenAI's Realtime WebSocket API
- **Bidirectional Audio Streaming**: Low-latency audio processing with Web Audio API
- **Multiple Language Support**: Translate between various languages in real-time
- **Voice Activity Detection**: Automatic speech detection with server-side VAD
- **Conversation Mode**: Maintain context across multiple translations
- **Image OCR Translation**: Extract and translate text from images
- **Fallback Support**: Automatic fallback to standard APIs when Realtime API is unavailable

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Audio Processing**: Web Audio API with AudioWorklet support
- **Real-time Communication**: WebSocket connection to OpenAI Realtime API
- **State Management**: React Context API
- **UI Components**: Radix UI primitives with shadcn/ui

## Prerequisites

- Node.js 18+ and npm
- OpenAI API key with access to Realtime API (gpt-4o-realtime-preview)
- Modern browser with Web Audio API support

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Voice-Translation-App-REAL
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your OpenAI API key:
   ```env
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Using the OpenAI Realtime API

### Enabling Realtime Mode

1. Ensure your OpenAI API key is configured in `.env.local`
2. Start the application
3. Check the "Use OpenAI Realtime API (Beta)" toggle
4. Click "Connect" to establish WebSocket connection
5. Grant microphone permissions when prompted
6. Click the microphone button to start real-time translation

### Features in Realtime Mode

- **Live Transcription**: See your speech transcribed in real-time
- **Instant Translation**: Translations appear as you speak
- **Audio Playback**: Hear translated text spoken back automatically
- **Connection Status**: Monitor WebSocket connection health
- **Error Recovery**: Automatic reconnection on connection loss

## Architecture

### Core Services

- **RealtimeAPIService**: Manages WebSocket connection to OpenAI
- **AudioProcessor**: Handles audio capture, conversion, and playback
- **TranslationService**: Coordinates translation flow with fallback support

### Audio Pipeline

1. **Capture**: Microphone audio captured at 24kHz
2. **Processing**: Convert to PCM16 format for OpenAI API
3. **Streaming**: Send audio chunks via WebSocket
4. **Response**: Receive translated audio and text
5. **Playback**: Convert PCM16 back to playable format

### Connection Management

- Automatic reconnection with exponential backoff
- Connection status indicators
- Graceful degradation to standard APIs
- Session persistence across reconnections

## API Configuration

### OpenAI Realtime API Settings

The application uses these default settings:
- **Model**: `gpt-4o-realtime-preview-2024-12-17`
- **Audio Format**: PCM 16-bit, 24kHz
- **Voice**: Alloy (configurable)
- **Temperature**: 0.7
- **VAD**: Server-side with 500ms silence detection

### Customization

You can customize these settings in `services/realtimeAPIService.ts`:
```typescript
const config: RealtimeConfig = {
  apiKey: this.apiKey,
  model: 'gpt-4o-realtime-preview-2024-12-17',
  voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
  temperature: 0.7,
  maxResponseOutputTokens: 4096
};
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
├── components/          # React components
│   ├── RealtimeTranscription.tsx
│   ├── pages/
│   └── ui/
├── services/           # Core services
│   ├── realtimeAPIService.ts
│   ├── audioProcessor.ts
│   └── translationService.ts
├── hooks/              # Custom React hooks
│   └── useRealtimeTranslation.ts
├── context/            # React Context providers
└── types/              # TypeScript type definitions
```

## Troubleshooting

### Connection Issues
- Verify your OpenAI API key has access to Realtime API
- Check browser console for WebSocket errors
- Ensure you're using a supported browser (Chrome, Edge, Firefox)

### Audio Issues
- Grant microphone permissions when prompted
- Check browser audio settings
- Verify audio format compatibility (24kHz PCM16)

### Performance
- Use AudioWorklet-supported browsers for best performance
- Close other audio-intensive applications
- Check network latency to OpenAI servers

## Security Notes

- Never commit `.env.local` with your API key
- Use environment variables for all sensitive data
- Implement rate limiting in production
- Validate and sanitize all user inputs

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.