# ✅ Final Deployment Checklist - BetFun Arena

## Status: Ready to Deploy! 🚀

---

## Prerequisites Installed

- [ ] Node.js 20+ or Bun installed
- [ ] Solana CLI installed (`sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`)
- [ ] Anchor CLI installed (`cargo install --git https://github.com/coral-xyz/anchor avm`)
- [ ] Git installed
- [ ] Vercel CLI (optional): `npm i -g vercel`
- [ ] Railway CLI (optional): `npm i -g @railway/cli`

---

## Phase 1: Smart Contract Deployment

### 1.1 Build Contracts
```bash
cd packages/anchor
anchor build
```
**Expected**: Build succeeds, creates `target/deploy/betfun.so`

### 1.2 Configure Wallet
```bash
# Check current wallet
solana address

# Check balance
solana balance

# If devnet, request airdrop
solana config set --url devnet
solana airdrop 2

# For mainnet, ensure you have ~2 SOL for deployment
solana config set --url mainnet-beta
```

### 1.3 Deploy
```bash
# Deploy to devnet first (recommended)
anchor deploy --provider.cluster devnet

# OR deploy to mainnet
anchor deploy --provider.cluster mainnet
```

### 1.4 Save Program ID
```bash
# Get deployed program ID
solana address -k target/deploy/betfun-keypair.json

# SAVE THIS - you'll need it everywhere!
# Example: BetFunArenaPredictionMarketGameV1111111111111
```

**✅ Checkpoint**: Smart contract deployed, Program ID saved

---

## Phase 2: Environment Configuration

### 2.1 Frontend Environment

```bash
cd apps/web
cp .env.example .env.local
```

Edit `.env.local`:
```bash
# REQUIRED
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=<YOUR_PROGRAM_ID_FROM_STEP_1.4>
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>

# REQUIRED for Moddio (or use demo-world as placeholder)
NEXT_PUBLIC_MODDIO_WORLD_ID=<YOUR_MODDIO_WORLD_ID>

# OPTIONAL (for full features)
INDIE_FUN_API_KEY=<YOUR_KEY>
NEXT_PUBLIC_PLAY_SOLANA_PROJECT_ID=<YOUR_PROJECT_ID>
PLAY_SOLANA_API_KEY=<YOUR_KEY>
NEXT_PUBLIC_SENTRY_DSN=<YOUR_DSN>
```

### 2.2 Indexer Environment

```bash
cd packages/indexer
cp .env.example .env
```

Edit `.env`:
```bash
# REQUIRED
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_SERVICE_KEY=<YOUR_SERVICE_KEY>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PROGRAM_ID=<YOUR_PROGRAM_ID_FROM_STEP_1.4>

# REQUIRED for webhooks (add after Helius setup)
HELIUS_WEBHOOK_SECRET=<ADD_AFTER_STEP_5>

# OPTIONAL
INDIE_FUN_API_KEY=<YOUR_KEY>
PLAY_SOLANA_API_KEY=<YOUR_KEY>
SENTRY_DSN=<YOUR_DSN>
PORT=3001
```

### 2.3 Update SDK

Edit `packages/sdk/src/index.ts`:
```typescript
export const PROGRAM_ID = new PublicKey('<YOUR_PROGRAM_ID_FROM_STEP_1.4>');
```

**✅ Checkpoint**: All environment files configured

---

## Phase 3: Database Setup

### 3.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Wait for provisioning (~2 mins)
4. Copy URL and keys to env files

### 3.2 Apply Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Open `packages/indexer/supabase/migrations/001_init_schema.sql`
3. Copy contents and run in SQL Editor
4. Open `packages/indexer/supabase/migrations/002_add_indexes.sql`
5. Copy contents and run in SQL Editor

### 3.3 Verify Tables
Check these tables exist in Supabase:
- [ ] `arenas`
- [ ] `participants`
- [ ] `leaderboard`
- [ ] `processed_transactions`

**✅ Checkpoint**: Database configured and migrations applied

---

## Phase 4: Moddio Setup (Optional but Recommended)

### 4.1 Create Moddio World
1. Go to https://www.moddio.com
2. Sign up / Log in
3. Click "Create World"
4. Copy your World ID
5. Add to `NEXT_PUBLIC_MODDIO_WORLD_ID` in `.env.local`

### 4.2 Configure World (Optional)
- Add custom scripts for event handling
- Design arena visualization
- Configure teams/sides

**Note**: Can use `demo-world` as placeholder if skipping Moddio

**✅ Checkpoint**: Moddio configured (or placeholder set)

---

## Phase 5: Test Locally

### 5.1 Install Dependencies
```bash
# From project root
bun install
```

### 5.2 Start Frontend
```bash
cd apps/web
bun dev
```
**Expected**: Frontend runs on http://localhost:3000

### 5.3 Start Indexer
```bash
# In new terminal
cd packages/indexer
bun dev
```
**Expected**: Indexer runs on http://localhost:3001

### 5.4 Test Flow
1. [ ] Open http://localhost:3000
2. [ ] Connect wallet (use devnet if testing)
3. [ ] Create arena
4. [ ] Join arena with another wallet
5. [ ] Check Moddio iframe loads
6. [ ] Resolve arena (as creator)
7. [ ] Claim winnings (as winner)

**✅ Checkpoint**: Local testing successful

---

## Phase 6: Deploy Frontend (Vercel)

### 6.1 Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 6.2 Deploy via Vercel Dashboard
1. Go to https://vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Configure:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && bun install && cd apps/web && bun run build`
   - Install Command: `bun install`
5. Add all environment variables from `.env.local`
6. Click "Deploy"

### OR Deploy via CLI
```bash
cd apps/web
vercel --prod
```

### 6.3 Verify Deployment
- [ ] Visit deployed URL
- [ ] Connect wallet
- [ ] Test creating arena

**✅ Checkpoint**: Frontend deployed to Vercel

---

## Phase 7: Deploy Indexer (Railway)

### 7.1 Deploy via Railway Dashboard
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select repository
5. Configure:
   - Root Directory: `packages/indexer`
   - Start Command: `bun run start`
6. Add all environment variables from `.env`
7. Deploy

### OR Deploy via CLI
```bash
cd packages/indexer
railway login
railway init
railway up
```

### 7.2 Get Indexer URL
- Copy deployed URL from Railway dashboard
- Example: `https://betfun-indexer.railway.app`

**✅ Checkpoint**: Indexer deployed to Railway

---

## Phase 8: Configure Helius Webhook

### 8.1 Create Helius Account
1. Go to https://dashboard.helius.dev
2. Sign up / Log in
3. Create new webhook

### 8.2 Configure Webhook
- **Webhook URL**: `https://your-indexer.railway.app/webhook/transaction`
- **Webhook Type**: Enhanced Transaction
- **Transaction Types**: All
- **Account Addresses**: Add your Program ID
- **Webhook Secret**: Generate and copy

### 8.3 Update Indexer
1. Go to Railway dashboard
2. Add environment variable:
   - `HELIUS_WEBHOOK_SECRET=<YOUR_SECRET>`
3. Redeploy indexer

**✅ Checkpoint**: Helius webhook configured

---

## Phase 9: Final Verification

### 9.1 Test Production Flow
1. [ ] Visit production frontend (Vercel URL)
2. [ ] Connect wallet
3. [ ] Create arena
4. [ ] Verify arena appears in Supabase
5. [ ] Join arena with another wallet
6. [ ] Check Moddio iframe loads
7. [ ] Check indexer logs in Railway
8. [ ] Resolve arena
9. [ ] Claim winnings
10. [ ] Verify payout received

### 9.2 Check Monitoring
- [ ] Check Vercel logs for errors
- [ ] Check Railway logs for errors
- [ ] Check Supabase logs
- [ ] Check Sentry for errors (if configured)

### 9.3 Health Checks
```bash
# Test indexer health
curl https://your-indexer.railway.app/health

# Expected: {"status":"healthy",...}
```

**✅ Checkpoint**: Production deployment verified

---

## Phase 10: Post-Deployment

### 10.1 Update Documentation
- [ ] Update README with production URLs
- [ ] Document any deployment issues
- [ ] Update API documentation if needed

### 10.2 Monitor First 24 Hours
- [ ] Check for errors in Sentry
- [ ] Monitor transaction volume
- [ ] Watch for unusual activity
- [ ] Verify indexer is syncing

### 10.3 Social Announcement
- [ ] Tweet launch announcement
- [ ] Share in Discord
- [ ] Post on relevant forums
- [ ] Update hackathon submission

**✅ Checkpoint**: BetFun Arena is LIVE! 🎉

---

## Emergency Contacts & Resources

### Troubleshooting
- **Vercel Issues**: Check build logs in dashboard
- **Railway Issues**: Check deployment logs
- **Solana Issues**: Check https://status.solana.com
- **RPC Issues**: Try alternative RPC provider

### Support
- 📖 Docs: `/docs` folder
- 🐛 Issues: GitHub Issues
- 💬 Discord: [Join server](https://discord.gg/betfun)
- 📧 Email: team@betfun.arena

### Key URLs (Update After Deployment)
- **Frontend**: https://_______.vercel.app
- **Indexer**: https://_______.railway.app
- **Program**: https://explorer.solana.com/address/<PROGRAM_ID>

---

## 🎊 Congratulations!

BetFun Arena is now live on Solana mainnet!

**Next Steps**:
- Monitor performance
- Gather user feedback
- Iterate and improve
- Prepare hackathon submission

**Good luck with the Indie.fun Hackathon! ⚔️🚀**

