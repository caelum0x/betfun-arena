# 🚀 Vercel Deployment Guide - BetFun Arena

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Ensure your code is pushed to GitHub
3. **Environment Variables**: Prepare all required environment variables

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to project root
cd /Users/arhansubasi/betfun-arena/betfun-arena

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

### Required Variables

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
# Or for mainnet: https://api.mainnet-beta.solana.com
# Or use a custom RPC: https://your-rpc-endpoint.com

NEXT_PUBLIC_PROGRAM_ID=HrS1KpYRWfg9xUom8jnGqoRAayVCxHxukeb18C4WKAkE
# Your deployed Solana program ID

NEXT_PUBLIC_NETWORK=devnet
# Options: devnet, mainnet

# Supabase (Optional - for database features)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Indie.fun API (Optional - for sponsor integration)
NEXT_PUBLIC_INDIE_FUN_API_URL=https://api.indie.fun

# Moddio (Optional - for 3D world integration)
NEXT_PUBLIC_MODDIO_WORLD_ID=your_moddio_world_id

# Sentry (Optional - for error tracking)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

### Setting Environment Variables via CLI

```bash
# Set environment variables
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL
vercel env add NEXT_PUBLIC_PROGRAM_ID
vercel env add NEXT_PUBLIC_NETWORK

# Add for all environments (production, preview, development)
vercel env add NEXT_PUBLIC_SOLANA_RPC_URL production
```

## Project Configuration

The `vercel.json` file is already configured with:

- ✅ Correct build command for monorepo
- ✅ Root directory set to `apps/web`
- ✅ Security headers
- ✅ Environment variable references

## Build Settings

Vercel will automatically detect Next.js, but ensure:

- **Node.js Version**: 18.x or higher (set in Vercel dashboard)
- **Package Manager**: pnpm (configured in `vercel.json`)
- **Build Command**: `pnpm install && pnpm run build` (in `apps/web` directory)

## Deployment Steps

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin main
   ```

2. **Deploy via Vercel Dashboard**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Configure environment variables
   - Click "Deploy"

3. **Or Deploy via CLI**:
   ```bash
   vercel --prod
   ```

## Post-Deployment

1. **Verify Deployment**:
   - Check the deployment URL provided by Vercel
   - Test wallet connection
   - Verify mock arenas are displayed

2. **Custom Domain** (Optional):
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

3. **Monitor**:
   - Check Vercel dashboard for build logs
   - Monitor function logs for errors
   - Set up Sentry for error tracking (if configured)

## Troubleshooting

### Build Fails

1. **Check Build Logs**:
   - Go to Vercel Dashboard → Deployments → Click on failed deployment
   - Review build logs for errors

2. **Common Issues**:
   - **Missing dependencies**: Ensure `pnpm install` runs successfully
   - **Type errors**: Run `pnpm run check-types` locally first
   - **Environment variables**: Verify all required vars are set

### Runtime Errors

1. **Check Function Logs**:
   - Vercel Dashboard → Functions tab
   - Look for runtime errors

2. **Common Issues**:
   - **Missing env vars**: Verify all `NEXT_PUBLIC_*` vars are set
   - **RPC errors**: Check Solana RPC endpoint is accessible
   - **CORS issues**: Verify headers in `vercel.json`

### Mock Data Not Showing

- Verify `NEXT_PUBLIC_PROGRAM_ID` is set correctly
- Check browser console for errors
- Ensure Solana RPC endpoint is accessible

## Environment-Specific Deployments

### Development
```bash
vercel
```

### Preview (for PRs)
- Automatically deployed on pull requests
- Uses preview environment variables

### Production
```bash
vercel --prod
```

## Continuous Deployment

Vercel automatically deploys:
- ✅ Every push to `main` branch → Production
- ✅ Every pull request → Preview deployment
- ✅ Every push to other branches → Preview deployment

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues:
1. Check Vercel build logs
2. Review browser console errors
3. Verify environment variables are set correctly
4. Check that the Solana program is deployed and accessible

