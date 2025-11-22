# BetFun Arena - Deployment Guide

## Prerequisites

- Node.js 20+
- pnpm or bun
- Solana CLI installed
- Anchor 0.30.0+
- Vercel account (for frontend)
- Railway/Render account (for indexer)
- Supabase account (for database)

---

## 1. Smart Contract Deployment

### Step 1: Build Program

```bash
cd packages/anchor/programs/betfun
anchor build
```

### Step 2: Deploy to Mainnet-Beta

```bash
# Set cluster to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Get your wallet balance (need SOL for deployment)
solana balance

# Deploy program
anchor deploy --provider.cluster mainnet-beta

# Save the program ID
PROGRAM_ID=$(solana address -k target/deploy/betfun-keypair.json)
echo "Program ID: $PROGRAM_ID"
```

### Step 3: Update Program ID

Update `packages/anchor/Anchor.toml` and `apps/web/lib/constants.ts` with the deployed program ID.

### Step 4: Initialize Merkle Tree for cNFTs

```bash
# Create Merkle tree for compressed NFTs
# Use Metaplex CLI or SDK
npx @metaplex-foundation/mpl-bubblegum-cli create-tree \
  --rpc-url https://api.mainnet-beta.solana.com \
  --keypair ~/.config/solana/id.json

# Save the tree address
TREE_ADDRESS="<tree-address>"
```

Update `apps/web/lib/constants.ts` with the tree address.

---

## 2. Frontend Deployment (Vercel)

### Step 1: Prepare Environment Variables

Create `.env.production`:

```bash
# Solana
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_PROGRAM_ID=<your-program-id>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Sponsor APIs
NEXT_PUBLIC_INDIE_FUN_API_KEY=<indie-fun-key>
NEXT_PUBLIC_MODDIO_WORLD_ID=<moddio-world-id>
NEXT_PUBLIC_MODDIO_SECRET_KEY=<moddio-secret>
NEXT_PUBLIC_PLAY_SOLANA_API_KEY=<play-solana-key>
NEXT_PUBLIC_PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network

# App URL
NEXT_PUBLIC_APP_URL=https://betfun.arena
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod

# Or connect GitHub repo to Vercel dashboard
# 1. Go to vercel.com
# 2. Import your GitHub repo
# 3. Set root directory to `apps/web`
# 4. Add environment variables
# 5. Deploy
```

### Step 3: Configure Domain

1. Go to Vercel project settings
2. Add custom domain: `betfun.arena`
3. Update DNS records as instructed
4. Enable SSL (automatic)

---

## 3. Indexer Deployment (Railway)

### Step 1: Prepare Dockerfile

The Dockerfile is already in `packages/indexer/Dockerfile`.

### Step 2: Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
cd packages/indexer
railway init

# Set environment variables
railway variables set \
  SOLANA_RPC_URL=https://api.mainnet-beta.solana.com \
  SUPABASE_URL=https://<your-project>.supabase.co \
  SUPABASE_SERVICE_KEY=<service-key> \
  HELIUS_WEBHOOK_SECRET=<webhook-secret> \
  MODDIO_SECRET_KEY=<moddio-secret>

# Deploy
railway up
```

### Step 3: Set Up Helius Webhook

1. Go to Helius dashboard
2. Create webhook for your program ID
3. Set webhook URL to: `https://<your-railway-url>/api/webhook/solana`
4. Add webhook secret to Railway environment variables

---

## 4. Database Setup (Supabase)

### Step 1: Run Migrations

```bash
# Connect to Supabase
cd packages/indexer/supabase

# Run migrations
supabase db push

# Or use Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of migrations/001_init_schema.sql
# 3. Run the SQL
```

### Step 2: Enable Row Level Security (RLS)

RLS policies are included in the migration. Verify they're enabled:

```sql
-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Step 3: Set Up Backups

1. Go to Supabase dashboard
2. Navigate to Database → Backups
3. Enable daily backups
4. Set retention to 30 days

---

## 5. Post-Deployment Checklist

### Frontend
- [ ] Verify all pages load correctly
- [ ] Test wallet connection (Phantom, Solflare)
- [ ] Test arena creation flow
- [ ] Test betting flow
- [ ] Test resolution flow
- [ ] Verify all sponsor integrations work
- [ ] Check mobile responsiveness
- [ ] Test PWA installation

### Smart Contracts
- [ ] Verify program ID is correct
- [ ] Test create_arena instruction
- [ ] Test join_arena instruction
- [ ] Test resolve_arena instruction
- [ ] Test claim_winnings instruction
- [ ] Test mint_trophy instruction
- [ ] Verify PDA derivations

### Indexer
- [ ] Verify webhook is receiving events
- [ ] Check Supabase data is updating
- [ ] Monitor error logs
- [ ] Set up alerts for failures

### Database
- [ ] Verify indexes are created
- [ ] Check query performance
- [ ] Set up monitoring
- [ ] Configure backups

---

## 6. Monitoring & Analytics

### Vercel Analytics
- Enable in Vercel dashboard
- Track page views, performance

### Error Tracking (Optional)
- Set up Sentry account
- Add Sentry SDK to frontend
- Configure error alerts

### Performance Monitoring
- Use Vercel Analytics
- Set up Lighthouse CI
- Monitor Core Web Vitals

---

## 7. Troubleshooting

### Common Issues

**Issue**: Program deployment fails
- **Solution**: Check SOL balance, verify keypair, check network

**Issue**: Frontend can't connect to RPC
- **Solution**: Use Helius or QuickNode RPC endpoint (free tier may be rate-limited)

**Issue**: Indexer not receiving webhooks
- **Solution**: Verify webhook URL, check Helius dashboard, verify secret

**Issue**: Database queries slow
- **Solution**: Add indexes, check query plans, optimize Supabase connection pooling

---

## 8. Production URLs

After deployment, update these in your codebase:

- Frontend: `https://betfun.arena`
- Indexer: `https://indexer.betfun.arena` (or Railway URL)
- Program ID: `<deployed-program-id>`
- Tree Address: `<merkle-tree-address>`

---

## 9. Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] RLS policies are enabled on Supabase
- [ ] Webhook secrets are configured
- [ ] HTTPS is enabled (automatic with Vercel)
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled (if applicable)

---

## 10. Launch Day Checklist

- [ ] All deployments successful
- [ ] All tests passing
- [ ] Monitoring set up
- [ ] Team wallets funded with SOL
- [ ] Create first test arena
- [ ] Verify all sponsor integrations
- [ ] Social media posts ready
- [ ] Press release ready
- [ ] Demo video uploaded

---

**Ready to launch! 🚀**

