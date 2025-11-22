# ⚡ BetFun Arena - Quick Start Guide

## 🚀 Run the Entire App in 3 Steps

### Step 1: Install Dependencies

```bash
cd /Users/arhansubasi/betfun-arena/betfun-arena
npm install
```

### Step 2: Setup Environment

Option A: **Interactive Setup** (Recommended)
```bash
npm run setup:env
```

Option B: **Manual Setup** (Quick)
```bash
# Frontend (.env.local)
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=BetFunArenaPredictionMarketGameV1111111111111
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# API Service (.env)
cat > packages/api/.env << 'EOF'
PORT=3001
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
EOF

# WebSocket Service (.env)
cat > packages/websocket/.env << 'EOF'
WS_PORT=3002
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
EOF

# Indexer Service (.env)
cat > packages/indexer/.env << 'EOF'
RPC_URL=https://api.devnet.solana.com
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
REDIS_URL=redis://localhost:6379
HELIUS_API_KEY=
WEBHOOK_URL=http://localhost:3001/webhook
EOF
```

### Step 3: Start All Services

```bash
npm run dev
```

This will start:
- ✅ Frontend at http://localhost:3000
- ✅ API at http://localhost:3001
- ✅ WebSocket at http://localhost:3002
- ✅ Indexer (background)

---

## 📋 Prerequisites Check

### Required Software

```bash
# Check Node.js (need >= 18)
node --version

# Check npm (need >= 9)
npm --version

# Check Redis (optional but recommended)
redis-cli ping
```

### Install Missing Dependencies

```bash
# macOS
brew install node redis

# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm redis-server

# Windows
# Download from nodejs.org and redis.io
```

---

## 🔧 Individual Services

### Frontend Only
```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

### API Only
```bash
cd packages/api
npm install
npm run dev
# API at http://localhost:3001
```

### WebSocket Only
```bash
cd packages/websocket
npm install
npm run dev
# WebSocket at http://localhost:3002
```

### Indexer Only
```bash
cd packages/indexer
npm install
npm run dev
# Runs in background
```

---

## 🐳 Docker Quick Start (Alternative)

```bash
# Build and run all services
docker-compose up

# Or build first
docker-compose build
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down
```

---

## 🎯 Production Build

```bash
# Build everything
npm run build

# Start production servers
npm run start:all
```

---

## ⚠️ Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env files
```

### Redis Not Running

```bash
# Start Redis
redis-server

# Or run in background
redis-server --daemonize yes

# Check if running
redis-cli ping
# Should return: PONG
```

### Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Or for specific workspace
cd apps/web
rm -rf node_modules
npm install
```

### Database Connection Failed

1. Check Supabase credentials in .env files
2. Ensure database schema is deployed
3. Check network connectivity
4. Verify API keys are correct

---

## 📊 Verify Everything is Running

```bash
# Check frontend
curl http://localhost:3000

# Check API
curl http://localhost:3001/health

# Check WebSocket
wscat -c ws://localhost:3002

# Check Redis
redis-cli ping
```

---

## 🎮 First Steps After Startup

1. **Open Browser**: http://localhost:3000
2. **Connect Wallet**: Use Phantom/Solflare
3. **Switch to Devnet**: In wallet settings
4. **Get Test SOL**: Use faucet at https://faucet.solana.com
5. **Create Market**: Click "Create Arena"
6. **Start Trading**: Browse markets and trade!

---

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production
- See [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) for API details
- Review [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql) for database

---

## 🆘 Need Help?

- **Docs**: Check /docs folder
- **Issues**: GitHub Issues
- **Discord**: discord.gg/betfun
- **Email**: support@betfun.arena

---

**Happy Trading! ⚔️🏆**

