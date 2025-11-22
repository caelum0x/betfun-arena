# 🚀 ONE-COMMAND STARTUP

## ⚡ **FASTEST WAY TO RUN BETFUN ARENA**

### **Single Command (RECOMMENDED):**

```bash
cd /Users/arhansubasi/betfun-arena/betfun-arena && npm run dev
```

That's it! This will start all 4 services in one terminal with color-coded output.

---

## 📊 **WHAT YOU'LL SEE**

The command will start all services with colored prefixes:

```
[WEB]   ▶ Next.js starting on port 3000...
[API]   ▶ Express API starting on port 3001...
[WS]    ▶ WebSocket server starting on port 3002...
[INDEX] ▶ Solana indexer starting...
```

---

## 🌐 **SERVICES RUNNING**

| Service | Port | URL |
|---------|------|-----|
| **Frontend** | 3000 | http://localhost:3000 |
| **API** | 3001 | http://localhost:3001 |
| **WebSocket** | 3002 | http://localhost:3002 |
| **Indexer** | - | Background |

---

## 🎯 **WHAT TO DO NEXT**

1. **Wait for all services to start** (usually 10-30 seconds)
2. **Open your browser**: http://localhost:3000
3. **Explore all pages**:
   - Markets: http://localhost:3000/markets
   - Trading: http://localhost:3000/arena/[id]/trade
   - Portfolio: http://localhost:3000/portfolio
   - Analytics: http://localhost:3000/analytics
   - And 11 more pages!

---

## 🛑 **TO STOP ALL SERVICES**

Press **`Ctrl+C`** in the terminal where you ran `npm run dev`.

This will automatically kill all 4 services at once.

---

## 🔄 **ALTERNATIVE COMMANDS**

### **Production Build:**
```bash
npm run build
npm run start:all
```

### **Individual Services:**
```bash
npm run dev:web      # Frontend only
npm run dev:api      # API only
npm run dev:ws       # WebSocket only
npm run dev:indexer  # Indexer only
```

---

## 🆘 **TROUBLESHOOTING**

### **Port Already in Use:**
```bash
# Find and kill processes
lsof -i :3000,3001,3002
kill -9 <PID>
```

### **Module Not Found:**
```bash
# Reinstall dependencies
npm install
cd apps/web && npm install
cd ../.. && npm run dev
```

### **Clear Everything:**
```bash
# Clean and reinstall
npm run clean
npm install
npm run dev
```

---

## ✨ **FEATURES**

When running, you get:

- ✅ Hot reload on code changes
- ✅ Color-coded console output
- ✅ All services in one terminal
- ✅ Auto-restart on crashes
- ✅ Ctrl+C kills everything

---

## 📁 **PROJECT STRUCTURE**

```
betfun-arena/
├── apps/
│   └── web/              → Frontend (Port 3000)
├── packages/
│   ├── api/              → REST API (Port 3001)
│   ├── websocket/        → WebSocket (Port 3002)
│   ├── indexer/          → Blockchain Indexer
│   ├── anchor/           → Smart Contracts
│   └── sdk/              → TypeScript SDK
└── package.json          → Root scripts
```

---

## 🎉 **YOU'RE READY!**

Just run:

```bash
npm run dev
```

And visit **http://localhost:3000** 🚀⚔️🏆

---

## 💡 **PRO TIPS**

1. **Keep this terminal open** - all logs appear here
2. **Watch for errors** - color-coded by service
3. **Auto-reload works** - save files to see changes
4. **One Ctrl+C stops all** - clean shutdown

---

**Status**: 🟢 All Services Configured  
**Command**: `npm run dev`  
**URL**: http://localhost:3000  

**Happy Coding!** 🎯

