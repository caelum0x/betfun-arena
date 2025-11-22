# 🚀 Deployment Guide

Complete guide for deploying BetFun Arena to production.

## Prerequisites

- Vercel account
- Railway account
- Solana wallet with SOL for deployment
- All API keys configured

---

## 1. Smart Contract Deployment

### Build Contract

```bash
cd packages/anchor
anchor build
```

### Deploy to Devnet (Testing)

```bash
anchor deploy --provider.cluster devnet
```

### Deploy to Mainnet

```bash
# Set cluster to mainnet
anchor deploy --provider.cluster mainnet

# Note the program ID
# Update it in lib/constants.ts
```

### Generate IDL

```bash
anchor idl init --filepath target/idl/betfun.json <PROGRAM_ID>
```

---

## 2. Database Setup (Supabase)

### Create Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy URL and anon key

### Run Migrations

```bash
cd packages/indexer
npx supabase db push
```

Or manually run SQL from `supabase/migrations/001_init_schema.sql`

### Configure RLS

Ensure Row Level Security policies are enabled (included in migration).

---

## 3. Indexer Deployment (Railway)

### Setup Railway Project

```bash
cd packages/indexer
railway login
railway init
```

### Configure Environment Variables

In Railway dashboard, add:
```
SUPABASE_URL=xxx
SUPABASE_SERVICE_KEY=xxx
MODDIO_SECRET_KEY=xxx
RPC_URL=https://api.mainnet-beta.solana.com
PORT=3001
```

### Deploy

```bash
railway up
```

### Setup Custom Domain (Optional)

```
api.betfun.arena → Railway project
```

---

## 4. Frontend Deployment (Vercel)

### Install Vercel CLI

```bash
npm i -g vercel
```

### Configure Project

```bash
cd apps/web
vercel login
vercel link
```

### Set Environment Variables

In Vercel dashboard or CLI:

```bash
vercel env add NEXT_PUBLIC_NETWORK
vercel env add NEXT_PUBLIC_RPC_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_INDIE_FUN_API_KEY
vercel env add NEXT_PUBLIC_MODDIO_WORLD_ID
vercel env add NEXT_PUBLIC_PLAY_SOLANA_API_KEY
```

### Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Custom Domain

```
betfun.arena → Vercel project
```

---

## 5. Moddio World Setup

### Publish World

1. Open Moddio Studio
2. Load world from `moddio/world-export.json`
3. Upload assets from `moddio/assets/`
4. Add scripts from `moddio/WORLD_SETUP.md`
5. Click "Publish"
6. Copy World ID

### Configure Environment

```env
NEXT_PUBLIC_MODDIO_WORLD_ID=your_world_id
NEXT_PUBLIC_MODDIO_SECRET_KEY=your_secret_key
```

---

## 6. Monitoring & Analytics

### Vercel Analytics

Enable in Vercel dashboard:
- Web Analytics
- Speed Insights
- Error tracking

### Railway Metrics

Monitor in Railway dashboard:
- CPU/Memory usage
- Request rate
- Errors

### Custom Monitoring

Add Sentry for error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

---

## 7. Post-Deployment Checklist

### Verify Smart Contract

- [ ] Contract deployed to mainnet
- [ ] Program ID updated in frontend
- [ ] IDL published
- [ ] Test create arena
- [ ] Test join arena
- [ ] Test resolution
- [ ] Test claim winnings

### Verify Frontend

- [ ] Site loads on custom domain
- [ ] Wallet connection works
- [ ] All pages load correctly
- [ ] Images and assets display
- [ ] PWA manifest works
- [ ] Mobile responsive

### Verify Indexer

- [ ] API endpoints respond
- [ ] Database migrations applied
- [ ] Webhooks configured
- [ ] Moddio events work
- [ ] Rate limiting enabled

### Verify Integrations

- [ ] Indie.fun token launch works
- [ ] Moddio world loads
- [ ] Play Solana leaderboard updates
- [ ] Pyth prices load
- [ ] Twitter share works

---

## 8. Performance Optimization

### Frontend

```typescript
// next.config.js
module.exports = {
  compress: true,
  images: {
    domains: ['arweave.net'],
    formats: ['image/webp'],
  },
  swcMinify: true,
};
```

### Indexer

- Enable Redis caching for hot paths
- Add rate limiting
- Implement request queuing

### Database

```sql
-- Add indexes for performance
CREATE INDEX CONCURRENTLY idx_arenas_hot 
ON arenas(resolved, created_at DESC) 
WHERE resolved = false;
```

---

## 9. Security Hardening

### Environment Variables

- Never commit `.env` files
- Use secret management (Vercel/Railway secrets)
- Rotate keys regularly

### API Security

```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // limit each IP
});

app.use('/api/', limiter);
```

### Smart Contract

- Run security audit
- Test on devnet extensively
- Implement emergency pause (if needed)

---

## 10. Maintenance

### Regular Tasks

- Monitor error logs daily
- Check database size weekly
- Review API usage monthly
- Update dependencies quarterly

### Backup Strategy

```bash
# Database backup (automated via Supabase)
# Point-in-time recovery enabled

# Smart contract upgradability
# Use Anchor's upgrade authority
```

### Rollback Plan

```bash
# Frontend
vercel rollback

# Indexer
railway rollback

# Smart contract
# Deploy previous version
anchor upgrade --program-id <PROGRAM_ID>
```

---

## 11. Scaling Strategy

### When to Scale

- Frontend: > 10,000 concurrent users
- Indexer: > 1,000 req/sec
- Database: > 100GB or slow queries

### Horizontal Scaling

```yaml
# Railway auto-scaling
replicas: 3-10
resources:
  cpu: 1-4
  memory: 1-8GB
```

### CDN Setup

Use Vercel Edge Network (automatic) or Cloudflare:

```
betfun.arena → Cloudflare → Vercel
```

---

## 12. Disaster Recovery

### Backup Checklist

- [ ] Supabase automated backups (7 days)
- [ ] Railway automated backups
- [ ] Smart contract source code in Git
- [ ] IDL files backed up
- [ ] API keys stored in password manager

### Recovery Steps

1. Identify issue
2. Check error logs
3. Rollback if needed
4. Restore from backup
5. Verify functionality
6. Post-mortem analysis

---

## Support

For deployment issues:
- Check [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Open GitHub issue
- Contact team@betfun.arena

---

**Deployment complete? Time to ship! 🚢**

