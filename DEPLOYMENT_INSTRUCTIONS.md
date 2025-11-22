# 🚀 Deployment Instructions - BetFun Arena

## Quick Deploy Checklist

1. ✅ Build and deploy smart contracts to Solana
2. ✅ Update frontend with deployed program ID
3. ✅ Configure Moddio integration
4. ✅ Deploy frontend to Vercel
5. ✅ Deploy indexer to Railway
6. ✅ Test the complete flow

---

## Step 1: Deploy Smart Contracts

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build & Deploy

```bash
# Navigate to anchor directory
cd packages/anchor

# Build the program
anchor build

# Deploy to devnet (for testing)
solana config set --url devnet
solana airdrop 2
anchor deploy --provider.cluster devnet

# OR Deploy to mainnet (for production)
solana config set --url mainnet-beta
anchor deploy --provider.cluster mainnet
```

### Get Program ID
```bash
# After deployment, get the program ID
solana address -k target/deploy/betfun-keypair.json

# Or use the declared ID
# BetFunArenaPredictionMarketGameV1111111111111
```

---

## Step 2: Update Frontend with Program ID

### Update Environment Variables

Create/update `apps/web/.env.local`:

```bash
# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_PROGRAM_ID=<YOUR_DEPLOYED_PROGRAM_ID>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<YOUR_SUPABASE_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>

# Indie.fun
NEXT_PUBLIC_INDIE_FUN_API_URL=https://api.indie.fun
INDIE_FUN_API_KEY=<YOUR_API_KEY>

# Moddio
NEXT_PUBLIC_MODDIO_WORLD_ID=<YOUR_MODDIO_WORLD_ID>

# Play Solana
NEXT_PUBLIC_PLAY_SOLANA_PROJECT_ID=<YOUR_PROJECT_ID>
PLAY_SOLANA_API_KEY=<YOUR_API_KEY>

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=<YOUR_SENTRY_DSN>
```

---

## Step 3: Configure Moddio Integration

### 1. Create Moddio World

1. Go to [Moddio.com](https://www.moddio.com)
2. Create a new world/game
3. Copy your World ID
4. Configure game settings for BetFun Arena

### 2. Update Moddio Configuration

The frontend is already configured to use Moddio. Just update your World ID in `.env.local`:

```bash
NEXT_PUBLIC_MODDIO_WORLD_ID=your_world_id_here
```

### 3. Moddio World Setup

In your Moddio world, you'll need to:

1. **Setup Arena Visualization**
   - Create two teams/sides for "Yes" and "No" outcomes
   - Add visual representations for participants
   - Configure animations for bets

2. **Configure Event Listeners**
   - The frontend sends these events:
     - `bigbet` - When a large bet is placed
     - `resolution` - When arena is resolved
     - `whale` - When a whale joins

3. **Add Custom Scripts** (Optional)
   ```javascript
   // In Moddio editor, add listener for custom events
   ige.on('bigbet', function(data) {
     // Show big bet animation
     console.log('Big bet:', data);
   });
   
   ige.on('resolution', function(data) {
     // Show winner celebration
     console.log('Arena resolved:', data);
   });
   
   ige.on('whale', function(data) {
     // Show whale entrance
     console.log('Whale joined:', data);
   });
   ```

---

## Step 4: Update SDK with Program ID

Update `packages/sdk/src/index.ts`:

```typescript
import { PublicKey } from '@solana/web3.js';

// Update this with your deployed program ID
export const PROGRAM_ID = new PublicKey('BetFunArenaPredictionMarketGameV1111111111111');

// Or use environment variable
// export const PROGRAM_ID = new PublicKey(
//   process.env.NEXT_PUBLIC_PROGRAM_ID || 'BetFunArenaPredictionMarketGameV1111111111111'
// );
```

---

## Step 5: Test Locally

```bash
# Install dependencies
bun install

# Start frontend
cd apps/web
bun dev

# In another terminal, start indexer
cd packages/indexer
bun dev
```

Navigate to `http://localhost:3000` and test:
1. Connect wallet
2. Create an arena
3. Join an arena
4. Verify Moddio iframe loads
5. Resolve arena (as creator)
6. Claim winnings

---

## Step 6: Deploy Frontend (Vercel)

### Via CLI
```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Via GitHub
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main

### Environment Variables in Vercel
Set all variables from `.env.local` in Vercel dashboard:
- Project Settings → Environment Variables
- Add each variable for Production, Preview, and Development

---

## Step 7: Deploy Indexer (Railway)

### Via CLI
```bash
cd packages/indexer

# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Via GitHub
1. Push code to GitHub
2. Create new project in Railway
3. Connect GitHub repository
4. Select `packages/indexer` as root directory
5. Configure environment variables
6. Deploy

### Environment Variables in Railway
```bash
SUPABASE_URL=<YOUR_SUPABASE_URL>
SUPABASE_SERVICE_KEY=<YOUR_SERVICE_KEY>
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
HELIUS_WEBHOOK_SECRET=<YOUR_SECRET>
INDIE_FUN_API_KEY=<YOUR_KEY>
PLAY_SOLANA_API_KEY=<YOUR_KEY>
SENTRY_DSN=<YOUR_DSN>
PORT=3001
```

---

## Step 8: Configure Helius Webhook

1. Go to [Helius Dashboard](https://dashboard.helius.dev)
2. Create a new webhook
3. Configure:
   - **Webhook URL**: `https://your-indexer.railway.app/webhook/transaction`
   - **Webhook Type**: Enhanced Transaction
   - **Transaction Types**: All
   - **Account Addresses**: Add your deployed program ID
   - **Webhook Secret**: Generate and save to Railway env vars

---

## Step 9: Database Setup

### Apply Migrations
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase dashboard
# Copy contents of packages/indexer/supabase/migrations/*.sql
# Run in SQL Editor
```

### Verify Tables
Check that these tables exist:
- `arenas`
- `participants`
- `leaderboard`
- `processed_transactions`

---

## Step 10: Verification

### Test Complete Flow
1. **Create Arena**
   - Connect wallet on frontend
   - Create a test arena
   - Verify it appears in database
   - Check Moddio iframe loads

2. **Join Arena**
   - Use another wallet
   - Join the arena
   - Verify transaction succeeds
   - Check Moddio shows both participants

3. **Moddio Events**
   - Place a large bet (>1 SOL)
   - Verify `bigbet` event fires in Moddio
   - Check console for event logs

4. **Resolve Arena**
   - As creator, resolve arena
   - Verify resolution appears in Moddio
   - Check winner outcome is correct

5. **Claim Winnings**
   - As winner, claim winnings
   - Verify payout received
   - Check creator fee distributed

### Monitoring
- Check Sentry for errors
- Monitor Vercel logs
- Check Railway logs
- Verify Supabase data

---

## Troubleshooting

### Smart Contract Issues

**Error**: Program deployment failed
```bash
# Check balance
solana balance

# Request airdrop (devnet only)
solana airdrop 2

# Check program
solana program show <PROGRAM_ID>
```

**Error**: Account not found
```bash
# Verify program deployed
anchor keys list

# Update program ID in:
# - packages/anchor/programs/betfun/src/lib.rs (declare_id!)
# - packages/anchor/Anchor.toml
# - packages/sdk/src/index.ts
# - apps/web/.env.local
```

### Frontend Issues

**Error**: Wallet connection fails
- Check RPC URL is correct
- Verify network matches (devnet/mainnet)
- Ensure wallet has SOL

**Error**: Transaction fails
- Check program ID is correct
- Verify RPC endpoint is working
- Check Solana network status

### Moddio Issues

**Error**: Iframe doesn't load
- Verify World ID is correct
- Check CORS settings in Moddio
- Verify URL format in `lib/moddio/urlBuilder.ts`

**Error**: Events not firing
- Check browser console for errors
- Verify `postMessage` API is working
- Ensure Moddio world is configured to receive events

### Indexer Issues

**Error**: Webhook not receiving transactions
- Verify Helius webhook is configured
- Check program ID filter
- Verify webhook secret matches
- Check Railway logs

**Error**: Database errors
- Verify migrations applied
- Check connection string
- Verify service key permissions

---

## Post-Deployment Checklist

- [ ] Smart contracts deployed to mainnet
- [ ] Program ID updated in all files
- [ ] Frontend deployed to Vercel
- [ ] Indexer deployed to Railway
- [ ] Helius webhook configured
- [ ] Database migrations applied
- [ ] Moddio world configured
- [ ] Environment variables set
- [ ] Test arena created successfully
- [ ] Join/resolve/claim flow tested
- [ ] Moddio integration verified
- [ ] Monitoring configured

---

## Support

If you encounter issues:
1. Check logs (Vercel, Railway, browser console)
2. Verify all environment variables
3. Test RPC endpoints
4. Check Solana network status
5. Review error messages in Sentry

---

**Ready to launch! 🚀**

