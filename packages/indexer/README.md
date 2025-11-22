# BetFun Arena Indexer

Express.js service for indexing Solana transactions and maintaining off-chain state.

## Features

- ✅ **Webhook Processing** - Handles Helius webhooks for program transactions
- ✅ **Transaction Deduplication** - Prevents double-processing
- ✅ **Retry Logic** - Automatic retries with exponential backoff
- ✅ **Rate Limiting** - Protects against abuse
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Health Checks** - Monitoring endpoints
- ✅ **Request Logging** - Structured logs with request IDs

## Quick Start

```bash
# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Run migrations
cd supabase
supabase db push

# Start development server
pnpm dev

# Build for production
pnpm build
pnpm start
```

## Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Helius (optional)
HELIUS_WEBHOOK_SECRET=your-webhook-secret

# Moddio (optional)
MODDIO_SECRET_KEY=your-moddio-secret
```

## API Endpoints

### Health Checks
- `GET /health` - Comprehensive health check
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Webhooks
- `POST /webhook/transaction` - Helius transaction webhook

### API
- `GET /api/arenas` - Fetch arenas with filters
- `GET /api/arenas/:arenaAccount` - Get single arena
- `GET /api/pot` - Get pot statistics

## Architecture

```
src/
├── server.ts           # Main Express app
├── middleware/         # Express middleware
│   ├── errorHandler.ts
│   ├── rateLimit.ts
│   ├── logger.ts
│   └── validator.ts
├── utils/              # Utility functions
│   ├── retry.ts
│   └── dedupe.ts
├── webhook/            # Webhook handlers
│   └── solana.ts
├── api/                # API routes
│   ├── feed.ts
│   └── pot.ts
├── health/             # Health check endpoints
│   └── index.ts
└── moddio/             # Moddio integration
    └── pushBigBet.ts
```

## Error Handling

All errors are handled by the `errorHandler` middleware:
- Operational errors return appropriate status codes
- Non-operational errors return 500
- Errors are logged with request IDs
- Error responses include error codes for client handling

## Rate Limiting

- **API Routes**: 100 requests per 15 minutes per IP
- **Webhooks**: 10 requests per minute per IP
- **Health Checks**: No rate limit

## Transaction Deduplication

Transactions are deduplicated using:
1. In-memory cache (1-hour TTL)
2. Database table (`processed_transactions`)
3. Participant uniqueness checks

## Retry Logic

Failed operations are retried with:
- Max 3 attempts
- Exponential backoff (1s, 2s, 4s)
- Max delay: 30s
- Only retries on network errors

## Monitoring

Health check endpoint provides:
- Database connectivity
- RPC connectivity
- Webhook configuration status
- Uptime information

## Deployment

See [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md) for production deployment instructions.

