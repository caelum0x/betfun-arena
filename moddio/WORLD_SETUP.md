# Moddio World Setup Guide for BetFun Arena

## Overview
This document explains how to set up and configure the Moddio multiplayer game world for BetFun Arena.

## World Configuration

### 1. Create New World
1. Go to [Moddio Studio](https://www.modd.io/create)
2. Create a new blank world
3. Name it "BetFun Arena Battle"

### 2. World Settings
```json
{
  "name": "BetFun Arena Battle",
  "description": "Live prediction market battles",
  "maxPlayers": 100,
  "worldSize": "1024x1024",
  "backgroundColor": "#000000"
}
```

### 3. Assets Setup

Upload the following assets from `/moddio/assets/`:
- `yes_zone.png` - Green zone for "Yes" team
- `no_zone.png` - Red zone for "No" team
- `player_spritesheet.png` - Player avatars
- `confetti_green.particle` - Victory effect for Yes wins
- `confetti_red.particle` - Victory effect for No wins  
- `whale_explosion.particle` - Effect for bets > 10 SOL

### 4. Game Scripts

#### Player Join Script
```javascript
// When player joins, assign to team based on outcome
actions.on("playerJoinsGame", function(player) {
  // Get outcome from URL parameter
  const outcome = player.getVariable("outcome");
  const arenaId = player.getVariable("arenaId");
  
  // Assign player to team zone
  if (outcome == 0) {
    // Yes team - green zone
    player.setPosition(256, 512);
    player.setColor("#39FF14");
  } else {
    // No team - red zone
    player.setPosition(768, 512);
    player.setColor("#DC143C");
  }
  
  // Set player username from wallet
  const wallet = player.getVariable("wallet");
  player.setName(wallet.substring(0, 8) + "...");
});
```

#### Big Bet Alert Script
```javascript
// Listen for big bet events
actions.on("bigBetPlaced", function(data) {
  const { wallet, amount, outcome } = data;
  
  // Trigger whale explosion effect
  if (amount > 10000000000) { // > 10 SOL
    effects.play("whale_explosion", getPlayerPosition(wallet));
    
    // Global chat message
    chat.broadcast(`🐋 WHALE ALERT! ${wallet} bet ${amount/1e9} SOL!`);
  }
  
  // Emoji rain
  effects.emojiRain(outcome == 0 ? "🔥" : "💀");
});
```

#### Victory Resolution Script
```javascript
// When arena is resolved
actions.on("arenaResolved", function(data) {
  const { winnerOutcome } = data;
  
  // Play confetti for winning team
  if (winnerOutcome == 0) {
    effects.play("confetti_green", { x: 256, y: 512 });
    chat.broadcast("🎉 YES WON! 🎉");
  } else {
    effects.play("confetti_red", { x: 768, y: 512 });
    chat.broadcast("🎉 NO WON! 🎉");
  }
  
  // Highlight winners
  players.forEach(function(player) {
    if (player.getVariable("outcome") == winnerOutcome) {
      player.addEffect("glow", { color: "#FFD700", duration: 5000 });
    }
  });
});
```

#### Chat System
```javascript
// Enable live chat with emoji support
chat.enable({
  maxLength: 100,
  emojisEnabled: true,
  cooldown: 2000,
  profanityFilter: true
});

// Custom chat commands
chat.on("command", function(player, command, args) {
  if (command == "bet") {
    // Show player's bet info
    const amount = player.getVariable("betAmount");
    const outcome = player.getVariable("outcome");
    chat.sendTo(player, `You bet ${amount} SOL on ${outcome}`);
  }
});
```

### 5. World Variables

Set these variables in Moddio:
```javascript
worldVars = {
  arenaId: "",        // Set from URL parameter
  totalPot: 0,        // Updated by webhook
  participantsCount: 0,
  outcomeDistribution: [0, 0]
};
```

### 6. Embedding in Frontend

The world is embedded using the `ModdioBattle` component:

```typescript
<ModdioBattle
  arenaId={arenaId}
  wallet={publicKey?.toString()}
  outcome={userOutcome}
  className="w-full h-[600px]"
/>
```

URL format:
```
https://play.modd.io/{WORLD_ID}?arenaId=xxx&wallet=yyy&outcome=0
```

### 7. Webhook Integration

Set up webhook endpoint in Moddio:
```
POST https://betfun-indexer.railway.app/webhook/moddio
```

Events to send:
- `player.join` - When player enters world
- `chat.message` - Chat messages
- Custom events from indexer

### 8. Publishing

1. Test the world in Moddio Studio
2. Click "Publish"
3. Copy the World ID
4. Set `NEXT_PUBLIC_MODDIO_WORLD_ID` in `.env`
5. Set API secret in `NEXT_PUBLIC_MODDIO_SECRET_KEY`

## Testing

1. Create a test arena
2. Join with multiple browser windows
3. Verify team assignment
4. Test chat functionality
5. Trigger big bet alert (use devtools)
6. Test resolution effects

## Screenshots

See `/moddio/scripts-screenshots/` for visual examples:
- `player-join-team.png` - Team assignment
- `big-bet-whale.png` - Whale alert effect
- `victory-resolution.png` - Winner celebration

## Troubleshooting

**Players not joining:**
- Check URL parameters are being passed correctly
- Verify World ID matches published world

**Effects not showing:**
- Ensure particle assets are uploaded
- Check asset names match script references

**Chat not working:**
- Enable chat in world settings
- Check cooldown settings

## Next Steps

- Add more particle effects
- Implement powerups (boost visibility, taunt opponents)
- Add spectator mode with different camera
- Integrate voice chat (optional)

For help: support@modd.io

