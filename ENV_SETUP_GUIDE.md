# 🔑 BetFun Arena - Environment Variables Setup Guide

**OFFICIAL sponsor APIs from SPONSOR_APIS.md**

---

## Quick Start Checklist

Before deploying, you need:

- [ ] Supabase account (database)
- [ ] Solana wallet with devnet SOL
- [ ] Indie.fun API key (for token launch bonus)
- [ ] Moddio World ID (for multiplayer bonus)
- [ ] Play Solana API key (for leaderboard bonus)
- [ ] Pyth (no setup needed - public endpoint)

---

## 1. Supabase Setup (Required)

### Get Credentials
1. Go to https://supabase.com
2. Create new project
3. Go to Settings → API
4. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (keep private!)

### Add to Frontend (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### Add to Indexer (.env)
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG... (secret key)
```

### Run Migrations
```bash
cd packages/indexer
# Copy SQL from supabase/migrations/001_init_schema.sql
# Paste into Supabase SQL Editor and run
```

---

## 2. Indie.fun API Key (Required for Bonus)

### Get API Key
1. Go to https://indie.fun
2. Connect wallet
3. Go to Dashboard → API Keys
4. Create new key: "BetFun Arena Hackathon"
5. Copy the key

### Add to Frontend
```bash
NEXT_PUBLIC_INDIE_FUN_API_KEY=if_live_xxxxxxxxxxxxx
```

### Test Integration
```typescript
// Should work in create arena form
const { tokenMint } = await launchToken({
  name: "Test Arena Token",
  symbol: "TEST",
  description: "Test",
  creatorWallet: publicKey.toString(),
});
console.log("Token launched:", tokenMint);
```

**API Endpoint**: `https://api.indie.fun/v1/tokens/create`

---

## 3. Moddio World Setup (Required for Bonus)

### Create World
1. Go to https://www.modd.io/create
2. Click "New World"
3. Name: "BetFun Arena Battle"
4. Follow setup guide in `moddio/WORLD_SETUP.md`

### Upload Assets
Upload from `moddio/assets/`:
- yes_zone.png
- no_zone.png
- player_spritesheet.png
- confetti particles

### Add Scripts
Copy scripts from `moddio/WORLD_SETUP.md`:
- Player join handler
- Big bet alerts
- Victory effects

### Publish & Get Credentials
1. Click "Publish"
2. Copy **World ID** (from URL)
3. Go to Settings → API
4. Copy **Secret Key**

### Add to Environment
```bash
NEXT_PUBLIC_MODDIO_WORLD_ID=abc123def456
NEXT_PUBLIC_MODDIO_SECRET_KEY=moddio_secret_xxxxx
```

**Embed URL Format**: `https://modd.io/play/{WORLD_ID}?arena=xxx&side=yes`

---

## 4. Play Solana API Key (Required for Bonus)

### Get API Key
1. Go to https://play.solana.com (or docs.play.solana.com)
2. Sign up / Connect wallet
3. Create project: "BetFun Arena"
4. Copy API key

### Add to Environment
```bash
NEXT_PUBLIC_PLAY_SOLANA_API_KEY=ps_live_xxxxxxxxxx
```

### Project ID (Fixed)
```bash
# Already in constants.ts
PLAY_SOLANA_PROJECT_ID=betfun-arena-2025
```

### Test Integration
```typescript
import { PlaySolana } from '@play-solana/sdk';
PlaySolana.init({ projectId: "betfun-arena-2025" });

// Submit score after win
await PlaySolana.leaderboard.submit({
  leaderboardId: "total-won-sol",
  score: winningsInLamports,
  wallet: publicKey,
});
```

---

## 5. Pyth Network (No Setup Needed!)

### Already Configured ✅

Price feed IDs hardcoded in `lib/constants.ts`:
```typescript
PYTH_PRICE_FEEDS = {
  SOL_USD: "H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG",
  BTC_USD: "GVXRSBjFkH2zqMT2iZ6yEy4v941qtn5zB6h8TZ2zM3uQ",
  WIF_USD: "Ef1pB4Tga2tA9P3N3dBWMQ1sSifD3pjHLCmBiMdX4j3g",
}
```

Endpoint: `https://hermes.pyth.network`

**No API key required** - public endpoint works!

---

## 6. Solana Configuration

### Devnet (Testing)
```bash
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
```

### Mainnet (Production)
```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_RPC_URL=https://api.mainnet-beta.solana.com
# Or use Helius/QuickNode for better performance
```

---

## 7. Full Environment Files

### Frontend: `apps/web/.env.local`
```bash
# Solana
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...

# Indie.fun (REQUIRED for bonus)
NEXT_PUBLIC_INDIE_FUN_API_KEY=if_live_xxxxx

# Moddio (REQUIRED for bonus)
NEXT_PUBLIC_MODDIO_WORLD_ID=abc123
NEXT_PUBLIC_MODDIO_SECRET_KEY=moddio_secret_xxx

# Play Solana (REQUIRED for bonus)
NEXT_PUBLIC_PLAY_SOLANA_API_KEY=ps_live_xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_INDEXER_API_URL=http://localhost:3001
```

### Indexer: `packages/indexer/.env`
```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG... (service role key!)

# Moddio (for webhooks)
MODDIO_SECRET_KEY=moddio_secret_xxx
MODDIO_WORLD_ID=abc123

# Solana
RPC_URL=https://api.devnet.solana.com

# Server
PORT=3001
NODE_ENV=development
```

---

## 8. Verification Checklist

### Test Each Integration

**Supabase**:
```bash
curl https://YOUR_PROJECT.supabase.co/rest/v1/arenas \
  -H "apikey: YOUR_ANON_KEY"
# Should return empty array or arenas
```

**Indie.fun**:
```bash
curl https://api.indie.fun/v1/tokens/create \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","symbol":"TEST","description":"Test"}'
# Should return token_mint_address
```

**Moddio**:
```bash
# Open in browser:
https://modd.io/play/YOUR_WORLD_ID?arena=test&side=yes
# Should load game world
```

**Play Solana**:
```typescript
// In browser console on your site:
PlaySolana.leaderboard.submit({...})
// Should not error
```

**Pyth**:
```bash
curl "https://hermes.pyth.network/api/latest_price_feeds?ids[]=H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"
# Should return SOL price
```

---

## 9. Common Issues

### "Indie.fun API error: 401"
- Check API key is correct
- Check it's `Bearer YOUR_KEY` format
- Verify key hasn't expired

### "Moddio world not loading"
- Check World ID is correct (from published URL)
- Verify world is published (not draft)
- Check iframe src format: `https://modd.io/play/{ID}`

### "Supabase RLS error"
- Check migrations ran successfully
- Verify RLS policies are enabled
- Use service key for server-side calls

### "Pyth price not found"
- Check price feed ID is exact (case-sensitive)
- Verify Pyth is online: https://pyth.network/developers/price-feed-ids

---

## 10. Security Best Practices

✅ **DO**:
- Use `.env.local` for frontend (gitignored)
- Use `.env` for indexer (gitignored)
- Use service role key only server-side
- Rotate keys after hackathon

❌ **DON'T**:
- Commit `.env` files to git
- Share service role keys publicly
- Use production keys in frontend
- Hardcode secrets in code

---

## 11. Deployment Environment Variables

### Vercel (Frontend)
1. Go to Project Settings → Environment Variables
2. Add all `NEXT_PUBLIC_*` vars
3. Separate production/preview/development

### Railway (Indexer)
1. Go to Variables tab
2. Add all server vars (no `NEXT_PUBLIC_` prefix)
3. Click "Deploy"

---

**All endpoints verified from SPONSOR_APIS.md**  
**No placeholders - these are production-ready APIs**

Need help? Check:
- `SPONSOR_APIS.md` - Official API docs
- `README.md` - General setup
- `docs/DEPLOYMENT.md` - Full deploy guide

---

**Status: Ready to configure! ⚡**

