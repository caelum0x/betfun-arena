# 🚀 Quick Start - BetFun Arena

Get BetFun Arena running in 15 minutes!

## Prerequisites

- Node.js 20+ or Bun
- Solana CLI & Anchor (for smart contracts)
- Supabase account
- Vercel account (for deployment)
- Railway account (for indexer)

---

## 1️⃣ Deploy Smart Contracts (5 min)

```bash
# Install Anchor (if not installed)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build contracts
cd packages/anchor
anchor build

# Deploy to devnet (for testing)
solana config set --url devnet
solana airdrop 2
anchor deploy

# Save the Program ID that's displayed!
```

---

## 2️⃣ Configure Frontend (3 min)

```bash
# Copy environment template
cd apps/web
cp .env.example .env.local

# Edit .env.local and add:
# - NEXT_PUBLIC_PROGRAM_ID (from step 1)
# - NEXT_PUBLIC_SUPABASE_URL (from Supabase)
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (from Supabase)
# - NEXT_PUBLIC_MODDIO_WORLD_ID (create at moddio.com)
```

---

## 3️⃣ Setup Database (2 min)

```bash
# In Supabase dashboard, go to SQL Editor
# Copy and paste contents of:
# packages/indexer/supabase/migrations/001_init_schema.sql
# packages/indexer/supabase/migrations/002_add_indexes.sql
# Run each migration
```

---

## 4️⃣ Run Locally (2 min)

```bash
# Terminal 1: Frontend
cd apps/web
bun install
bun dev
# Open http://localhost:3000

# Terminal 2: Indexer
cd packages/indexer
cp .env.example .env
# Edit .env with your values
bun install
bun dev
```

---

## 5️⃣ Test the Flow (3 min)

1. **Connect Wallet** at http://localhost:3000
2. **Create Arena**:
   - Title: "Will BTC reach $100k?"
   - Outcomes: "Yes", "No"
   - Entry Fee: 0.1 SOL
   - End Time: Tomorrow
3. **Join Arena** with another wallet
4. **Resolve Arena** as creator
5. **Claim Winnings** as winner

✅ If all steps work, you're ready to deploy!

---

## 6️⃣ Deploy to Production (Optional)

### Deploy Frontend (Vercel)
```bash
cd apps/web
vercel --prod
```

### Deploy Indexer (Railway)
```bash
cd packages/indexer
railway up
```

### Update Environment Variables
- Add all env vars to Vercel dashboard
- Add all env vars to Railway dashboard
- Configure Helius webhook with Railway URL

---

## Troubleshooting

### "Program not found"
- Make sure you deployed contracts
- Check NEXT_PUBLIC_PROGRAM_ID is correct
- Verify you're on the right network (devnet/mainnet)

### "Wallet connection failed"
- Check RPC URL is correct
- Make sure wallet has SOL
- Try switching networks in wallet

### "Transaction failed"
- Check you have enough SOL for fees
- Verify program is deployed
- Check browser console for errors

### "Moddio iframe doesn't load"
- Verify NEXT_PUBLIC_MODDIO_WORLD_ID is set
- Create a world at moddio.com if you haven't
- Check browser console for CORS errors

---

## Next Steps

- Read [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for detailed deployment
- Configure Moddio world for better visuals
- Set up monitoring with Sentry
- Apply for sponsor API keys (Indie.fun, Play Solana)

---

## Support

- 📖 Full docs in `/docs` folder
- 🐛 Issues: GitHub Issues
- 💬 Discord: [Join server](https://discord.gg/betfun)
- 📧 Email: team@betfun.arena

---

**Happy building! ⚔️🚀**

