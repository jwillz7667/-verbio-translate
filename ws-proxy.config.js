// WebSocket Proxy Configuration for Production
// Deploy this as a separate service on a WebSocket-capable platform like:
// - Railway.app
// - Render.com
// - Fly.io
// - AWS EC2/ECS
// - Google Cloud Run
// - DigitalOcean App Platform

module.exports = {
  // Production domain
  domain: 'verbio.app',
  
  // WebSocket subdomain for production
  wsSubdomain: 'ws.verbio.app',
  
  // Ports
  ports: {
    development: 3001,
    production: process.env.PORT || 8080
  },
  
  // CORS configuration
  cors: {
    origin: [
      'http://localhost:3000',
      'https://verbio.app',
      'https://www.verbio.app',
      'https://*.verbio.app',
      'https://*.vercel.app' // For preview deployments
    ]
  },
  
  // OpenAI Configuration
  openai: {
    realtimeUrl: 'wss://api.openai.com/v1/realtime',
    defaultModel: 'gpt-4o-realtime-preview-2024-12-17',
    defaultVoice: 'alloy'
  },
  
  // Health check endpoint
  healthCheck: {
    enabled: true,
    path: '/health',
    interval: 30000 // 30 seconds
  },
  
  // Logging
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: 'json'
  },
  
  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxConnections: 10 // Max 10 connections per minute per IP
  }
};