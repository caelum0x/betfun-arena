# BetFun Arena API Documentation

## Overview

BetFun Arena is a prediction market platform built on Solana. This document provides comprehensive API documentation for the SDK and backend services.

---

## SDK API

### BetFunClient

The main client class for interacting with the BetFun Arena program.

#### Creating a Client

```typescript
import { createBetFunClient } from "@betfun/sdk";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

const { connection } = useConnection();
const wallet = useWallet();

const client = createBetFunClient(connection, wallet);
```

### Arena Operations

#### `createArena(params)`

Create a new prediction market arena.

**Parameters:**
- `title: string` - Arena title
- `description: string` - Arena description
- `question: string` - Prediction question
- `outcomes: string[]` - Array of possible outcomes
- `tags?: string[]` - Optional tags
- `entryFee: number` - Entry fee in SOL
- `endTime: number` - Unix timestamp for arena end
- `manualResolve?: boolean` - Whether resolution is manual
- `oracle?: PublicKey` - Optional oracle account
- `tokenMint?: PublicKey` - Optional token mint

**Returns:** `Promise<{ signature: string; arenaPDA: PublicKey }>`

**Example:**
```typescript
const { signature, arenaPDA } = await client.createArena({
  title: "Will Bitcoin hit $100k?",
  description: "Predict Bitcoin's price milestone",
  question: "Will Bitcoin reach $100,000 by end of 2024?",
  outcomes: ["Yes", "No"],
  entryFee: 0.1, // 0.1 SOL
  endTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
});
```

#### `getArena(arenaPDA)`

Fetch arena data.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA

**Returns:** `Promise<Arena | null>`

#### `joinArena(arenaPDA, outcomeIndex)`

Join an arena by betting on an outcome.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Index of the outcome to bet on

**Returns:** `Promise<string>` - Transaction signature

#### `resolveArena(arenaPDA, winningOutcomeIndex)`

Resolve an arena (creator only).

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `winningOutcomeIndex: number` - Index of the winning outcome

**Returns:** `Promise<string>` - Transaction signature

#### `claimWinnings(arenaPDA)`

Claim winnings from a resolved arena.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA

**Returns:** `Promise<string>` - Transaction signature

### Share Trading

#### `createShareTokens(arenaPDA, outcomeIndex, initialPrice)`

Create share tokens for an outcome (creator only).

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `initialPrice: number` - Initial share price in lamports

**Returns:** `Promise<string>` - Transaction signature

#### `buyShares(arenaPDA, outcomeIndex, amount)`

Buy outcome shares.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `amount: number` - Number of shares to buy

**Returns:** `Promise<string>` - Transaction signature

#### `sellShares(arenaPDA, outcomeIndex, amount)`

Sell outcome shares.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `amount: number` - Number of shares to sell

**Returns:** `Promise<string>` - Transaction signature

#### `redeemShares(arenaPDA, outcomeIndex)`

Redeem shares after arena resolution.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index

**Returns:** `Promise<string>` - Transaction signature

### AMM Operations

#### `initializePool(arenaPDA, outcomeIndex, feeBps, protocolFeeBps)`

Initialize an AMM pool for an outcome.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `feeBps: number` - Fee in basis points (e.g., 30 = 0.3%)
- `protocolFeeBps: number` - Protocol fee in basis points

**Returns:** `Promise<string>` - Transaction signature

#### `addLiquidity(arenaPDA, outcomeIndex, tokenAmount, solAmount, minLpTokens)`

Add liquidity to an AMM pool.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `tokenAmount: number` - Token amount in lamports
- `solAmount: number` - SOL amount in lamports
- `minLpTokens: number` - Minimum LP tokens to receive (slippage protection)

**Returns:** `Promise<string>` - Transaction signature

#### `removeLiquidity(arenaPDA, outcomeIndex, lpTokensToBurn, minTokenAmount, minSolAmount)`

Remove liquidity from an AMM pool.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `lpTokensToBurn: number` - LP tokens to burn in lamports
- `minTokenAmount: number` - Minimum tokens to receive
- `minSolAmount: number` - Minimum SOL to receive

**Returns:** `Promise<string>` - Transaction signature

#### `swap(arenaPDA, outcomeIndex, amountIn, minAmountOut, isTokenToSol)`

Swap tokens using the AMM pool.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `amountIn: number` - Input amount in lamports
- `minAmountOut: number` - Minimum output amount (slippage protection)
- `isTokenToSol: boolean` - true = token -> SOL, false = SOL -> token

**Returns:** `Promise<string>` - Transaction signature

### Order Book Operations

#### `placeLimitOrder(arenaPDA, outcomeIndex, orderType, side, price, size, expiresAt)`

Place a limit order.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `orderType: { limit: {} }` - Order type
- `side: { buy: {} } | { sell: {} }` - Order side
- `price: number` - Price in lamports
- `size: number` - Size in lamports
- `expiresAt: number` - Expiration timestamp (0 = no expiration)

**Returns:** `Promise<string>` - Transaction signature

#### `cancelOrder(arenaPDA, outcomeIndex, orderId)`

Cancel a limit order.

**Parameters:**
- `arenaPDA: PublicKey` - Arena PDA
- `outcomeIndex: number` - Outcome index
- `orderId: number` - Order ID

**Returns:** `Promise<string>` - Transaction signature

### Transaction Batching

#### `createTransactionBatcher(connection, wallet)`

Create a transaction batcher for combining multiple instructions.

**Example:**
```typescript
import { createTransactionBatcher } from "@betfun/sdk";

const batcher = createTransactionBatcher(connection, wallet);
batcher.addInstruction(instruction1);
batcher.addInstruction(instruction2);
const signature = await batcher.execute();
```

---

## Backend API

### Base URL

- **Devnet:** `http://localhost:3001`
- **Mainnet:** `https://api.betfun.arena`

### Arena Endpoints

#### `GET /api/arenas`

Get list of arenas with optional filters.

**Query Parameters:**
- `status?: "active" | "resolved" | "ended"`
- `creator?: string` - Creator wallet address
- `tag?: string` - Filter by tag
- `limit?: number` - Results limit (default: 20)
- `offset?: number` - Results offset

**Response:**
```json
{
  "arenas": [
    {
      "account": "string",
      "title": "string",
      "description": "string",
      "question": "string",
      "outcomes": ["string"],
      "tags": ["string"],
      "entryFee": "number",
      "pot": "number",
      "participants": "number",
      "status": "active",
      "createdAt": "timestamp",
      "endTime": "timestamp"
    }
  ],
  "total": "number"
}
```

#### `GET /api/arenas/:arenaAccount`

Get single arena details.

**Response:**
```json
{
  "account": "string",
  "title": "string",
  "description": "string",
  "question": "string",
  "outcomes": ["string"],
  "tags": ["string"],
  "entryFee": "number",
  "pot": "number",
  "participants": "number",
  "status": "active",
  "createdAt": "timestamp",
  "endTime": "timestamp",
  "resolvedOutcome": "number | null"
}
```

### Trading Endpoints

#### `GET /api/trading/trades/:arenaAccount`

Get trading history for an arena.

**Query Parameters:**
- `outcomeIndex?: number` - Filter by outcome
- `limit?: number` - Results limit

#### `GET /api/trading/outcome-shares/:arenaAccount/:outcomeIndex`

Get outcome share data.

#### `GET /api/trading/pools/:arenaAccount/:outcomeIndex`

Get AMM pool data.

#### `GET /api/trading/orderbook/:arenaAccount/:outcomeIndex`

Get order book data.

### Portfolio Endpoints

#### `GET /api/portfolio/:wallet`

Get user portfolio.

#### `GET /api/portfolio/:wallet/stats`

Get user trading statistics.

---

## Error Handling

All SDK methods throw errors that can be parsed using the error handler:

```typescript
import { formatErrorForDisplay } from "@/lib/errorHandler";

try {
  await client.createArena(params);
} catch (error) {
  const errorInfo = formatErrorForDisplay(error);
  console.error(errorInfo.title, errorInfo.message);
}
```

Common error types:
- `InsufficientFunds` - Not enough SOL balance
- `SlippageToleranceExceeded` - Price moved too much
- `AlreadyResolved` - Arena already resolved
- `Unauthorized` - Not authorized for action
- `NetworkError` - Network connection issue

---

## Rate Limiting

API endpoints are rate-limited:
- **Public endpoints:** 100 requests/minute
- **Authenticated endpoints:** 500 requests/minute

Rate limit headers:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset timestamp

---

## WebSocket API

Connect to WebSocket for real-time updates:

```typescript
const ws = new WebSocket("wss://api.betfun.arena/ws");

// Subscribe to arena updates
ws.send(JSON.stringify({
  type: "subscribe",
  channel: "arena",
  arenaId: "arenaPDA"
}));

// Listen for updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle update
};
```

Available channels:
- `arena` - Arena updates
- `price` - Price updates
- `trade` - Trade notifications
- `order` - Order book updates
- `pool` - Pool updates

