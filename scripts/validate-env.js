#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Run this to check if all required environment variables are set
 */

// Load environment variables from .env.local if it exists
const fs = require('fs');
const path = require('path');

// Load .env.local file if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('📁 Loaded environment variables from .env.local\n');
}

// Simple color functions (no external dependencies)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const color = (color, text) => `${colors[color]}${text}${colors.reset}`;
const bold = (text) => `${colors.bright}${text}${colors.reset}`;

// Define required and optional environment variables
const REQUIRED_VARS = [
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'NEXT_PUBLIC_WS_PROXY_URL'
];

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_OPENAI_REALTIME_URL',
  'NEXT_PUBLIC_OPENAI_MODEL',
  'NEXT_PUBLIC_OPENAI_VOICE',
  'NEXT_PUBLIC_OPENAI_TEMPERATURE'
];

const DEFAULTS = {
  NEXT_PUBLIC_OPENAI_REALTIME_URL: 'wss://api.openai.com/v1/realtime',
  NEXT_PUBLIC_OPENAI_MODEL: 'gpt-4o-realtime-preview-2024-12-17',
  NEXT_PUBLIC_OPENAI_VOICE: 'alloy',
  NEXT_PUBLIC_OPENAI_TEMPERATURE: '0.7'
};

console.log(bold(color('blue', '🔍 Validating Environment Variables\n')));

let hasErrors = false;

// Check required variables
console.log(color('yellow', 'Required Variables:'));
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(color('red', `  ❌ ${varName}: NOT SET`));
    hasErrors = true;
  } else {
    // Mask sensitive data
    let displayValue = value;
    if (varName.includes('API_KEY')) {
      displayValue = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    }
    console.log(color('green', `  ✅ ${varName}: ${displayValue}`));
  }
});

// Check optional variables
console.log(color('yellow', '\nOptional Variables:'));
OPTIONAL_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(color('gray', `  ⚪ ${varName}: Using default (${DEFAULTS[varName]})`));
  } else {
    console.log(color('green', `  ✅ ${varName}: ${value}`));
  }
});

// Environment detection
console.log(color('yellow', '\nEnvironment Detection:'));
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

if (isVercel) {
  console.log(color('cyan', '  📦 Running on Vercel'));
} else if (isProduction) {
  console.log(color('magenta', '  🚀 Production environment'));
} else if (isDevelopment) {
  console.log(color('blue', '  💻 Development environment'));
}

// WebSocket proxy validation
console.log(color('yellow', '\nWebSocket Proxy Configuration:'));
const wsProxyUrl = process.env.NEXT_PUBLIC_WS_PROXY_URL;
if (wsProxyUrl) {
  try {
    const url = new URL(wsProxyUrl);
    if (url.protocol === 'wss:' || url.protocol === 'ws:') {
      console.log(color('green', `  ✅ Valid WebSocket URL: ${url.protocol}//${url.host}`));
      
      if (url.protocol === 'ws:' && isProduction) {
        console.log(color('yellow', '  ⚠️  Warning: Using insecure WebSocket in production'));
      }
    } else {
      console.log(color('red', `  ❌ Invalid protocol: ${url.protocol} (expected ws: or wss:)`));
      hasErrors = true;
    }
  } catch (error) {
    console.log(color('red', `  ❌ Invalid URL format: ${wsProxyUrl}`));
    hasErrors = true;
  }
} else {
  console.log(color('red', '  ❌ WebSocket proxy URL not configured'));
}

// API Key validation (basic check)
console.log(color('yellow', '\nAPI Key Validation:'));
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
if (apiKey) {
  if (apiKey.startsWith('sk-')) {
    console.log(color('green', '  ✅ API key format looks valid'));
  } else {
    console.log(color('yellow', '  ⚠️  API key format might be incorrect (should start with sk-)'));
  }
  
  if (apiKey.length < 40) {
    console.log(color('yellow', '  ⚠️  API key seems too short'));
  }
} else {
  console.log(color('red', '  ❌ API key not found'));
}

// Summary
console.log(bold(color('blue', '\n📊 Summary:')));
if (hasErrors) {
  console.log(color('red', '  ❌ Environment validation failed'));
  console.log(color('yellow', '  Please set all required environment variables'));
  process.exit(1);
} else {
  console.log(color('green', '  ✅ All required environment variables are set'));
  console.log(color('cyan', '  Ready for deployment! 🚀'));
}

// Additional tips
console.log(color('gray', '\n💡 Tips:'));
console.log(color('gray', '  - For Vercel deployment, set these in Project Settings → Environment Variables'));
console.log(color('gray', '  - Use different API keys for development and production'));
console.log(color('gray', '  - Always use wss:// for production WebSocket connections'));
console.log(color('gray', '  - Check DEPLOYMENT.md for detailed deployment instructions\n'));