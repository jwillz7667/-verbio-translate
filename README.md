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

## Deployment to Vercel

### Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/Voice-Translation-App-REAL&env=NEXT_PUBLIC_OPENAI_API_KEY&envDescription=OpenAI%20API%20Key%20for%20Realtime%20Translation&project-name=verbio-voice-translation&repository-name=verbio-voice-translation)

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   # or
   npm install --save-dev vercel
   ```

2. **Link to Vercel Project**
   ```bash
   npm run vercel:link
   ```
   Select or create a new project named `verbio-voice-translation`

3. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_OPENAI_API_KEY
   ```
   Enter your OpenAI API key when prompted

4. **Deploy to Production**
   ```bash
   npm run deploy
   ```
   This will deploy to https://verbio.app

### Domain Configuration

The app is configured to use the custom domain `verbio.app`. To set this up:

1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to "Domains"
4. Add `verbio.app` as a custom domain
5. Follow Vercel's instructions to configure DNS:
   - Add an A record pointing to `76.76.21.21`
   - Add a CNAME record for `www` pointing to `cname.vercel-dns.com`

### Deployment Scripts

- `npm run deploy` - Deploy to production (verbio.app)
- `npm run deploy:preview` - Deploy a preview version
- `npm run vercel:env` - Pull environment variables locally
- `npm run vercel:dev` - Run Vercel development server
- `npm run vercel:link` - Link local project to Vercel

### Environment Variables on Vercel

Required environment variables:
- `NEXT_PUBLIC_OPENAI_API_KEY` - Your OpenAI API key
- `NEXT_PUBLIC_OPENAI_REALTIME_URL` - WebSocket URL (optional, defaults to production)
- `NEXT_PUBLIC_OPENAI_MODEL` - Model to use (optional)
- `NEXT_PUBLIC_OPENAI_VOICE` - Default voice (optional)

### Security Headers

The deployment includes security headers configured in `vercel.json`:
- CORS policies for API routes
- XSS protection
- Content-Type options
- Frame options to prevent clickjacking
- Referrer policy
- Permissions policy for microphone access

### Performance Optimization

- Deployed to `iad1` region (US East) for low latency
- Function timeout set to 30 seconds for audio processing
- Automatic HTTPS and HTTP/2
- Edge caching for static assets

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.