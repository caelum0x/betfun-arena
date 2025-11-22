# BetFun Arena API Documentation

## Base URL

- **Production**: `https://api.betfun.arena`
- **Development**: `http://localhost:3001`

## Authentication

No authentication required for public endpoints. Webhooks use HMAC-SHA256 signature verification.

---

## Endpoints

### Health Check

#### `GET /health`

Comprehensive health check including database and RPC connectivity.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 12345,
  "checks": {
    "database": { "status": "healthy", "latency": 50 },
    "rpc": { "status": "healthy", "latency": 100 },
    "webhooks": { "status": "configured" }
  }
}
```

#### `GET /health/ready`

Kubernetes readiness probe.

#### `GET /health/live`

Kubernetes liveness probe.

---

### Arenas

#### `GET /api/arenas`

Fetch arenas with pagination and filters.

**Query Parameters:**
- `sort` (optional): `hotness` | `new` | `pot` | `ending-soon` (default: `hotness`)
- `filter` (optional): `all` | `live` | `resolved` | `ending-soon` (default: `all`)
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `tags` (optional): Comma-separated list of tags

**Response:**
```json
{
  "arenas": [
    {
      "arena_account": "Arena123...",
      "title": "Will BTC reach $100k?",
      "question": "Will Bitcoin reach $100,000 by end of year?",
      "outcomes": ["Yes", "No"],
      "entry_fee": 100000000,
      "pot": 5000000000,
      "participants_count": 50,
      "outcome_counts": [30, 20],
      "outcome_pots": [3000000000, 2000000000],
      "resolved": false,
      "end_time": "2024-12-31T23:59:59.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

#### `GET /api/arenas/:arenaAccount`

Fetch single arena by account address.

**Response:**
```json
{
  "arena": { /* arena object */ },
  "participants": [
    {
      "wallet": "Wallet123...",
      "outcome_chosen": 0,
      "amount": 100000000,
      "joined_at": "2024-01-01T00:00:00.000Z",
      "claimed": false
    }
  ]
}
```

#### `GET /api/arenas/:arenaAccount/participants`

Fetch participants for an arena.

---

### Webhooks

#### `POST /webhook/transaction`

Handle Helius webhook for program transactions.

**Headers:**
- `X-Helius-Signature`: HMAC-SHA256 signature

**Request Body:**
```json
{
  "type": "CREATE_ARENA" | "JOIN_ARENA" | "RESOLVE_ARENA" | "CLAIM_WINNINGS",
  "signature": "TxSignature...",
  "transaction": { /* transaction data */ }
}
```

**Response:**
```json
{
  "success": true,
  "signature": "TxSignature..."
}
```

---

## Rate Limits

- **API Endpoints**: 100 requests per 15 minutes per IP
- **Webhooks**: 10 requests per minute per IP

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (ISO 8601)

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "stack": "..." // Only in development
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid request data
- `UNAUTHORIZED` (401): Invalid webhook signature
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `DATABASE_ERROR` (500): Database operation failed
- `INTERNAL_ERROR` (500): Internal server error

---

## Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. To verify:

1. Get the signature from `X-Helius-Signature` header
2. Compute HMAC-SHA256 of raw request body using your webhook secret
3. Compare signatures using constant-time comparison

Example (Node.js):
```javascript
const crypto = require('crypto')

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const expectedSignature = hmac.digest('hex')
  return signature === expectedSignature
}
```

---

## Pagination

All list endpoints support pagination:

- `limit`: Number of results per page (max: 100)
- `offset`: Number of results to skip

Response includes pagination metadata:
```json
{
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150
  }
}
```

---

## Monitoring

- **Health Checks**: `/health`, `/health/ready`, `/health/live`
- **Metrics**: Prometheus metrics available at `/metrics` (if enabled)
- **Logging**: Structured JSON logs with request IDs

---

## Support

For API support, contact: support@betfun.arena

