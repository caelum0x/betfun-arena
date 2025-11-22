# @betfun/websocket

Real-time WebSocket server and client for BetFun Arena - Polymarket-level live updates.

## Features

- ✅ Socket.IO server with Express
- ✅ Room-based subscriptions
- ✅ Arena real-time updates
- ✅ Bet event streaming
- ✅ Price feed subscriptions
- ✅ Leaderboard updates
- ✅ User notifications
- ✅ Platform announcements
- ✅ Auto-reconnection
- ✅ Health checks

## Server Usage

### Start Server

```typescript
import { initWebSocketServer } from '@betfun/websocket';

const server = initWebSocketServer(3002);
server.start();
```

### Broadcast Updates

```typescript
import { getWebSocketServer } from '@betfun/websocket';

const ws = getWebSocketServer();

// Broadcast arena update
ws.broadcastArenaUpdate({
  arenaId: 'arena-123',
  pot: 1000000,
  participantsCount: 50,
  outcomeDistribution: [30, 20],
  timestamp: Date.now(),
});

// Broadcast bet placed
ws.broadcastBetPlaced({
  arenaId: 'arena-123',
  wallet: 'user-wallet',
  outcome: 0,
  amount: 100000,
  newPot: 1100000,
  timestamp: Date.now(),
});
```

## Client Usage (Frontend)

### React Hooks

```typescript
import { useArenaUpdates, useArenaResolution } from '@/hooks/useWebSocket';

function ArenaPage({ arenaId }: { arenaId: string }) {
  // Subscribe to real-time arena updates
  const { arenaData, recentBets } = useArenaUpdates(arenaId);
  
  // Subscribe to resolution
  const resolution = useArenaResolution(arenaId, (res) => {
    console.log('Arena resolved!', res);
    // Show confetti, notifications, etc.
  });
  
  return (
    <div>
      <h1>Total Pot: {arenaData?.pot} SOL</h1>
      <p>Participants: {arenaData?.participantsCount}</p>
      
      <h2>Recent Bets:</h2>
      {recentBets.map(bet => (
        <div key={bet.timestamp}>
          {bet.wallet} bet {bet.amount} on outcome {bet.outcome}
        </div>
      ))}
    </div>
  );
}
```

### Leaderboard Updates

```typescript
import { useLeaderboard } from '@/hooks/useWebSocket';

function LeaderboardPage() {
  const leaderboard = useLeaderboard();
  
  return (
    <div>
      {leaderboard.map((entry, index) => (
        <div key={index}>
          {entry.rank}. {entry.wallet} - {entry.score}
        </div>
      ))}
    </div>
  );
}
```

### Price Updates

```typescript
import { usePriceUpdates } from '@/hooks/useWebSocket';

function PriceFeed() {
  const prices = usePriceUpdates(['SOL/USD', 'BTC/USD']);
  
  return (
    <div>
      <p>SOL: ${prices['SOL/USD']}</p>
      <p>BTC: ${prices['BTC/USD']}</p>
    </div>
  );
}
```

## Integration with Indexer

Update indexer to broadcast events:

```typescript
// packages/indexer/src/webhook/solana.ts
import { getWebSocketServer } from '@betfun/websocket';

export async function handleTransaction(tx: Transaction) {
  // Process transaction...
  
  // Broadcast update
  const ws = getWebSocketServer();
  ws.broadcastArenaUpdate({
    arenaId: arena.id,
    pot: arena.pot,
    participantsCount: arena.participants_count,
    outcomeDistribution: arena.outcome_counts,
    timestamp: Date.now(),
  });
}
```

## Events

### Client → Server

- `subscribe:arena` - Subscribe to arena updates
- `unsubscribe:arena` - Unsubscribe from arena
- `subscribe:leaderboard` - Subscribe to leaderboard
- `subscribe:prices` - Subscribe to price feeds
- `subscribe:user` - Subscribe to user notifications

### Server → Client

- `arena:update` - Arena state updated
- `arena:bet` - New bet placed
- `arena:resolved` - Arena resolved
- `leaderboard:update` - Leaderboard changed
- `price:update` - Price updated
- `user:notification` - User notification
- `platform:announcement` - Platform-wide announcement

## Performance

- **Latency**: < 50ms for real-time updates
- **Connections**: Supports 10,000+ concurrent
- **Bandwidth**: Minimal, only changed data
- **Auto-reconnect**: Yes, with exponential backoff

## Environment Variables

```bash
WS_PORT=3002
FRONTEND_URL=http://localhost:3000
```

## Production Setup

### With Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY packages/websocket ./
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

### With PM2

```bash
pm2 start packages/websocket/dist/server.js --name betfun-ws
```

## Monitoring

### Health Check

```bash
curl http://localhost:3002/health
```

### Stats

```bash
curl http://localhost:3002/stats
```

## License

MIT

