# Deployment Guide for Verbio Voice Translation App

## Prerequisites

1. Vercel account (for Next.js app deployment)
2. OpenAI API key with Realtime API access
3. A separate hosting solution for WebSocket proxy (see options below)

## Environment Variables for Vercel

Set these environment variables in your Vercel project settings:

### Required Variables

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_OPENAI_API_KEY` | Your OpenAI API key | `sk-proj-...` |
| `NEXT_PUBLIC_WS_PROXY_URL` | WebSocket proxy URL | `wss://ws.verbio.app` |

### Optional Variables (with defaults)

| Variable Name | Default Value | Description |
|--------------|--------------|-------------|
| `NEXT_PUBLIC_OPENAI_REALTIME_URL` | `wss://api.openai.com/v1/realtime` | OpenAI Realtime API endpoint |
| `NEXT_PUBLIC_OPENAI_MODEL` | `gpt-4o-realtime-preview-2024-12-17` | Model version |
| `NEXT_PUBLIC_OPENAI_VOICE` | `alloy` | Voice for TTS (alloy, echo, shimmer, etc.) |
| `NEXT_PUBLIC_OPENAI_TEMPERATURE` | `0.7` | Response creativity (0.0-1.0) |

## Deployment Steps

### Step 1: Deploy the Next.js App to Vercel

1. **Connect GitHub Repository**
   ```bash
   # If not already connected, push your code to GitHub
   git push origin master
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure project settings

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.production`
   - Select "Production" environment

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Step 2: Deploy the WebSocket Proxy

The WebSocket proxy (`server/websocket-proxy.js`) needs to be deployed separately as Vercel doesn't support WebSocket connections on the free tier.

#### Option A: Deploy to Railway (Recommended)

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)

2. **Deploy WebSocket Proxy**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize new project
   railway init
   
   # Deploy the proxy
   railway up
   ```

3. **Set Environment Variables in Railway**
   ```bash
   railway variables set OPENAI_API_KEY=your_api_key_here
   railway variables set PORT=3001
   ```

4. **Get Public URL**
   - Railway will provide a URL like `wss://your-app.railway.app`
   - Update `NEXT_PUBLIC_WS_PROXY_URL` in Vercel

#### Option B: Deploy to Render

1. **Create `render.yaml`**
   ```yaml
   services:
     - type: web
       name: verbio-ws-proxy
       env: node
       plan: free
       buildCommand: npm install
       startCommand: node server/websocket-proxy.js
       envVars:
         - key: OPENAI_API_KEY
           sync: false
         - key: PORT
           value: 3001
   ```

2. **Deploy to Render**
   - Connect GitHub repository
   - Render will auto-deploy on push

#### Option C: Deploy to Fly.io

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create `fly.toml`**
   ```toml
   app = "verbio-ws-proxy"
   
   [env]
     PORT = "3001"
   
   [experimental]
     allowed_public_ports = []
     auto_rollback = true
   
   [[services]]
     http_checks = []
     internal_port = 3001
     protocol = "tcp"
     script_checks = []
   
     [[services.ports]]
       handlers = ["http", "tls"]
       port = 443
   
     [[services.tcp_checks]]
       grace_period = "1s"
       interval = "15s"
       restart_limit = 0
       timeout = "2s"
   ```

3. **Deploy**
   ```bash
   fly launch
   fly secrets set OPENAI_API_KEY=your_api_key_here
   fly deploy
   ```

### Step 3: Update Production URLs

1. **Update Vercel Environment Variables**
   - Set `NEXT_PUBLIC_WS_PROXY_URL` to your WebSocket proxy URL
   - Example: `wss://verbio-ws-proxy.railway.app`

2. **Redeploy Vercel App**
   - Trigger a new deployment in Vercel
   - Or push a commit to trigger auto-deployment

## Custom Domain Setup (Optional)

### For Vercel (Main App)

1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `verbio.app`)
3. Configure DNS records as instructed

### For WebSocket Proxy

1. **Subdomain Approach** (Recommended)
   - Create subdomain: `ws.verbio.app`
   - Point to your WebSocket proxy service
   - Update `NEXT_PUBLIC_WS_PROXY_URL=wss://ws.verbio.app`

2. **Path-based Routing** (Advanced)
   - Use reverse proxy (Nginx, Cloudflare Workers)
   - Route `/ws-proxy` to WebSocket service
   - Requires additional configuration

## Security Considerations

1. **API Key Security**
   - Never expose API keys in client-side code
   - Use Vercel's encrypted environment variables
   - Rotate keys regularly

2. **CORS Configuration**
   - WebSocket proxy should validate origin
   - Update `websocket-proxy.js` with allowed origins:
   ```javascript
   const allowedOrigins = [
     'https://verbio.app',
     'https://www.verbio.app',
     'https://verbio.vercel.app'
   ];
   ```

3. **Rate Limiting**
   - Implement user-based rate limiting
   - Monitor usage to prevent abuse
   - Consider adding authentication

4. **SSL/TLS**
   - Always use `wss://` for production WebSocket connections
   - Ensure valid SSL certificates

## Monitoring and Debugging

1. **Vercel Dashboard**
   - Monitor function logs
   - Check build logs for errors
   - Review analytics

2. **WebSocket Proxy Logs**
   - Check service provider logs (Railway, Render, etc.)
   - Monitor connection counts
   - Track error rates

3. **Browser Console**
   - Check for WebSocket connection errors
   - Monitor audio streaming issues
   - Verify API responses

## Troubleshooting

### WebSocket Connection Fails
- Check CORS settings in proxy
- Verify SSL certificates
- Ensure proxy is running
- Check firewall rules

### Audio Not Working
- Verify microphone permissions
- Check browser compatibility
- Ensure 24kHz sample rate support
- Test WebSocket data flow

### High Latency
- Consider proxy location (closer to users)
- Optimize audio chunk size
- Check network conditions
- Monitor OpenAI API response times

## Cost Optimization

1. **Vercel**
   - Free tier: 100GB bandwidth/month
   - Monitor usage in dashboard

2. **WebSocket Proxy Hosting**
   - Railway: $5/month for starter
   - Render: Free tier available
   - Fly.io: Free tier with 3 shared VMs

3. **OpenAI API**
   - Realtime API pricing varies
   - Implement usage limits
   - Consider caching for common translations

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/jwillz7667/-verbio-translate/issues)
- Review [OpenAI Realtime API Docs](https://platform.openai.com/docs/api-reference/realtime)
- Contact support for hosting providers