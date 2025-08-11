const { createServer } = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const { parse } = require('url');
const config = require('../ws-proxy.config');
require('dotenv').config({ path: '.env.local' });

const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = isDevelopment ? config.ports.development : config.ports.production;
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_URL = config.openai.realtimeUrl;

if (!OPENAI_API_KEY) {
  console.error('ERROR: OpenAI API key not found in environment variables');
  console.error('Please set NEXT_PUBLIC_OPENAI_API_KEY or OPENAI_API_KEY');
  process.exit(1);
}

// Create HTTP server with health check
const server = createServer((req, res) => {
  // Health check endpoint for monitoring
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy',
      service: 'websocket-proxy',
      domain: config.domain,
      connections: connections.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Map to track client-to-openai connections
const connections = new Map();

wss.on('connection', (clientWs, request) => {
  console.log('Client connected to proxy');
  
  const { query } = parse(request.url, true);
  const model = query.model || 'gpt-4o-realtime-preview-2024-12-17';
  
  // Create connection to OpenAI
  const openaiUrl = `${OPENAI_REALTIME_URL}?model=${model}`;
  
  console.log('Connecting to OpenAI:', openaiUrl);
  
  const openaiWs = new WebSocket(openaiUrl, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });
  
  // Store the connection mapping
  connections.set(clientWs, openaiWs);
  
  // Handle OpenAI connection open
  openaiWs.on('open', () => {
    console.log('Connected to OpenAI Realtime API');
    
    // Send initial connection success to client
    clientWs.send(JSON.stringify({
      type: 'proxy.connected',
      message: 'Connected to OpenAI Realtime API'
    }));
  });
  
  // Forward messages from OpenAI to client
  openaiWs.on('message', (data) => {
    try {
      const message = data.toString();
      console.log('OpenAI -> Client:', message.substring(0, 100) + '...');
      clientWs.send(message);
    } catch (error) {
      console.error('Error forwarding message from OpenAI:', error);
    }
  });
  
  // Forward messages from client to OpenAI
  clientWs.on('message', (data) => {
    try {
      const message = data.toString();
      console.log('Client -> OpenAI:', message.substring(0, 100) + '...');
      
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(message);
      } else {
        console.error('OpenAI WebSocket not ready');
        clientWs.send(JSON.stringify({
          type: 'proxy.error',
          error: 'OpenAI connection not ready'
        }));
      }
    } catch (error) {
      console.error('Error forwarding message to OpenAI:', error);
    }
  });
  
  // Handle OpenAI connection errors
  openaiWs.on('error', (error) => {
    console.error('OpenAI WebSocket error:', error);
    clientWs.send(JSON.stringify({
      type: 'proxy.error',
      error: error.message
    }));
  });
  
  // Handle OpenAI connection close
  openaiWs.on('close', (code, reason) => {
    console.log('OpenAI connection closed:', code, reason.toString());
    connections.delete(clientWs);
    
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'proxy.disconnected',
        code,
        reason: reason.toString()
      }));
      clientWs.close();
    }
  });
  
  // Handle client errors
  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
  });
  
  // Handle client disconnect
  clientWs.on('close', (code, reason) => {
    console.log('Client disconnected:', code, reason);
    
    const openaiConnection = connections.get(clientWs);
    if (openaiConnection && openaiConnection.readyState === WebSocket.OPEN) {
      openaiConnection.close();
    }
    connections.delete(clientWs);
  });
  
  // Heartbeat to keep connections alive
  const heartbeat = setInterval(() => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);
});

server.listen(PORT, () => {
  console.log('========================================');
  console.log('WebSocket Proxy Server Started');
  console.log('========================================');
  console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  
  if (isDevelopment) {
    console.log(`WebSocket URL: ws://localhost:${PORT}`);
  } else {
    console.log(`Production Domain: ${config.domain}`);
    console.log(`WebSocket URL: wss://${config.wsSubdomain}`);
  }
  
  console.log('========================================');
  console.log('Ready to proxy connections to OpenAI Realtime API');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  
  connections.forEach((openaiWs, clientWs) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close();
    }
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.close();
    }
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});