# 🚀 Deployment Instructions

## Step 1: Update .gitignore ✅
The `.gitignore` has been updated to exclude:
- node_modules, build outputs, .env files
- Vercel, Turbo, and IDE files
- Anchor/Rust build artifacts
- Logs and temporary files

## Step 2: Commit Changes to Git

```bash
cd /Users/arhansubasi/betfun-arena/betfun-arena

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "feat: Add mock arenas, update deployment config, and prepare for Vercel deployment"

# Push to GitHub
git push origin main
# Or if your branch is different:
# git push origin <your-branch-name>
```

## Step 3: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd /Users/arhansubasi/betfun-arena/betfun-arena
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
   - **Build Command**: `cd apps/web && pnpm install && pnpm run build`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`
4. Add Environment Variables (see below)
5. Click **Deploy**

## Step 4: Set Environment Variables in Vercel

Go to **Project Settings → Environment Variables** and add:

### Required:
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE
NEXT_PUBLIC_NETWORK=devnet
```

### Optional (for full functionality):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_INDIE_FUN_API_URL=https://api.indie.fun
NEXT_PUBLIC_MODDIO_WORLD_ID=your_moddio_world_id
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Check that mock arenas are displayed
3. Test wallet connection
4. Verify the banner shows "Demonstration Mode: Mock Arenas"

## Troubleshooting

- **Build fails**: Check Vercel build logs, ensure pnpm is used
- **Environment variables not working**: Make sure they're set for the correct environment (Production/Preview)
- **Mock data not showing**: Check browser console for errors

## Quick Deploy Script

Run the deployment script:
```bash
./deploy-vercel.sh
```

